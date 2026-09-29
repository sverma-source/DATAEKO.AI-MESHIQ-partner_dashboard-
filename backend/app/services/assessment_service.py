import logging
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.audit import log_audit_event
from app.core.errors import AppError, ConflictError, EntityNotFoundError
from app.models.assessment import Assessment, AssessmentStatus
from app.models.assessment_response import AssessmentResponse
from app.models.customer import Customer
from app.schemas.assessment import AssessmentCreate, AssessmentUpdate
from app.schemas.assessment_response import AssessmentResponseCreateOrUpdate
from app.services.calculation_service import CalculationService
from app.services.deliverable_service import DeliverableService
from app.services.email_service import EmailMessage, EmailService

logger = logging.getLogger(__name__)


class AssessmentService:
    @staticmethod
    async def create_assessment(
        db: AsyncSession, tenant_id: str, payload: AssessmentCreate
    ) -> Assessment:
        # Verify customer belongs to tenant
        customer_stmt = select(Customer).where(
            Customer.id == payload.customer_id, Customer.tenant_id == tenant_id
        )
        customer_res = await db.execute(customer_stmt)
        if not customer_res.scalar_one_or_none():
            raise EntityNotFoundError("Customer", payload.customer_id)

        assessment = Assessment(
            tenant_id=payload.tenant_id or tenant_id,
            customer_id=payload.customer_id,
            title=payload.title,
            description=payload.description,
            status=payload.status or AssessmentStatus.DRAFT,
            assessment_version=payload.assessment_version or "1.0.0",
        )
        db.add(assessment)
        await db.commit()
        await db.refresh(assessment)
        return assessment

    @staticmethod
    async def get_assessment(
        db: AsyncSession, tenant_id: str, assessment_id: str, load_details: bool = False
    ) -> Assessment:
        stmt = select(Assessment).where(
            Assessment.id == assessment_id, Assessment.tenant_id == tenant_id
        )
        if load_details:
            stmt = stmt.options(
                selectinload(Assessment.customer),
                selectinload(Assessment.response),
                selectinload(Assessment.calculation_snapshots),
            )
        result = await db.execute(stmt)
        assessment = result.scalar_one_or_none()
        if not assessment:
            raise EntityNotFoundError("Assessment", assessment_id)
        return assessment

    @staticmethod
    async def list_assessments(
        db: AsyncSession,
        tenant_id: str,
        customer_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Assessment]:
        stmt = (
            select(Assessment)
            .where(Assessment.tenant_id == tenant_id)
            .order_by(Assessment.created_at.desc())
        )
        if customer_id:
            stmt = stmt.where(Assessment.customer_id == customer_id)
        stmt = stmt.offset(skip)
        stmt = stmt.limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update_assessment(
        db: AsyncSession, tenant_id: str, assessment_id: str, payload: AssessmentUpdate
    ) -> Assessment:
        assessment = await AssessmentService.get_assessment(db, tenant_id, assessment_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(assessment, key, value)
        await db.commit()
        await db.refresh(assessment)
        return assessment

    @staticmethod
    async def save_responses(
        db: AsyncSession,
        tenant_id: str,
        assessment_id: str,
        payload: AssessmentResponseCreateOrUpdate,
    ) -> AssessmentResponse:
        assessment = await AssessmentService.get_assessment(
            db, tenant_id, assessment_id, load_details=True
        )

        # Enforce response immutability after submission
        if assessment.status in (AssessmentStatus.SUBMITTED, AssessmentStatus.CALCULATED):
            raise ConflictError(
                "The assessment has been submitted and can no longer be edited.",
                {"assessment_id": assessment_id, "status": assessment.status.value},
            )

        response = assessment.response
        data = payload.model_dump(exclude_unset=True)

        if not response:
            response = AssessmentResponse(assessment_id=assessment_id, **data)
            db.add(response)
        else:
            for key, value in data.items():
                setattr(response, key, value)

        if assessment.status == AssessmentStatus.DRAFT:
            assessment.status = AssessmentStatus.IN_PROGRESS

        await db.commit()
        await db.refresh(response)
        return response

    @staticmethod
    async def submit_assessment(
        db: AsyncSession,
        tenant_id: str,
        assessment_id: str,
        user_id: Optional[str] = None,
        email_service: Optional[EmailService] = None,
    ) -> Assessment:
        assessment = await AssessmentService.get_assessment(
            db, tenant_id, assessment_id, load_details=True
        )

        # Idempotency: If already SUBMITTED or CALCULATED, return existing finalized assessment without re-executing actions
        if assessment.status in (AssessmentStatus.SUBMITTED, AssessmentStatus.CALCULATED):
            return assessment

        # Verify responses exist
        if not assessment.response:
            raise AppError(
                "Assessment has no responses to submit. Please complete discovery questions before submission.",
                {"assessment_id": assessment_id},
            )

        # 1. Finalize submission state immediately and commit to guarantee durable immutability
        assessment.status = AssessmentStatus.SUBMITTED
        await log_audit_event(
            session=db,
            event_type="ASSESSMENT_SUBMITTED",
            tenant_id=tenant_id,
            user_id=user_id,
            resource_type="Assessment",
            resource_id=assessment.id,
            status="SUCCESS",
            details={
                "assessment_id": assessment_id,
                "customer_id": assessment.customer_id,
                "title": assessment.title,
                "status": assessment.status.value,
            },
        )
        await db.commit()
        await db.refresh(assessment)

        # 2. Calculation Orchestration (Phase 3 Engine + CalculationSnapshot)
        try:
            calc_res = await CalculationService.run_calculation(
                db, tenant_id, assessment_id, preserve_submitted_status=True
            )
            await log_audit_event(
                session=db,
                event_type="CALCULATION_EXECUTED",
                tenant_id=tenant_id,
                user_id=user_id,
                resource_type="CalculationSnapshot",
                resource_id=assessment_id,
                status="SUCCESS",
                details={
                    "assessment_id": assessment_id,
                    "snapshot_id": calc_res.snapshot_id,
                    "engine_version": calc_res.calculation_engine_version,
                },
            )
            await db.commit()
        except Exception as exc:
            logger.error("Calculation failed during submission orchestration for assessment %s: %s", assessment_id, exc)
            await log_audit_event(
                session=db,
                event_type="CALCULATION_FAILED",
                tenant_id=tenant_id,
                user_id=user_id,
                resource_type="Assessment",
                resource_id=assessment_id,
                status="FAILURE",
                details={"error": str(exc)},
            )
            await db.commit()
            # Stop downstream delivery if calculation fails; assessment remains submitted and finalized
            return await AssessmentService.get_assessment(db, tenant_id, assessment_id, load_details=True)

        # 3. Deliverables Generation (Batch D)
        pdf_bytes = None
        csv_content = None
        try:
            # Re-fetch assessment to ensure latest calculation snapshot and relationships are loaded
            db.expire_all()
            assessment = await AssessmentService.get_assessment(
                db, tenant_id, assessment_id, load_details=True
            )

            pdf_bytes = DeliverableService.generate_pdf(assessment)
            csv_content = DeliverableService.generate_csv(assessment)

            await log_audit_event(
                session=db,
                event_type="DELIVERABLES_GENERATED",
                tenant_id=tenant_id,
                user_id=user_id,
                resource_type="Assessment",
                resource_id=assessment_id,
                status="SUCCESS",
                details={"has_pdf": bool(pdf_bytes), "has_csv": bool(csv_content)},
            )
            await db.commit()
        except Exception as exc:
            logger.error("Deliverable generation failed for assessment %s: %s", assessment_id, exc)
            await log_audit_event(
                session=db,
                event_type="DELIVERABLES_GENERATION_FAILED",
                tenant_id=tenant_id,
                user_id=user_id,
                resource_type="Assessment",
                resource_id=assessment_id,
                status="FAILURE",
                details={"error_type": type(exc).__name__, "error": str(exc)},
            )
            await db.commit()
            db.expire_all()
            # Deliverable failure halts email dispatch; assessment remains submitted and finalized
            return await AssessmentService.get_assessment(db, tenant_id, assessment_id, load_details=True)

        # 4. Email Dispatch to Test Recipients Only (Batch E)
        try:
            svc = email_service or EmailService()
            test_recipients = svc.get_test_recipients()

            if not test_recipients:
                logger.warning("No test recipients configured; skipping email dispatch for assessment %s", assessment_id)
                await log_audit_event(
                    session=db,
                    event_type="EMAIL_SEND_SKIPPED",
                    tenant_id=tenant_id,
                    user_id=user_id,
                    resource_type="Assessment",
                    resource_id=assessment_id,
                    status="SUCCESS",
                    details={"reason": "No test recipients configured in environment"},
                )
                await db.commit()
            else:
                attachments = EmailService.create_deliverable_attachments(
                    pdf_bytes=pdf_bytes,
                    csv_content=csv_content,
                )

                cust_name = assessment.customer.name if assessment.customer else "Enterprise Customer"
                subject = f"DATAEKO × meshIQ Assessment Deliverables: {cust_name} ({assessment.title})"
                text_body = (
                    f"A DATAEKO × meshIQ Assessment has been submitted and finalized.\n\n"
                    f"Customer: {cust_name}\n"
                    f"Assessment: {assessment.title}\n"
                    f"Assessment ID: {assessment.id}\n\n"
                    f"The finalized Executive Assessment Report (PDF) and Discovery Responses (CSV) are attached.\n\n"
                    f"NOTE: This is an internal test delivery notification during the current testing phase."
                )
                html_body = (
                    f"<div style='font-family: Arial, sans-serif; color: #172033;'>"
                    f"<h2>DATAEKO × meshIQ Assessment Finalized</h2>"
                    f"<p>A discovery assessment has been submitted and processed.</p>"
                    f"<ul>"
                    f"<li><strong>Customer:</strong> {cust_name}</li>"
                    f"<li><strong>Assessment:</strong> {assessment.title}</li>"
                    f"<li><strong>Assessment ID:</strong> <code>{assessment.id}</code></li>"
                    f"</ul>"
                    f"<p>The finalized Executive Assessment Report (PDF) and Discovery Responses (CSV) are attached to this message.</p>"
                    f"<hr style='border: 0; border-top: 1px solid #E2E6EE;' />"
                    f"<p style='font-size: 11px; color: #738096;'>This is an internal test distribution during the Batch F validation phase.</p>"
                    f"</div>"
                )

                msg = EmailMessage(
                    recipients=test_recipients,
                    subject=subject,
                    text_body=text_body,
                    html_body=html_body,
                    attachments=attachments,
                )

                await log_audit_event(
                    session=db,
                    event_type="EMAIL_SEND_REQUESTED",
                    tenant_id=tenant_id,
                    user_id=user_id,
                    resource_type="Assessment",
                    resource_id=assessment_id,
                    status="SUCCESS",
                    details={"recipient_count": len(test_recipients)},
                )
                await db.commit()

                email_dispatched = await svc.send_email(msg, allow_disabled_skip=True)
                if email_dispatched:
                    await log_audit_event(
                        session=db,
                        event_type="EMAIL_SENT",
                        tenant_id=tenant_id,
                        user_id=user_id,
                        resource_type="Assessment",
                        resource_id=assessment_id,
                        status="SUCCESS",
                        details={"recipient_count": len(test_recipients)},
                    )
                else:
                    await log_audit_event(
                        session=db,
                        event_type="EMAIL_SEND_SKIPPED",
                        tenant_id=tenant_id,
                        user_id=user_id,
                        resource_type="Assessment",
                        resource_id=assessment_id,
                        status="SUCCESS",
                        details={"reason": "EMAIL_ENABLED is false"},
                    )
                await db.commit()

        except Exception as exc:
            logger.error("Email dispatch failed for assessment %s: %s", assessment_id, exc)
            await log_audit_event(
                session=db,
                event_type="EMAIL_SEND_FAILED",
                tenant_id=tenant_id,
                user_id=user_id,
                resource_type="Assessment",
                resource_id=assessment_id,
                status="FAILURE",
                details={"error_type": type(exc).__name__},
            )
            await db.commit()

        db.expire_all()
        return await AssessmentService.get_assessment(db, tenant_id, assessment_id, load_details=True)

    @staticmethod
    async def delete_assessment(
        db: AsyncSession, tenant_id: str, assessment_id: str
    ) -> None:
        assessment = await AssessmentService.get_assessment(db, tenant_id, assessment_id)
        await db.delete(assessment)
        await db.commit()
