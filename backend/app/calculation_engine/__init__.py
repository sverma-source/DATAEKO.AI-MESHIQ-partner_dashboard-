"""DATAEKO × meshIQ Calculation Engine Package.

Pure, headless, deterministic computational engine for the IBM MQ
Economic Cost & Efficiency Assessment platform.
"""

from .constants import (
    ANNUAL_WORKING_HOURS,
    DEFAULT_ANNUAL_LOADED_LABOR_COST,
    ITIC_DOWNTIME_BENCHMARK_HOURLY,
    SCENARIO_ADMIN_ADDRESSABLE_SHARE,
    SCENARIO_ADMIN_EFFICIENCY_IMPROVEMENT,
    SCENARIO_INVESTIGATION_IMPROVEMENT,
    SCENARIO_TROUBLESHOOTING_OPPORTUNITY_SHARE,
)
from .engine import CalculationEngine
from .enums import CalculationState, DataProvenanceTier
from .models import (
    AssessmentInputs,
    CalculationResults,
    MetricResult,
)

calculate_assessment = CalculationEngine.calculate

__all__ = [
    "CalculationEngine",
    "calculate_assessment",
    "AssessmentInputs",
    "CalculationResults",
    "MetricResult",
    "CalculationState",
    "DataProvenanceTier",
    "ANNUAL_WORKING_HOURS",
    "DEFAULT_ANNUAL_LOADED_LABOR_COST",
    "ITIC_DOWNTIME_BENCHMARK_HOURLY",
    "SCENARIO_ADMIN_ADDRESSABLE_SHARE",
    "SCENARIO_ADMIN_EFFICIENCY_IMPROVEMENT",
    "SCENARIO_INVESTIGATION_IMPROVEMENT",
    "SCENARIO_TROUBLESHOOTING_OPPORTUNITY_SHARE",
]
