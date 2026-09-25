from datetime import datetime
from typing import Optional
from app.schemas.common import BaseSchema


class TenantBase(BaseSchema):
    name: str
    slug: str
    is_active: bool = True


class TenantCreate(TenantBase):
    pass


class TenantResponse(TenantBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
