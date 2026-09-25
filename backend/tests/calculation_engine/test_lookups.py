"""Unit tests verifying lookup normalization, dictionary mappings, and case insensitivity."""

from decimal import Decimal
from app.calculation_engine.enums import CalculationState
from app.calculation_engine.lookups import (
    lookup_disruption_duration,
    lookup_investigation_hours,
    lookup_troubleshooting_events,
)


def test_frequency_lookups():
    """Verify all Q06 frequency strings and case-insensitive matching."""
    mappings = {
        "Multiple times per week": (104, CalculationState.VALID),
        "about weekly": (52, CalculationState.VALID),
        " MULTIPLE TIMES PER MONTH  ": (30, CalculationState.VALID),
        "About Monthly": (12, CalculationState.VALID),
        "about quarterly": (4, CalculationState.VALID),
        "Less than quarterly": (2, CalculationState.VALID),
        "Rarely or never": (0, CalculationState.VALID),
        "Not sure": (None, CalculationState.NOT_MODELED),
        "unknown": (None, CalculationState.NOT_MODELED),
        "": (None, CalculationState.NOT_MODELED),
        None: (None, CalculationState.NOT_MODELED),
        "invalid_random_string": (None, CalculationState.INSUFFICIENT_DATA),
    }

    for input_str, expected in mappings.items():
        val, state = lookup_troubleshooting_events(input_str)
        assert val == expected[0], f"Failed on frequency input: {input_str}"
        assert state == expected[1], f"State mismatch on frequency input: {input_str}"


def test_investigation_hours_lookups():
    """Verify all Q07 investigation effort strings, numeric overrides, and unmapped options."""
    mappings = {
        "Less than 1 hour": (Decimal("0.5"), CalculationState.VALID),
        "<1 hour": (Decimal("0.5"), CalculationState.VALID),
        "1–2 hours": (Decimal("1.5"), CalculationState.VALID),
        "1-2 hours": (Decimal("1.5"), CalculationState.VALID),
        "3–5 hours": (Decimal("4.0"), CalculationState.VALID),
        "3-5 hours": (Decimal("4.0"), CalculationState.VALID),
        "6–10 hours": (Decimal("8.0"), CalculationState.VALID),
        "6-10 hours": (Decimal("8.0"), CalculationState.VALID),
        "11–20 hours": (Decimal("15.5"), CalculationState.VALID),
        "11-20 hours": (Decimal("15.5"), CalculationState.VALID),
        "More than 20 hours": (Decimal("24.0"), CalculationState.VALID),
        ">20 hours": (Decimal("24.0"), CalculationState.VALID),
        "Varies significantly": (None, CalculationState.UNMAPPED),
        "varies significantly": (None, CalculationState.UNMAPPED),
        "Not sure": (None, CalculationState.NOT_MODELED),
        None: (None, CalculationState.NOT_MODELED),
    }

    for input_str, expected in mappings.items():
        val, state = lookup_investigation_hours(input_str)
        assert val == expected[0], f"Failed on investigation input: {input_str}"
        assert state == expected[1], f"State mismatch on investigation input: {input_str}"

    # Test exact numeric override
    val, state = lookup_investigation_hours("3–5 hours", numeric_override=Decimal("6.75"))
    assert val == Decimal("6.75")
    assert state == CalculationState.VALID


def test_disruption_duration_lookups():
    """Verify all Q14 disruption duration strings and midpoints."""
    mappings = {
        "10 minutes or less": (Decimal("0.167"), CalculationState.VALID),
        "<=10 minutes": (Decimal("0.167"), CalculationState.VALID),
        "11–45 minutes": (Decimal("0.467"), CalculationState.VALID),
        "11-45 minutes": (Decimal("0.467"), CalculationState.VALID),
        "46–90 minutes": (Decimal("1.133"), CalculationState.VALID),
        "46-90 minutes": (Decimal("1.133"), CalculationState.VALID),
        "1.5–4 hours": (Decimal("2.750"), CalculationState.VALID),
        "1.5-4 hours": (Decimal("2.750"), CalculationState.VALID),
        "4–8 hours": (Decimal("6.000"), CalculationState.VALID),
        "4-8 hours": (Decimal("6.000"), CalculationState.VALID),
        "More than 8 hours": (Decimal("10.000"), CalculationState.VALID),
        ">8 hours": (Decimal("10.000"), CalculationState.VALID),
        "Not sure": (None, CalculationState.NOT_MODELED),
        None: (None, CalculationState.NOT_MODELED),
    }

    for input_str, expected in mappings.items():
        val, state = lookup_disruption_duration(input_str)
        assert val == expected[0], f"Failed on duration input: {input_str}"
        assert state == expected[1], f"State mismatch on duration input: {input_str}"
