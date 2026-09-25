"""Authoritative lookup dictionaries and normalization helpers for calculation engine."""

from decimal import Decimal
from typing import Optional, Tuple
from .enums import CalculationState

# Q06: Troubleshooting & Event Frequency -> Annual Event Multiplier
FREQUENCY_LOOKUP = {
    "multiple times per week": 104,
    "about weekly": 52,
    "multiple times per month": 30,
    "about monthly": 12,
    "about quarterly": 4,
    "less than quarterly": 2,
    "rarely or never": 0,
}

# Q07: Staff Hours Expended Per Investigation -> Representative Hours
INVESTIGATION_HOURS_LOOKUP = {
    "less than 1 hour": Decimal("0.5"),
    "<1 hour": Decimal("0.5"),
    "1–2 hours": Decimal("1.5"),
    "1-2 hours": Decimal("1.5"),
    "3–5 hours": Decimal("4.0"),
    "3-5 hours": Decimal("4.0"),
    "6–10 hours": Decimal("8.0"),
    "6-10 hours": Decimal("8.0"),
    "11–20 hours": Decimal("15.5"),
    "11-20 hours": Decimal("15.5"),
    "more than 20 hours": Decimal("24.0"),
    ">20 hours": Decimal("24.0"),
}

# Q14: Representative Disruption Duration -> Decimal Hours
DISRUPTION_DURATION_LOOKUP = {
    "10 minutes or less": Decimal("0.167"),
    "<=10 minutes": Decimal("0.167"),
    "11–45 minutes": Decimal("0.467"),
    "11-45 minutes": Decimal("0.467"),
    "46–90 minutes": Decimal("1.133"),
    "46-90 minutes": Decimal("1.133"),
    "1.5–4 hours": Decimal("2.750"),
    "1.5-4 hours": Decimal("2.750"),
    "4–8 hours": Decimal("6.000"),
    "4-8 hours": Decimal("6.000"),
    "more than 8 hours": Decimal("10.000"),
    ">8 hours": Decimal("10.000"),
}


def normalize_string(val: Optional[str]) -> Optional[str]:
    """Normalize input string by trimming and lowercasing."""
    if val is None:
        return None
    cleaned = val.strip().lower()
    return cleaned if cleaned else None


def lookup_troubleshooting_events(freq_str: Optional[str]) -> Tuple[Optional[int], CalculationState]:
    """Lookup annual troubleshooting event count from Q06."""
    norm = normalize_string(freq_str)
    if not norm or norm in ("not sure", "unknown", "none", "null"):
        return None, CalculationState.NOT_MODELED
    if norm in FREQUENCY_LOOKUP:
        return FREQUENCY_LOOKUP[norm], CalculationState.VALID
    return None, CalculationState.INSUFFICIENT_DATA


def lookup_investigation_hours(hours_input: Optional[str], numeric_override: Optional[Decimal] = None) -> Tuple[Optional[Decimal], CalculationState]:
    """Lookup staff hours per investigation from Q07."""
    if numeric_override is not None:
        if numeric_override >= 0:
            return numeric_override, CalculationState.VALID
        return None, CalculationState.CANNOT_CALCULATE

    norm = normalize_string(hours_input)
    if not norm or norm in ("not sure", "unknown", "none", "null"):
        return None, CalculationState.NOT_MODELED
    if norm == "varies significantly":
        return None, CalculationState.UNMAPPED
    if norm in INVESTIGATION_HOURS_LOOKUP:
        return INVESTIGATION_HOURS_LOOKUP[norm], CalculationState.VALID
    return None, CalculationState.INSUFFICIENT_DATA


def lookup_disruption_duration(duration_str: Optional[str]) -> Tuple[Optional[Decimal], CalculationState]:
    """Lookup representative disruption duration in hours from Q14."""
    norm = normalize_string(duration_str)
    if not norm or norm in ("not sure", "unknown", "none", "null"):
        return None, CalculationState.NOT_MODELED
    if norm in DISRUPTION_DURATION_LOOKUP:
        return DISRUPTION_DURATION_LOOKUP[norm], CalculationState.VALID
    return None, CalculationState.INSUFFICIENT_DATA
