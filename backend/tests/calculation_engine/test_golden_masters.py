"""Golden Master test suite verifying calculation engine outputs against TC-01 through TC-10."""

from decimal import Decimal
from app.calculation_engine import (
    AssessmentInputs,
    CalculationEngine,
    CalculationState,
    DataProvenanceTier,
)


def test_tc01_standard_baseline_assessment():
    """TC-01: Standard Baseline Assessment with default $180k labor and ITIC $300k benchmark."""
    inputs = AssessmentInputs(
        q04_quarterly_admin_hours=Decimal("80"),
        q06_troubleshooting_frequency="About weekly",
        q07_staff_hours_per_investigation="3–5 hours",
        q12_business_impact_severity="Significant",
        q14_disruption_duration="1.5–4 hours",
        q15_hourly_downtime_cost=None,
        q20_loaded_annual_labor_cost=None,
    )

    res = CalculationEngine.calculate(inputs)

    # 1. Admin Hours: 80 * 4 = 320
    assert res.annual_admin_hours.is_valid
    assert res.annual_admin_hours.value == Decimal("320")

    # 2. Troubleshooting: 52 * 4.0 = 208
    assert res.annual_troubleshooting_events.value == Decimal("52")
    assert res.staff_hours_per_investigation.value == Decimal("4.0")
    assert res.annual_troubleshooting_hours.value == Decimal("208.0")

    # 3. Loaded Rate: 180000 / 2080 = 86.538461538...
    expected_rate = Decimal("180000") / Decimal("2080")
    assert res.loaded_hourly_rate.value == expected_rate
    assert res.loaded_annual_labor_cost.provenance == DataProvenanceTier.MODEL_ASSUMPTION

    # 4. Labor Costs
    expected_admin_cost = Decimal("320") * expected_rate
    expected_trb_cost = Decimal("208.0") * expected_rate
    expected_total_cost = expected_admin_cost + expected_trb_cost

    assert res.annual_admin_labor_cost.value == expected_admin_cost
    assert res.annual_troubleshooting_labor_cost.value == expected_trb_cost
    assert res.total_quantified_labor_cost.value == expected_total_cost
    # Formatted display check: $45,692.31
    assert round(res.total_quantified_labor_cost.value, 2) == Decimal("45692.31")

    # 5. Operational FTE: 528 / 2080 = 0.253846...
    assert res.operational_fte_burden.value == Decimal("528") / Decimal("2080")

    # 6. Single-Event Exposure: 2.75 * 300,000 = 825,000
    assert res.representative_duration_hours.value == Decimal("2.750")
    assert res.applicable_financial_rate.value == Decimal("300000")
    assert res.applicable_financial_rate.provenance == DataProvenanceTier.INDUSTRY_BENCHMARK
    assert res.potential_financial_exposure.value == Decimal("825000.000")

    # 7. Scenario Recovered Hours: (320 * 0.25) + (208 * 0.25) = 80 + 52 = 132
    assert res.recovered_admin_hours.value == Decimal("80.00")
    assert res.recovered_investigation_hours.value == Decimal("52.00")
    assert res.total_recovered_hours.value == Decimal("132.00")
    assert res.illustrative_economic_value.value == Decimal("132.00") * expected_rate
    assert round(res.illustrative_economic_value.value, 2) == Decimal("11423.08")

    # 8. Distinct 10% Productivity Opportunity: $18,000.00 * 0.10 = $1,800.00
    assert res.troubleshooting_productivity_opportunity.value == expected_trb_cost * Decimal("0.10")
    assert round(res.troubleshooting_productivity_opportunity.value, 2) == Decimal("1800.00")


def test_tc02_customer_fact_overrides():
    """TC-02: Custom rates ($240k loaded salary, $500k/hr downtime impact)."""
    inputs = AssessmentInputs(
        q04_quarterly_admin_hours=Decimal("250"),
        q06_troubleshooting_frequency="Multiple times per week",
        q07_staff_hours_per_investigation="6–10 hours",
        q12_business_impact_severity="Critical",
        q14_disruption_duration="4–8 hours",
        q15_hourly_downtime_cost=Decimal("500000"),
        q20_loaded_annual_labor_cost=Decimal("240000"),
    )

    res = CalculationEngine.calculate(inputs)

    # 1. Admin Hours: 250 * 4 = 1000
    assert res.annual_admin_hours.value == Decimal("1000")

    # 2. Troubleshooting: 104 * 8.0 = 832.0
    assert res.annual_troubleshooting_events.value == Decimal("104")
    assert res.annual_troubleshooting_hours.value == Decimal("832.0")

    # 3. Loaded Rate: 240000 / 2080
    expected_rate = Decimal("240000") / Decimal("2080")
    assert res.loaded_hourly_rate.value == expected_rate
    assert res.loaded_annual_labor_cost.provenance == DataProvenanceTier.CUSTOMER_FACT

    # 4. Labor Costs: (1000 + 832) * 115.3846...
    assert res.total_quantified_labor_cost.value == Decimal("1832") * expected_rate
    assert round(res.total_quantified_labor_cost.value, 2) == Decimal("211384.62")

    # 5. Potential Exposure: 6.0 * $500,000 = $3,000,000
    assert res.applicable_financial_rate.provenance == DataProvenanceTier.CUSTOMER_FACT
    assert res.potential_financial_exposure.value == Decimal("3000000.000")

    # 6. Scenario: (1000 * 0.25) + (832 * 0.25) = 250 + 208 = 458
    assert res.total_recovered_hours.value == Decimal("458.00")
    assert round(res.illustrative_economic_value.value, 2) == Decimal("52846.15")


def test_tc03_missing_admin_input_partial():
    """TC-03: Partial intake with missing admin hours."""
    inputs = AssessmentInputs(
        q04_quarterly_admin_hours=None,
        q06_troubleshooting_frequency="About monthly",
        q07_staff_hours_per_investigation="1–2 hours",
        q12_business_impact_severity="Significant",
        q14_disruption_duration="11–45 minutes",
        q15_hourly_downtime_cost=None,
    )

    res = CalculationEngine.calculate(inputs)

    assert res.annual_admin_hours.state == CalculationState.INSUFFICIENT_DATA
    assert res.annual_admin_hours.value is None

    assert res.annual_troubleshooting_hours.is_valid
    assert res.annual_troubleshooting_hours.value == Decimal("18.0")  # 12 * 1.5

    assert res.total_quantified_labor_cost.state == CalculationState.INSUFFICIENT_DATA
    assert res.total_recovered_hours.state == CalculationState.INSUFFICIENT_DATA

    # Outage should still calculate properly: 0.467 * 300,000 = 140,100
    assert res.potential_financial_exposure.is_valid
    assert res.potential_financial_exposure.value == Decimal("140100.000")


def test_tc04_non_qualifying_business_impact():
    """TC-04: Non-qualifying business impact (Moderate) with unprovided financial rate."""
    inputs = AssessmentInputs(
        q12_business_impact_severity="Moderate (Internal friction/delayed batch)",
        q14_disruption_duration="1.5–4 hours",
        q15_hourly_downtime_cost=None,
    )

    res = CalculationEngine.calculate(inputs)

    assert res.applicable_financial_rate.state == CalculationState.NOT_MODELED
    assert res.applicable_financial_rate.value is None
    assert res.potential_financial_exposure.state == CalculationState.NOT_MODELED
    assert res.potential_financial_exposure.value is None


def test_tc05_unmapped_dropdown_option_varies_significantly():
    """TC-05: Q07 'Varies significantly' without numeric override."""
    inputs = AssessmentInputs(
        q06_troubleshooting_frequency="Multiple times per month",
        q07_staff_hours_per_investigation="Varies significantly",
        q07_exact_hours=None,
    )

    res = CalculationEngine.calculate(inputs)

    assert res.staff_hours_per_investigation.state == CalculationState.UNMAPPED
    assert res.staff_hours_per_investigation.value is None
    assert res.annual_troubleshooting_hours.state == CalculationState.INSUFFICIENT_DATA
    assert res.annual_troubleshooting_hours.value is None


def test_tc06_zero_operational_friction():
    """TC-06: Zero operational friction ('Rarely or never' = 0 events)."""
    inputs = AssessmentInputs(
        q04_quarterly_admin_hours=Decimal("50"),
        q06_troubleshooting_frequency="Rarely or never",
        q07_staff_hours_per_investigation="Less than 1 hour",
    )

    res = CalculationEngine.calculate(inputs)

    assert res.annual_admin_hours.value == Decimal("200")
    assert res.annual_troubleshooting_events.value == Decimal("0")
    assert res.annual_troubleshooting_hours.value == Decimal("0.0")
    assert res.annual_troubleshooting_labor_cost.value == Decimal("0.0")
    assert res.total_quantified_labor_cost.value == Decimal("200") * (Decimal("180000") / Decimal("2080"))


def test_tc07_sub_hour_disruption():
    """TC-07: Sub-hour disruption (10 minutes or less = 0.167 hrs)."""
    inputs = AssessmentInputs(
        q12_business_impact_severity="Critical",
        q14_disruption_duration="10 minutes or less",
        q15_hourly_downtime_cost=Decimal("600000"),
    )

    res = CalculationEngine.calculate(inputs)

    assert res.representative_duration_hours.value == Decimal("0.167")
    assert res.potential_financial_exposure.value == Decimal("0.167") * Decimal("600000")
    assert res.potential_financial_exposure.value == Decimal("100200.000")


def test_tc08_extended_outage_boundary():
    """TC-08: Extended outage boundary (More than 8 hours = 10.0 hrs)."""
    inputs = AssessmentInputs(
        q12_business_impact_severity="Critical",
        q14_disruption_duration="More than 8 hours",
        q15_hourly_downtime_cost=Decimal("300000"),
    )

    res = CalculationEngine.calculate(inputs)

    assert res.representative_duration_hours.value == Decimal("10.000")
    assert res.potential_financial_exposure.value == Decimal("3000000.000")


def test_tc09_high_investigation_effort_band():
    """TC-09: High investigation effort (More than 20 hours = 24.0 hrs)."""
    inputs = AssessmentInputs(
        q06_troubleshooting_frequency="About quarterly",
        q07_staff_hours_per_investigation="More than 20 hours",
    )

    res = CalculationEngine.calculate(inputs)

    assert res.annual_troubleshooting_events.value == Decimal("4")
    assert res.staff_hours_per_investigation.value == Decimal("24.0")
    assert res.annual_troubleshooting_hours.value == Decimal("96.0")


def test_tc10_full_discovery_missing():
    """TC-10: Full discovery missing ('Not sure' across all fields)."""
    inputs = AssessmentInputs(
        q04_quarterly_admin_hours=None,
        q06_troubleshooting_frequency="Not sure",
        q07_staff_hours_per_investigation="Not sure",
        q12_business_impact_severity="Not sure",
        q14_disruption_duration="Not sure",
        q15_hourly_downtime_cost=None,
        q20_loaded_annual_labor_cost=None,
        q21_customer_reported_spend=None,
    )

    res = CalculationEngine.calculate(inputs)

    assert res.annual_admin_hours.state == CalculationState.INSUFFICIENT_DATA
    assert res.annual_troubleshooting_hours.state == CalculationState.NOT_MODELED
    assert res.total_quantified_labor_cost.state == CalculationState.INSUFFICIENT_DATA
    assert res.potential_financial_exposure.state == CalculationState.NOT_MODELED
    assert res.total_recovered_hours.state == CalculationState.INSUFFICIENT_DATA
    assert res.illustrative_economic_value.state == CalculationState.INSUFFICIENT_DATA
    assert res.customer_reported_annual_spend.state == CalculationState.NOT_MODELED
