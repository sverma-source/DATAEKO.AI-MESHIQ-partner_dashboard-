from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_event import AuditEvent


async def log_audit_event(
    session: AsyncSession,
    event_type: str,
    tenant_id: str,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditEvent:
    """
    Append-only audit logger for capturing security events, calculations, and data mutations.
    """
    # Sanitize details to prevent logging passwords or raw secrets
    sanitized_details = None
    if details:
        sanitized_details = {
            k: ("[REDACTED]" if any(secret_term in k.lower() for secret_term in ["password", "token", "secret", "cookie"]) else v)
            for k, v in details.items()
        }

    audit_entry = AuditEvent(
        event_type=event_type,
        user_id=user_id,
        tenant_id=tenant_id,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        status=status,
        ip_address=ip_address,
        details_json=sanitized_details,
    )
    session.add(audit_entry)
    await session.flush()
    return audit_entry
