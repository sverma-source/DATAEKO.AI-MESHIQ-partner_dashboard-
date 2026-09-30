from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.core.audit import log_audit_event
from app.core.errors import EntityNotFoundError, PermissionDeniedError
from app.core.rate_limit import rate_limit_calculation
from app.core.rbac import Role
from app.models.assessment import Assessment
from app.models.user import User
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentDetailResponse,
    AssessmentResponseSchema,
    AssessmentUpdate,
)
from app.schemas.assessment_response import (
    AssessmentResponseCreateOrUpdate,
    AssessmentResponseRead,
)
from app.schemas.calculation import (
    CalculationRunResponse,
    CalculationSnapshotRead,
)
from app.services.assessment_service import AssessmentService
from app.services.calculation_service import CalculationService
from app.services.deliverable_service import DeliverableService

router = APIRouter()


def check_assessment_access(
    assessment: Assessment,
    user_id: str,
    user_role: str,
) -> None:
    """Enforces user-level ownership access for CUSTOMER_USER."""
    if user_role == Role.CUSTOMER_USER.value:
        if not assessment.created_by_user_id or assessment.created_by_user_id != user_id:
            raise PermissionDeniedError("Access denied to this assessment.")


@router.post(
    "",
    response_model=AssessmentResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Assessment",
)
async def create_assessment(
    payload: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.CUSTOMER_USER.value:
        if current_user.customer_id and payload.customer_id != current_user.customer_id:
            raise PermissionDeniedError("Clients cannot create assessments for other customer organizations.")

    user_id = current_user.id
    assessment = await AssessmentService.create_assessment(
        db, tenant_id, payload, created_by_user_id=user_id
    )
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_CREATED",
        tenant_id=tenant_id,
        user_id=user_id,
        resource_type="Assessment",
        resource_id=assessment.id,
        status="SUCCESS",
        details={"title": assessment.title, "customer_id": assessment.customer_id},
    )
    await db.commit()
    return assessment


@router.get(
    "",
    response_model=List[AssessmentResponseSchema],
    summary="List Assessments for current Tenant",
)
async def list_assessments(
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    user_role = current_user.role
    created_by_user_id = (
        user_id
        if user_role == Role.CUSTOMER_USER.value
        else None
    )
    return await AssessmentService.list_assessments(
        db,
        tenant_id,
        customer_id=customer_id,
        created_by_user_id=created_by_user_id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{assessment_id}",
    response_model=AssessmentDetailResponse,
    summary="Get Assessment by ID with customer, responses, and latest snapshot",
)
async def get_assessment(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    user_role = current_user.role

    assessment = await AssessmentService.get_assessment(
        db, tenant_id, assessment_id, load_details=True
    )
    check_assessment_access(assessment, user_id, user_role)

    # For CUSTOMER_USER, sanitize latest_snapshot = None so internal economic metrics are never exposed
    latest_snapshot = None
    if user_role != Role.CUSTOMER_USER.value:
        latest_snapshot = (
            assessment.calculation_snapshots[0]
            if assessment.calculation_snapshots
            else None
        )

    return AssessmentDetailResponse(
        id=assessment.id,
        tenant_id=assessment.tenant_id,
        customer_id=assessment.customer_id,
        created_by_user_id=assessment.created_by_user_id,
        title=assessment.title,
        description=assessment.description,
        status=assessment.status,
        assessment_version=assessment.assessment_version,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
        customer=assessment.customer,
        response=assessment.response,
        latest_snapshot=latest_snapshot,
    )


@router.put(
    "/{assessment_id}",
    response_model=AssessmentResponseSchema,
    summary="Update Assessment metadata by ID",
)
async def update_assessment(
    assessment_id: str,
    payload: AssessmentUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    user_role = current_user.role

    existing = await AssessmentService.get_assessment(db, tenant_id, assessment_id)
    check_assessment_access(existing, user_id, user_role)

    assessment = await AssessmentService.update_assessment(
        db, tenant_id, assessment_id, payload
    )
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_UPDATED",
        tenant_id=tenant_id,
        user_id=user_id,
        resource_type="Assessment",
        resource_id=assessment.id,
        status="SUCCESS",
        details={"title": assessment.title},
    )
    await db.commit()
    return assessment


@router.put(
    "/{assessment_id}/responses",
    response_model=AssessmentResponseRead,
    summary="Save/Update original assessment responses (Q01-Q22)",
)
async def save_assessment_responses(
    assessment_id: str,
    payload: AssessmentResponseCreateOrUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    user_role = current_user.role

    existing = await AssessmentService.get_assessment(db, tenant_id, assessment_id)
    check_assessment_access(existing, user_id, user_role)

    saved_resp = await AssessmentService.save_responses(
        db, tenant_id, assessment_id, payload
    )
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_RESPONSES_SAVED",
        tenant_id=tenant_id,
        user_id=user_id,
        resource_type="AssessmentResponse",
        resource_id=saved_resp.id,
        status="SUCCESS",
        details={"assessment_id": assessment_id},
    )
    await db.commit()
    return saved_resp


@router.get(
    "/{assessment_id}/responses",
    response_model=AssessmentResponseRead,
    summary="Get saved assessment responses",
)
async def get_assessment_responses(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    user_role = current_user.role

    assessment = await AssessmentService.get_assessment(
        db, tenant_id, assessment_id, load_details=True
    )
    check_assessment_access(assessment, user_id, user_role)
    if not assessment.response:
        raise EntityNotFoundError("AssessmentResponse", assessment_id)
    return assessment.response


@router.post(
    "/{assessment_id}/submit",
    response_model=AssessmentDetailResponse,
    summary="Submit and finalize assessment discovery responses (Q01-Q22)",
)
async def submit_assessment_endpoint(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    user_role = current_user.role

    existing = await AssessmentService.get_assessment(db, tenant_id, assessment_id)
    check_assessment_access(existing, user_id, user_role)

    assessment = await AssessmentService.submit_assessment(
        db, tenant_id, assessment_id, user_id=user_id
    )

    # For CUSTOMER_USER, sanitize latest_snapshot = None
    latest_snapshot = None
    if user_role != Role.CUSTOMER_USER.value:
        latest_snapshot = (
            assessment.calculation_snapshots[0]
            if assessment.calculation_snapshots
            else None
        )

    return AssessmentDetailResponse(
        id=assessment.id,
        tenant_id=assessment.tenant_id,
        customer_id=assessment.customer_id,
        created_by_user_id=assessment.created_by_user_id,
        title=assessment.title,
        description=assessment.description,
        status=assessment.status,
        assessment_version=assessment.assessment_version,
        created_at=assessment.created_at,
        updated_at=assessment.updated_at,
        customer=assessment.customer,
        response=assessment.response,
        latest_snapshot=latest_snapshot,
    )


@router.post(
    "/{assessment_id}/calculate",
    response_model=CalculationRunResponse,
    summary="Execute pure calculation engine & persist immutable snapshot",
)
async def calculate_assessment_endpoint(
    assessment_id: str,
    _rate_limit: None = Depends(rate_limit_calculation),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.CUSTOMER_USER.value:
        raise PermissionDeniedError("Calculation execution is restricted to consultants and platform administrators.")

    calc_result = await CalculationService.run_calculation(db, tenant_id, assessment_id)
    await log_audit_event(
        session=db,
        event_type="CALCULATION_EXECUTED",
        tenant_id=tenant_id,
        user_id=current_user.id,
        resource_type="CalculationSnapshot",
        resource_id=calc_result.snapshot_id,
        status="SUCCESS",
        details={
            "assessment_id": assessment_id,
            "engine_version": calc_result.calculation_engine_version,
        },
    )
    await db.commit()
    return calc_result


@router.get(
    "/{assessment_id}/snapshots",
    response_model=List[CalculationSnapshotRead],
    summary="List historical calculation snapshots for assessment",
)
async def list_calculation_snapshots(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.CUSTOMER_USER.value:
        raise PermissionDeniedError("Calculation snapshots are restricted to consultants and platform administrators.")

    await AssessmentService.get_assessment(db, tenant_id, assessment_id)
    return await CalculationService.list_snapshots(db, tenant_id, assessment_id)


@router.get(
    "/{assessment_id}/snapshots/latest",
    response_model=CalculationSnapshotRead,
    summary="Get latest calculation snapshot for assessment",
)
async def get_latest_calculation_snapshot(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.CUSTOMER_USER.value:
        raise PermissionDeniedError("Calculation snapshots are restricted to consultants and platform administrators.")

    return await CalculationService.get_latest_snapshot(db, tenant_id, assessment_id)


@router.delete(
    "/{assessment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Assessment by ID",
)
async def delete_assessment(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.CUSTOMER_USER.value:
        raise PermissionDeniedError("Assessment deletion is restricted to consultants and platform administrators.")

    await AssessmentService.delete_assessment(db, tenant_id, assessment_id)
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_DELETED",
        tenant_id=tenant_id,
        user_id=current_user.id,
        resource_type="Assessment",
        resource_id=assessment_id,
        status="SUCCESS",
    )
    await db.commit()


@router.get(
    "/{assessment_id}/deliverables/csv",
    summary="Download finalized Q01-Q22 responses export in CSV format",
    response_class=Response,
)
async def download_assessment_csv(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.CUSTOMER_USER.value:
        raise PermissionDeniedError("Assessment deliverables are restricted to consultants and platform administrators.")

    assessment = await DeliverableService.get_assessment_for_deliverable(
        db, tenant_id, assessment_id
    )
    if not assessment.response:
        raise EntityNotFoundError("AssessmentResponse", f"for assessment {assessment_id}")
    csv_content = DeliverableService.generate_csv(assessment)
    filename = f"assessment_{assessment_id}_responses.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get(
    "/{assessment_id}/deliverables/pdf",
    summary="Download Executive Customer Assessment Report in PDF format",
    response_class=Response,
)
async def download_assessment_pdf(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == Role.CUSTOMER_USER.value:
        raise PermissionDeniedError("Executive assessment deliverables are restricted to consultants and platform administrators.")

    assessment = await DeliverableService.get_assessment_for_deliverable(
        db, tenant_id, assessment_id
    )
    pdf_bytes = DeliverableService.generate_pdf(assessment)
    filename = f"DATAEKO_meshIQ_Executive_Report_{assessment_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


