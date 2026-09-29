from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import AppError, ConflictError, EntityNotFoundError
from app.models.assessment import Assessment, AssessmentStatus
from app.models.assessment_response import AssessmentResponse
from app.models.customer import Customer
from app.schemas.assessment import AssessmentCreate, AssessmentUpdate
from app.schemas.assessment_response import AssessmentResponseCreateOrUpdate


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
        if assessment.status == AssessmentStatus.SUBMITTED:
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
        db: AsyncSession, tenant_id: str, assessment_id: str
    ) -> Assessment:
        assessment = await AssessmentService.get_assessment(
            db, tenant_id, assessment_id, load_details=True
        )

        # Idempotency: If already SUBMITTED, return existing finalized assessment
        if assessment.status == AssessmentStatus.SUBMITTED:
            return assessment

        # Verify responses exist
        if not assessment.response:
            raise AppError(
                "Assessment has no responses to submit. Please complete discovery questions before submission.",
                {"assessment_id": assessment_id},
            )

        # Transition to SUBMITTED
        assessment.status = AssessmentStatus.SUBMITTED
        await db.commit()
        await db.refresh(assessment)
        return assessment

    @staticmethod
    async def delete_assessment(
        db: AsyncSession, tenant_id: str, assessment_id: str
    ) -> None:
        assessment = await AssessmentService.get_assessment(db, tenant_id, assessment_id)
        await db.delete(assessment)
        await db.commit()
