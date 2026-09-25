from datetime import datetime
from typing import Optional
from pydantic import Field
from app.models.assessment import AssessmentStatus
from app.schemas.common import BaseSchema
from app.schemas.customer import CustomerResponse
from app.schemas.assessment_response import AssessmentResponseRead
from app.schemas.calculation import CalculationSnapshotRead


class AssessmentBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    status: AssessmentStatus = AssessmentStatus.DRAFT
    assessment_version: str = "1.0.0"


class AssessmentCreate(AssessmentBase):
    customer_id: str = Field(..., description="Target customer ID")
    tenant_id: Optional[str] = Field(None, description="Optional tenant ID; defaults to active tenant")


class AssessmentUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[AssessmentStatus] = None
    assessment_version: Optional[str] = None


class AssessmentResponseSchema(AssessmentBase):
    id: str
    tenant_id: str
    customer_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class AssessmentDetailResponse(AssessmentResponseSchema):
    customer: Optional[CustomerResponse] = None
    response: Optional[AssessmentResponseRead] = None
    latest_snapshot: Optional[CalculationSnapshotRead] = None
