from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.audit_event import AuditEvent


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="CONSULTANT", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Multi-tenant foreign key
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="users")
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="user", cascade="all, delete-orphan"
    )
