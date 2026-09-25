from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    id: str
    event_type: str
    user_id: Optional[str] = None
    tenant_id: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    status: str
    ip_address: Optional[str] = None
    details_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
