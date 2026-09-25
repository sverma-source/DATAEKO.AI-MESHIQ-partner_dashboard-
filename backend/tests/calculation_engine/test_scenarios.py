"""Scenario tests verifying decomposed multipliers and distinct productivity metrics."""

from decimal import Decimal
from app.calculation_engine import (
    AssessmentInputs,
    CalculationEngine,
    CalculationState,
    DataProvenanceTier,
)


def test_scenario_decomposition_and_distinct_10_percent():
    """Verify that admin 50% * 50% and investigation 25% are decomposed and distinct from 10% opportunity."""
    inputs = AssessmentInputs(
        q04_quarterly_admin_hours=Decimal("100"),  # 400 annual admin hours
        q06_troubleshooting_frequency="Multiple times per month",  # 30 events
        q07_staff_hours_per_investigation="6–10 hours",  # 8.0 hrs -> 240 trb hours
    )

    res = CalculationEngine.calculate(inputs)

    # 1. Admin Hours Recovered: 400 * 0.50 * 0.50 = 100.00
    assert res.recovered_admin_hours.value == Decimal("100.00")
    assert res.recovered_admin_hours.provenance == DataProvenanceTier.ILLUSTRATIVE_SCENARIO
    assert "0.50_ADDRESSABLE" in res.recovered_admin_hours.formula_code

    # 2. Investigation Hours Recovered: 240 * 0.25 = 60.00
    assert res.recovered_investigation_hours.value == Decimal("60.00")
    assert res.recovered_investigation_hours.provenance == DataProvenanceTier.ILLUSTRATIVE_SCENARIO

    # 3. Total Recovered Hours: 100 + 60 = 160.00
    assert res.total_recovered_hours.value == Decimal("160.00")

    # 4. Illustrative Value: 160 * (180,000 / 2,080) = $13,846.15
    expected_rate = Decimal("180000") / Decimal("2080")
    assert res.illustrative_economic_value.value == Decimal("160.00") * expected_rate

    # 5. Distinct 10% Troubleshooting Productivity Opportunity:
    # Trb labor cost = 240 * expected_rate = $20,769.23
    # 10% opp = $20,769.23 * 0.10 = $2,076.92
    assert res.troubleshooting_productivity_opportunity.value == res.annual_troubleshooting_labor_cost.value * Decimal("0.10")
    assert round(res.troubleshooting_productivity_opportunity.value, 2) == Decimal("2076.92")
    assert res.troubleshooting_productivity_opportunity.provenance == DataProvenanceTier.ILLUSTRATIVE_SCENARIO
