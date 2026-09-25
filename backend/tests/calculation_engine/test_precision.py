"""Precision tests verifying full Decimal arithmetic in financial rates and hours."""

from decimal import Decimal
from app.calculation_engine import (
    ANNUAL_WORKING_HOURS,
    AssessmentInputs,
    CalculationEngine,
    DEFAULT_ANNUAL_LOADED_LABOR_COST,
)


def test_unrounded_loaded_rate_precision():
    """Verify that 180,000 / 2,080 produces an unrounded Decimal repeating fraction."""
    rate = DEFAULT_ANNUAL_LOADED_LABOR_COST / ANNUAL_WORKING_HOURS
    # 180000 / 2080 = 2250 / 26 = 1125 / 13 = 86.53846153846153846153846154...
    assert str(rate).startswith("86.5384615384615")
    # Verify that it is NOT a rounded 86.54 float
    assert rate != Decimal("86.54")


def test_cumulative_precision_multiplication():
    """Verify that multiplying unrounded rate by integer hours preserves exact rational math."""
    inputs = AssessmentInputs(
        q04_quarterly_admin_hours=Decimal("13"),  # 13 * 4 = 52 hours
        q06_troubleshooting_frequency="About monthly",  # 12
        q07_exact_hours=Decimal("13"),  # 12 * 13 = 156 hours
    )

    res = CalculationEngine.calculate(inputs)

    # Total hours = 52 + 156 = 208 hours
    # 208 * (180,000 / 2,080) = 208 * (180,000 / (208 * 10)) = 180,000 / 10 = Exactly 18,000!
    assert res.total_quantified_labor_cost.value == Decimal("18000.00")
    assert res.operational_fte_burden.value == Decimal("0.1")  # 208 / 2080 = Exactly 0.1 FTE!
