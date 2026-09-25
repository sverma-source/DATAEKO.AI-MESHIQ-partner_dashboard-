from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional, Any, Dict
from sqlalchemy import String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User


class AuditEvent(Base, UUIDPrimaryKeyMixin):
    """
    Append-only, immutable audit trail entity for tracking security events,
    entity mutations, calculations, and report generation events.
    """
    __tablename__ = "audit_events"

    event_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False
    )
    resource_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SUCCESS", nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    details_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="audit_events")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_events")
