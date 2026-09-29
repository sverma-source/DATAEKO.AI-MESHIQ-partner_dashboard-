import enum
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Enum as SQLEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.customer import Customer
    from app.models.user import User
    from app.models.assessment_response import AssessmentResponse
    from app.models.calculation_snapshot import CalculationSnapshot


class AssessmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    CALCULATED = "CALCULATED"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class Assessment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "assessments"

    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[AssessmentStatus] = mapped_column(
        SQLEnum(AssessmentStatus, native_enum=False),
        default=AssessmentStatus.DRAFT,
        nullable=False,
        index=True,
    )
    assessment_version: Mapped[str] = mapped_column(
        String(50), default="1.0.0", nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="assessments")
    customer: Mapped["Customer"] = relationship("Customer", back_populates="assessments")
    created_by: Mapped[Optional["User"]] = relationship("User")
    response: Mapped[Optional["AssessmentResponse"]] = relationship(
        "AssessmentResponse", back_populates="assessment", uselist=False, cascade="all, delete-orphan"
    )
    calculation_snapshots: Mapped[List["CalculationSnapshot"]] = relationship(
        "CalculationSnapshot",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="desc(CalculationSnapshot.created_at)",
    )
