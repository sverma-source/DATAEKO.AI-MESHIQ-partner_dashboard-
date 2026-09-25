from typing import List, TYPE_CHECKING
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.assessment import Assessment
    from app.models.calculation_snapshot import CalculationSnapshot
    from app.models.user import User
    from app.models.audit_event import AuditEvent


class Tenant(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="tenant", cascade="all, delete-orphan"
    )
    customers: Mapped[List["Customer"]] = relationship(
        "Customer", back_populates="tenant", cascade="all, delete-orphan"
    )
    assessments: Mapped[List["Assessment"]] = relationship(
        "Assessment", back_populates="tenant", cascade="all, delete-orphan"
    )
    calculation_snapshots: Mapped[List["CalculationSnapshot"]] = relationship(
        "CalculationSnapshot", back_populates="tenant", cascade="all, delete-orphan"
    )
    audit_events: Mapped[List["AuditEvent"]] = relationship(
        "AuditEvent", back_populates="tenant", cascade="all, delete-orphan"
    )
