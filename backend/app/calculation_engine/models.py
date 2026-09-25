"""Input and output data transfer objects (DTOs) for the calculation engine."""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, Optional
from .enums import CalculationState, DataProvenanceTier


@dataclass(frozen=True)
class AssessmentInputs:
    """Strongly typed input model representing the 22-question discovery intake."""

    # Section A: Environment & Cost Baseline (Q01–Q05)
    q01_queue_managers_scale: Optional[str] = None
    q01_exact_count: Optional[int] = None
    q02_staffing_headcount_scale: Optional[str] = None
    q02_exact_count: Optional[int] = None
    q03_staffing_model: Optional[str] = None
    q04_quarterly_admin_hours: Optional[Decimal] = None
    q05_technical_debt_status: Optional[str] = None

    # Section B: Troubleshooting Economics (Q06–Q08)
    q06_troubleshooting_frequency: Optional[str] = None
    q07_staff_hours_per_investigation: Optional[str] = None
    q07_exact_hours: Optional[Decimal] = None
    q08_elapsed_investigation_duration: Optional[str] = None

    # Section C: Operational Complexity & Productivity (Q09–Q11)
    q09_tools_count: Optional[str] = None
    q10_correlation_friction: Optional[str] = None
    q11_productivity_constraint: Optional[str] = None

    # Section D: Business Consequence & Financial Exposure (Q12–Q15)
    q12_business_impact_severity: Optional[str] = None
    q13_recent_disruptions: Optional[str] = None
    q14_disruption_duration: Optional[str] = None
    q15_hourly_downtime_cost: Optional[Decimal] = None

    # Section E: Cost Reduction & Organizational Pressure (Q16–Q17)
    q16_cost_mandate: Optional[str] = None
    q17_target_opex_reduction: Optional[str] = None

    # Section F: Cybersecurity & Remediation (Q18–Q19)
    q18_cybersecurity_pressure: Optional[str] = None
    q19_remediation_friction: Optional[str] = None

    # Section G: Economic Inputs & Timing (Q20–Q22)
    q20_loaded_annual_labor_cost: Optional[Decimal] = None
    q21_customer_reported_spend: Optional[Decimal] = None
    q22_time_to_act: Optional[str] = None


@dataclass(frozen=True)
class MetricResult:
    """Structured calculation metric wrapper preserving value, state, and provenance."""

    value: Optional[Decimal]
    state: CalculationState
    provenance: DataProvenanceTier
    formula_code: str
    rule_version: str
    inputs_used: Dict[str, Any] = field(default_factory=dict)
    state_reason: Optional[str] = None

    @property
    def is_valid(self) -> bool:
        """Return True if the metric was evaluated successfully."""
        return self.state in (CalculationState.VALID, CalculationState.VALID_WITH_DEFAULTS)


@dataclass(frozen=True)
class CalculationResults:
    """Comprehensive output container packaging all calculated baseline and scenario metrics."""

    # Baseline Operational Labor Metrics
    annual_admin_hours: MetricResult
    annual_troubleshooting_events: MetricResult
    staff_hours_per_investigation: MetricResult
    annual_troubleshooting_hours: MetricResult
    loaded_annual_labor_cost: MetricResult
    loaded_hourly_rate: MetricResult
    annual_admin_labor_cost: MetricResult
    annual_troubleshooting_labor_cost: MetricResult
    total_quantified_labor_cost: MetricResult
    operational_fte_burden: MetricResult

    # Outage & Financial Exposure Metrics
    representative_duration_hours: MetricResult
    applicable_financial_rate: MetricResult
    potential_financial_exposure: MetricResult

    # Decomposed meshIQ Improvement Scenario Metrics
    recovered_admin_hours: MetricResult
    recovered_investigation_hours: MetricResult
    total_recovered_hours: MetricResult
    illustrative_economic_value: MetricResult

    # Distinct Productivity Opportunity Metric
    troubleshooting_productivity_opportunity: MetricResult

    # Contextual Customer Spend Metric
    customer_reported_annual_spend: MetricResult

    # Execution Metadata
    engine_version: str
    rule_set_version: str
    execution_status: str
