from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_tenant_id, require_permission
from app.core.rbac import Permission
from app.models.audit_event import AuditEvent
from app.models.user import User
from app.schemas.audit import AuditEventResponse

router = APIRouter()


@router.get("", response_model=List[AuditEventResponse])
async def list_audit_events(
    limit: int = Query(default=50, ge=1, le=500),
    event_type: Optional[str] = Query(default=None),
    resource_type: Optional[str] = Query(default=None),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(require_permission(Permission.AUDIT_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve append-only audit trail for the active tenant.
    Requires 'audit:read' permission (Consultant, Partner Admin, Platform Admin).
    """
    stmt = select(AuditEvent).where(AuditEvent.tenant_id == tenant_id)
    
    if event_type:
        stmt = stmt.where(AuditEvent.event_type == event_type)
    if resource_type:
        stmt = stmt.where(AuditEvent.resource_type == resource_type)
        
    stmt = stmt.order_by(desc(AuditEvent.created_at)).limit(limit)
    res = await db.execute(stmt)
    audit_events = res.scalars().all()
    
    return [AuditEventResponse.model_validate(e) for e in audit_events]
