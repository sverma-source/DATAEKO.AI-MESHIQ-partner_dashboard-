from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.common import BaseSchema


class CustomerBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255, description="Customer company name")
    industry: Optional[str] = Field(None, max_length=100)
    primary_contact_name: Optional[str] = Field(None, max_length=255)
    primary_contact_email: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=1000)


class CustomerCreate(CustomerBase):
    tenant_id: Optional[str] = Field(None, description="Optional tenant override; defaults to active tenant")


class CustomerUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    primary_contact_name: Optional[str] = Field(None, max_length=255)
    primary_contact_email: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=1000)


class CustomerResponse(CustomerBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
