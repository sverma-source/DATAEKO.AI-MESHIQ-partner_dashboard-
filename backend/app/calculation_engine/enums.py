"""Enumerations and data classification standards for the calculation engine."""

from enum import Enum


class CalculationState(str, Enum):
    """Evaluation state of a calculation metric."""

    VALID = "VALID"
    VALID_WITH_DEFAULTS = "VALID_WITH_DEFAULTS"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    NOT_MODELED = "NOT_MODELED"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    CANNOT_CALCULATE = "CANNOT_CALCULATE"
    UNMAPPED = "UNMAPPED"


class DataProvenanceTier(str, Enum):
    """6-tier data classification standard."""

    CUSTOMER_FACT = "CUSTOMER_FACT"
    MODEL_ASSUMPTION = "MODEL_ASSUMPTION"
    INDUSTRY_BENCHMARK = "INDUSTRY_BENCHMARK"
    CALCULATED_RESULT = "CALCULATED_RESULT"
    ILLUSTRATIVE_SCENARIO = "ILLUSTRATIVE_SCENARIO"
    DEMO_VALUE = "DEMO_VALUE"
