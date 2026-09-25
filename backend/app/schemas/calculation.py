from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from pydantic import Field
from app.schemas.common import BaseSchema, TimestampedSchema


class MetricResultSchema(BaseSchema):
    value: Optional[Decimal] = None
    state: str
    provenance: str
    formula_code: Optional[str] = None
    rule_version: str
    inputs_used: Dict[str, Any] = Field(default_factory=dict)
    state_reason: Optional[str] = None


class SummaryMetricsSchema(BaseSchema):
    admin_annual_hours: Optional[Decimal] = None
    admin_annual_cost: Optional[Decimal] = None
    troubleshooting_annual_hours: Optional[Decimal] = None
    troubleshooting_annual_cost: Optional[Decimal] = None
    total_operational_labor_cost: Optional[Decimal] = None
    operational_fte_burden: Optional[Decimal] = None
    representative_single_event_exposure: Optional[Decimal] = None
    total_recoverable_labor_hours: Optional[Decimal] = None
    illustrative_annual_labor_savings: Optional[Decimal] = None
    troubleshooting_productivity_opportunity: Optional[Decimal] = None


class CalculationSnapshotRead(TimestampedSchema):
    id: str
    assessment_id: str
    tenant_id: str
    calculation_engine_version: str
    assessment_version: str
    calculated_at: datetime
    normalized_inputs: Dict[str, Any]
    computed_metrics: Dict[str, Any]
    summary_metrics: Dict[str, Any]
    assumptions_used: Dict[str, Any]
    benchmarks_used: Dict[str, Any]
    provenance_summary: Dict[str, Any]


class CalculationRunResponse(BaseSchema):
    snapshot_id: str
    assessment_id: str
    calculation_engine_version: str
    assessment_version: str
    calculated_at: datetime
    summary: SummaryMetricsSchema
    computed_metrics: Dict[str, MetricResultSchema]
    assumptions_used: Dict[str, Any]
    benchmarks_used: Dict[str, Any]
    provenance_summary: Dict[str, Any]
