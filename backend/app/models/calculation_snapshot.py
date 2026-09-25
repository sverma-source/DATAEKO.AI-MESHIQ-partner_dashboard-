from datetime import datetime
from typing import Any, Dict, Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, get_utc_now

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.assessment import Assessment


class CalculationSnapshot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "calculation_snapshots"

    assessment_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    calculation_engine_version: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    assessment_version: Mapped[str] = mapped_column(
        String(50), nullable=False, default="1.0.0"
    )
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )

    # Serialized Payloads
    normalized_inputs: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    computed_metrics: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    summary_metrics: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    assumptions_used: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    benchmarks_used: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    provenance_summary: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="calculation_snapshots")
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="calculation_snapshots")
