from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_tenant_id, get_current_user_optional, get_db
from app.core.audit import log_audit_event
from app.core.errors import EntityNotFoundError
from app.core.rate_limit import rate_limit_calculation
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

router = APIRouter()


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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    assessment = await AssessmentService.create_assessment(db, tenant_id, payload)
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_CREATED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
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
):
    return await AssessmentService.list_assessments(
        db, tenant_id, customer_id=customer_id, skip=skip, limit=limit
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
):
    assessment = await AssessmentService.get_assessment(
        db, tenant_id, assessment_id, load_details=True
    )
    latest_snapshot = (
        assessment.calculation_snapshots[0]
        if assessment.calculation_snapshots
        else None
    )
    return AssessmentDetailResponse(
        id=assessment.id,
        tenant_id=assessment.tenant_id,
        customer_id=assessment.customer_id,
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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    assessment = await AssessmentService.update_assessment(
        db, tenant_id, assessment_id, payload
    )
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_UPDATED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    saved_resp = await AssessmentService.save_responses(
        db, tenant_id, assessment_id, payload
    )
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_RESPONSES_SAVED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
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
):
    assessment = await AssessmentService.get_assessment(
        db, tenant_id, assessment_id, load_details=True
    )
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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    assessment = await AssessmentService.submit_assessment(db, tenant_id, assessment_id)
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_SUBMITTED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
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
    latest_snapshot = (
        assessment.calculation_snapshots[0]
        if assessment.calculation_snapshots
        else None
    )
    return AssessmentDetailResponse(
        id=assessment.id,
        tenant_id=assessment.tenant_id,
        customer_id=assessment.customer_id,
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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    calc_result = await CalculationService.run_calculation(db, tenant_id, assessment_id)
    await log_audit_event(
        session=db,
        event_type="CALCULATION_EXECUTED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
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
):
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
):
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
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    await AssessmentService.delete_assessment(db, tenant_id, assessment_id)
    await log_audit_event(
        session=db,
        event_type="ASSESSMENT_DELETED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
        resource_type="Assessment",
        resource_id=assessment_id,
        status="SUCCESS",
    )
    await db.commit()
