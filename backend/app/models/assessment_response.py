from decimal import Decimal
from typing import Any, Dict, Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.assessment import Assessment


class AssessmentResponse(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "assessment_responses"

    assessment_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Section A: Profile (Q01-Q03)
    q01_company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    q02_industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q03_environment_scale: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Section B: Administration Effort (Q04-Q05)
    q04_weekly_admin_hours: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    q05_mq_role_split: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Section C: Troubleshooting Labor (Q06-Q10)
    q06_frequency_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q06_frequency_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    q07_labor_hours_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q07_labor_hours_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    q08_duration_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q09_root_cause_categories: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    q10_problem_types: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Section D: Business Impact & Downtime (Q11-Q15)
    q11_monitoring_status: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q12_business_impact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q13_annual_outage_count: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    q14_duration_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q14_duration_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    q15_hourly_cost_override: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)

    # Section E: Governance & Audit (Q16-Q19)
    q16_config_management_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q17_audit_frequency: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q18_audit_effort: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    q19_documentation_effort: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Section F: Financial Assumptions (Q20-Q21)
    q20_annual_labor_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    q21_annual_mq_spend: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)

    # Section G: Modernization Strategy (Q22)
    q22_migration_plans: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Complete Raw Original Responses JSON payload for unadulterated preservation
    raw_responses: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    # Relationship
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="response")
