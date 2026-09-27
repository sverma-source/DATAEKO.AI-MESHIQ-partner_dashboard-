from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.correlation import get_request_id
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
    Automatically includes active request correlation ID in event details.
    """
    # Sanitize details to prevent logging passwords or raw secrets
    sanitized_details = {}
    if details:
        sanitized_details = {
            k: ("[REDACTED]" if any(secret_term in k.lower() for secret_term in ["password", "token", "secret", "cookie"]) else v)
            for k, v in details.items()
        }

    # Attach request correlation ID
    req_id = get_request_id()
    if req_id and req_id != "unknown" and "request_id" not in sanitized_details:
        sanitized_details["request_id"] = req_id

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
