from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from pydantic import Field
from app.schemas.common import BaseSchema


class AssessmentResponseBase(BaseSchema):
    # Section A: Profile (Q01-Q03)
    q01_company_name: Optional[str] = Field(None, max_length=255)
    q02_industry: Optional[str] = Field(None, max_length=100)
    q03_environment_scale: Optional[str] = Field(None, max_length=100)

    # Section B: Administration Effort (Q04-Q05)
    q04_weekly_admin_hours: Optional[Decimal] = Field(None, ge=0)
    q05_mq_role_split: Optional[str] = Field(None, max_length=100)

    # Section C: Troubleshooting Labor (Q06-Q10)
    q06_frequency_text: Optional[str] = Field(None, max_length=100)
    q06_frequency_override: Optional[Decimal] = Field(None, ge=0)
    q07_labor_hours_text: Optional[str] = Field(None, max_length=100)
    q07_labor_hours_override: Optional[Decimal] = Field(None, ge=0)
    q08_duration_text: Optional[str] = Field(None, max_length=100)
    q09_root_cause_categories: Optional[str] = None
    q10_problem_types: Optional[str] = None

    # Section D: Business Impact & Downtime (Q11-Q15)
    q11_monitoring_status: Optional[str] = Field(None, max_length=100)
    q12_business_impact: Optional[str] = Field(None, max_length=100)
    q13_annual_outage_count: Optional[Decimal] = Field(None, ge=0)
    q14_duration_text: Optional[str] = Field(None, max_length=100)
    q14_duration_override: Optional[Decimal] = Field(None, ge=0)
    q15_hourly_cost_override: Optional[Decimal] = Field(None, ge=0)

    # Section E: Governance & Audit (Q16-Q19)
    q16_config_management_method: Optional[str] = Field(None, max_length=100)
    q17_audit_frequency: Optional[str] = Field(None, max_length=100)
    q18_audit_effort: Optional[str] = Field(None, max_length=100)
    q19_documentation_effort: Optional[str] = Field(None, max_length=100)

    # Section F: Financial Assumptions (Q20-Q21)
    q20_annual_labor_rate: Optional[Decimal] = Field(None, ge=0)
    q21_annual_mq_spend: Optional[Decimal] = Field(None, ge=0)

    # Section G: Modernization Strategy (Q22)
    q22_migration_plans: Optional[str] = Field(None, max_length=100)

    # Raw responses map
    raw_responses: Optional[Dict[str, Any]] = None


class AssessmentResponseCreateOrUpdate(AssessmentResponseBase):
    pass


class AssessmentResponseRead(AssessmentResponseBase):
    id: str
    assessment_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
