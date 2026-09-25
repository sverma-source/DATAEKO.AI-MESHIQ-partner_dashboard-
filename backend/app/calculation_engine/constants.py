"""Authoritative constants for the IBM MQ Economic Cost & Efficiency Assessment."""

from decimal import Decimal

# Standard working hours per FTE per year (52 weeks * 40 hours/week)
ANNUAL_WORKING_HOURS: Decimal = Decimal("2080")

# Quarters per year multiplier for routine administration hours
QUARTERS_PER_YEAR: Decimal = Decimal("4")

# Default loaded annual labor cost per middleware/MQ engineer ($/year)
DEFAULT_ANNUAL_LOADED_LABOR_COST: Decimal = Decimal("180000")

# ITIC critical system downtime benchmark rate ($/hour)
ITIC_DOWNTIME_BENCHMARK_HOURLY: Decimal = Decimal("300000")

# Improvement Scenario Multipliers (Decomposed Model)
SCENARIO_ADMIN_ADDRESSABLE_SHARE: Decimal = Decimal("0.50")
SCENARIO_ADMIN_EFFICIENCY_IMPROVEMENT: Decimal = Decimal("0.50")
SCENARIO_INVESTIGATION_IMPROVEMENT: Decimal = Decimal("0.25")
SCENARIO_TROUBLESHOOTING_OPPORTUNITY_SHARE: Decimal = Decimal("0.10")

# Engine Version
ENGINE_VERSION: str = "1.0.0"
RULE_SET_VERSION: str = "calc-rules-v1.0.0"
