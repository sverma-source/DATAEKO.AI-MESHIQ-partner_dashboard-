"""Boundary and edge case test suite covering all matrix variations without raw exceptions."""

from decimal import Decimal
from app.calculation_engine import (
    AssessmentInputs,
    CalculationEngine,
    CalculationState,
    DataProvenanceTier,
)
from app.calculation_engine.lookups import (
    lookup_disruption_duration,
    lookup_investigation_hours,
)


def test_q15_fallback_hierarchy_variations():
    """Verify Q15 customer fact override vs Q12 ITIC benchmark eligibility across all severity tiers."""
    # 1. Customer Fact provided ($450,000) on Minor impact -> Customer Fact wins
    res = CalculationEngine.calculate(
        AssessmentInputs(
            q12_business_impact_severity="Minor (Minimal operational impact)",
            q14_disruption_duration="4–8 hours",
            q15_hourly_downtime_cost=Decimal("450000"),
        )
    )
    assert res.applicable_financial_rate.value == Decimal("450000")
    assert res.applicable_financial_rate.provenance == DataProvenanceTier.CUSTOMER_FACT
    assert res.potential_financial_exposure.value == Decimal("6.000") * Decimal("450000")

    # 2. Q15 Blank + Critical -> ITIC $300k
    res = CalculationEngine.calculate(
        AssessmentInputs(
            q12_business_impact_severity="Critical (Immediate customer/revenue halt)",
            q14_disruption_duration="1.5–4 hours",
            q15_hourly_downtime_cost=None,
        )
    )
    assert res.applicable_financial_rate.value == Decimal("300000")
    assert res.applicable_financial_rate.provenance == DataProvenanceTier.INDUSTRY_BENCHMARK
    assert res.potential_financial_exposure.value == Decimal("2.750") * Decimal("300000")

    # 3. Q15 Blank + Significant -> ITIC $300k
    res = CalculationEngine.calculate(
        AssessmentInputs(
            q12_business_impact_severity="Significant (Severe degradation/SLAs breached)",
            q14_disruption_duration="11–45 minutes",
            q15_hourly_downtime_cost=None,
        )
    )
    assert res.applicable_financial_rate.value == Decimal("300000")
    assert res.potential_financial_exposure.value == Decimal("0.467") * Decimal("300000")

    # 4. Q15 Blank + Minor -> NOT_MODELED
    res = CalculationEngine.calculate(
        AssessmentInputs(
            q12_business_impact_severity="Minor (Minimal operational impact)",
            q14_disruption_duration="4–8 hours",
            q15_hourly_downtime_cost=None,
        )
    )
    assert res.applicable_financial_rate.state == CalculationState.NOT_MODELED
    assert res.potential_financial_exposure.state == CalculationState.NOT_MODELED


def test_zero_admin_hours_boundary():
    """Verify zero quarterly admin hours evaluates to valid 0 without errors."""
    res = CalculationEngine.calculate(
        AssessmentInputs(
            q04_quarterly_admin_hours=Decimal("0"),
            q06_troubleshooting_frequency="About weekly",
            q07_staff_hours_per_investigation="1–2 hours",
        )
    )
    assert res.annual_admin_hours.value == Decimal("0")
    assert res.annual_admin_labor_cost.value == Decimal("0.0")
    assert res.annual_troubleshooting_hours.value == Decimal("78.0")  # 52 * 1.5
    assert res.total_quantified_labor_cost.value == res.annual_troubleshooting_labor_cost.value


def test_q21_customer_reported_spend_isolation():
    """Verify Q21 is preserved as customer fact and never alters calculated labor totals."""
    res = CalculationEngine.calculate(
        AssessmentInputs(
            q04_quarterly_admin_hours=Decimal("100"),
            q06_troubleshooting_frequency="About monthly",
            q07_staff_hours_per_investigation="3–5 hours",
            q21_customer_reported_spend=Decimal("1500000"),
        )
    )
    assert res.customer_reported_annual_spend.value == Decimal("1500000")
    assert res.customer_reported_annual_spend.provenance == DataProvenanceTier.CUSTOMER_FACT
    assert res.customer_reported_annual_spend.state == CalculationState.VALID
    # Verify calculated labor remains derived from hours * rate
    assert res.total_quantified_labor_cost.value != Decimal("1500000")


def test_negative_or_invalid_numeric_overrides():
    """Verify negative numeric overrides evaluate cleanly to CANNOT_CALCULATE or INSUFFICIENT_DATA."""
    val, state = lookup_investigation_hours("3–5 hours", numeric_override=Decimal("-5.0"))
    assert val is None
    assert state == CalculationState.CANNOT_CALCULATE

    val, state = lookup_investigation_hours("unknown_invalid_option_xyz")
    assert val is None
    assert state == CalculationState.INSUFFICIENT_DATA

    val, state = lookup_disruption_duration("unknown_invalid_duration_xyz")
    assert val is None
    assert state == CalculationState.INSUFFICIENT_DATA


def test_partial_combinations():
    """Verify partial combinations of valid admin + unmapped troubleshooting."""
    res = CalculationEngine.calculate(
        AssessmentInputs(
            q04_quarterly_admin_hours=Decimal("50"),
            q06_troubleshooting_frequency="invalid_frequency",
            q07_staff_hours_per_investigation="3–5 hours",
        )
    )
    assert res.annual_admin_hours.is_valid
    assert res.annual_troubleshooting_hours.state == CalculationState.INSUFFICIENT_DATA
    assert res.total_quantified_labor_cost.state == CalculationState.INSUFFICIENT_DATA
    assert res.recovered_admin_hours.is_valid
    assert res.recovered_investigation_hours.state == CalculationState.INSUFFICIENT_DATA
    assert res.total_recovered_hours.state == CalculationState.INSUFFICIENT_DATA
