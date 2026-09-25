from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.calculation_engine import (
    AssessmentInputs,
    CalculationResults,
    calculate_assessment,
)
from app.config import settings
from app.core.errors import EntityNotFoundError
from app.models.assessment import Assessment, AssessmentStatus
from app.models.calculation_snapshot import CalculationSnapshot
from app.schemas.calculation import (
    CalculationRunResponse,
    CalculationSnapshotRead,
    MetricResultSchema,
    SummaryMetricsSchema,
)


def _serialize_decimal(obj: Any) -> Any:
    """Helper to ensure all Decimals are converted to strings/floats for JSON storage."""
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _serialize_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_decimal(v) for v in obj]
    return obj


class CalculationService:
    @staticmethod
    def _map_response_to_inputs(assessment: Assessment) -> AssessmentInputs:
        """
        Maps stored AssessmentResponse database model to pure in-memory AssessmentInputs DTO.
        Preserves original strings, explicit overrides, and null states.
        """
        resp = assessment.response
        if not resp:
            return AssessmentInputs()

        return AssessmentInputs(
            q04_quarterly_admin_hours=resp.q04_weekly_admin_hours,
            q06_troubleshooting_frequency=resp.q06_frequency_text,
            q07_staff_hours_per_investigation=resp.q07_labor_hours_text,
            q07_exact_hours=resp.q07_labor_hours_override,
            q08_elapsed_investigation_duration=resp.q08_duration_text,
            q11_productivity_constraint=resp.q11_monitoring_status,
            q12_business_impact_severity=resp.q12_business_impact,
            q14_disruption_duration=resp.q14_duration_text,
            q15_hourly_downtime_cost=resp.q15_hourly_cost_override,
            q18_cybersecurity_pressure=resp.q18_audit_effort,
            q19_remediation_friction=resp.q19_documentation_effort,
            q20_loaded_annual_labor_cost=resp.q20_annual_labor_rate,
            q21_customer_reported_spend=resp.q21_annual_mq_spend,
        )

    @staticmethod
    async def run_calculation(
        db: AsyncSession, tenant_id: str, assessment_id: str
    ) -> CalculationRunResponse:
        """
        Orchestrates assessment calculation using the single source of calculation truth:
        the Phase 3 calculation engine. Persists an immutable CalculationSnapshot.
        """
        stmt = (
            select(Assessment)
            .where(Assessment.id == assessment_id, Assessment.tenant_id == tenant_id)
            .options(
                selectinload(Assessment.customer),
                selectinload(Assessment.response),
            )
        )
        res = await db.execute(stmt)
        assessment = res.scalar_one_or_none()
        if not assessment:
            raise EntityNotFoundError("Assessment", assessment_id)

        # 1. Map responses to calculation inputs
        inputs = CalculationService._map_response_to_inputs(assessment)

        # 2. Execute calculation engine (PURE SINGLE SOURCE OF TRUTH)
        calc_results: CalculationResults = calculate_assessment(inputs)

        # 3. Format serialized representations for immutable snapshot storage
        normalized_inputs_dict = {
            "q04_quarterly_admin_hours": _serialize_decimal(inputs.q04_quarterly_admin_hours),
            "q06_troubleshooting_frequency": inputs.q06_troubleshooting_frequency,
            "q07_staff_hours_per_investigation": inputs.q07_staff_hours_per_investigation,
            "q07_exact_hours": _serialize_decimal(inputs.q07_exact_hours),
            "q08_elapsed_investigation_duration": inputs.q08_elapsed_investigation_duration,
            "q11_productivity_constraint": inputs.q11_productivity_constraint,
            "q12_business_impact_severity": inputs.q12_business_impact_severity,
            "q14_disruption_duration": inputs.q14_disruption_duration,
            "q15_hourly_downtime_cost": _serialize_decimal(inputs.q15_hourly_downtime_cost),
            "q18_cybersecurity_pressure": inputs.q18_cybersecurity_pressure,
            "q19_remediation_friction": inputs.q19_remediation_friction,
            "q20_loaded_annual_labor_cost": _serialize_decimal(inputs.q20_loaded_annual_labor_cost),
            "q21_customer_reported_spend": _serialize_decimal(inputs.q21_customer_reported_spend),
        }

        # Extract metric results map
        metrics_map = {
            "annual_admin_hours": calc_results.annual_admin_hours,
            "annual_troubleshooting_events": calc_results.annual_troubleshooting_events,
            "staff_hours_per_investigation": calc_results.staff_hours_per_investigation,
            "annual_troubleshooting_hours": calc_results.annual_troubleshooting_hours,
            "loaded_annual_labor_cost": calc_results.loaded_annual_labor_cost,
            "loaded_hourly_rate": calc_results.loaded_hourly_rate,
            "annual_admin_labor_cost": calc_results.annual_admin_labor_cost,
            "annual_troubleshooting_labor_cost": calc_results.annual_troubleshooting_labor_cost,
            "total_quantified_labor_cost": calc_results.total_quantified_labor_cost,
            "operational_fte_burden": calc_results.operational_fte_burden,
            "representative_duration_hours": calc_results.representative_duration_hours,
            "applicable_financial_rate": calc_results.applicable_financial_rate,
            "potential_financial_exposure": calc_results.potential_financial_exposure,
            "recovered_admin_hours": calc_results.recovered_admin_hours,
            "recovered_investigation_hours": calc_results.recovered_investigation_hours,
            "total_recovered_hours": calc_results.total_recovered_hours,
            "illustrative_economic_value": calc_results.illustrative_economic_value,
            "troubleshooting_productivity_opportunity": calc_results.troubleshooting_productivity_opportunity,
            "customer_reported_annual_spend": calc_results.customer_reported_annual_spend,
        }

        computed_metrics_dict = {}
        for metric_name, metric_obj in metrics_map.items():
            computed_metrics_dict[metric_name] = {
                "value": _serialize_decimal(metric_obj.value),
                "state": metric_obj.state.value,
                "provenance": metric_obj.provenance.value,
                "formula_code": metric_obj.formula_code,
                "rule_version": metric_obj.rule_version,
                "inputs_used": _serialize_decimal(metric_obj.inputs_used),
                "state_reason": metric_obj.state_reason,
            }

        summary_metrics_dict = {
            "admin_annual_hours": _serialize_decimal(calc_results.annual_admin_hours.value),
            "admin_annual_cost": _serialize_decimal(calc_results.annual_admin_labor_cost.value),
            "troubleshooting_annual_hours": _serialize_decimal(calc_results.annual_troubleshooting_hours.value),
            "troubleshooting_annual_cost": _serialize_decimal(calc_results.annual_troubleshooting_labor_cost.value),
            "total_operational_labor_cost": _serialize_decimal(calc_results.total_quantified_labor_cost.value),
            "operational_fte_burden": _serialize_decimal(calc_results.operational_fte_burden.value),
            "representative_single_event_exposure": _serialize_decimal(calc_results.potential_financial_exposure.value),
            "total_recoverable_labor_hours": _serialize_decimal(calc_results.total_recovered_hours.value),
            "illustrative_annual_labor_savings": _serialize_decimal(calc_results.illustrative_economic_value.value),
            "troubleshooting_productivity_opportunity": _serialize_decimal(calc_results.troubleshooting_productivity_opportunity.value),
        }

        assumptions_dict = {
            "annual_working_hours": 2080,
            "default_annual_loaded_labor_cost": "180000.00",
            "scenario_admin_addressable_share": "0.50",
            "scenario_admin_efficiency_improvement": "0.50",
            "scenario_investigation_improvement": "0.25",
            "scenario_troubleshooting_opportunity_share": "0.10",
        }

        benchmarks_dict = {
            "itic_hourly_downtime_benchmark": "300000.00",
        }

        provenance_summary_dict = {
            metric_name: metric_obj.provenance.value
            for metric_name, metric_obj in metrics_map.items()
        }

        # 4. Create and persist calculation snapshot
        calculated_at = datetime.now(timezone.utc)
        snapshot = CalculationSnapshot(
            assessment_id=assessment_id,
            tenant_id=tenant_id,
            calculation_engine_version=calc_results.engine_version,
            assessment_version=assessment.assessment_version,
            calculated_at=calculated_at,
            normalized_inputs=normalized_inputs_dict,
            computed_metrics=computed_metrics_dict,
            summary_metrics=summary_metrics_dict,
            assumptions_used=assumptions_dict,
            benchmarks_used=benchmarks_dict,
            provenance_summary=provenance_summary_dict,
        )
        db.add(snapshot)

        # 5. Update assessment status
        assessment.status = AssessmentStatus.CALCULATED

        await db.commit()
        await db.refresh(snapshot)

        # 6. Build typed response
        summary_schema = SummaryMetricsSchema(
            admin_annual_hours=calc_results.annual_admin_hours.value,
            admin_annual_cost=calc_results.annual_admin_labor_cost.value,
            troubleshooting_annual_hours=calc_results.annual_troubleshooting_hours.value,
            troubleshooting_annual_cost=calc_results.annual_troubleshooting_labor_cost.value,
            total_operational_labor_cost=calc_results.total_quantified_labor_cost.value,
            operational_fte_burden=calc_results.operational_fte_burden.value,
            representative_single_event_exposure=calc_results.potential_financial_exposure.value,
            total_recoverable_labor_hours=calc_results.total_recovered_hours.value,
            illustrative_annual_labor_savings=calc_results.illustrative_economic_value.value,
            troubleshooting_productivity_opportunity=calc_results.troubleshooting_productivity_opportunity.value,
        )

        typed_metrics = {
            k: MetricResultSchema(
                value=v.value,
                state=v.state.value,
                provenance=v.provenance.value,
                formula_code=v.formula_code,
                rule_version=v.rule_version,
                inputs_used=v.inputs_used,
                state_reason=v.state_reason,
            )
            for k, v in metrics_map.items()
        }

        return CalculationRunResponse(
            snapshot_id=snapshot.id,
            assessment_id=assessment.id,
            calculation_engine_version=snapshot.calculation_engine_version,
            assessment_version=snapshot.assessment_version,
            calculated_at=snapshot.calculated_at,
            summary=summary_schema,
            computed_metrics=typed_metrics,
            assumptions_used=assumptions_dict,
            benchmarks_used=benchmarks_dict,
            provenance_summary=provenance_summary_dict,
        )

    @staticmethod
    async def get_latest_snapshot(
        db: AsyncSession, tenant_id: str, assessment_id: str
    ) -> CalculationSnapshot:
        stmt = (
            select(CalculationSnapshot)
            .where(
                CalculationSnapshot.assessment_id == assessment_id,
                CalculationSnapshot.tenant_id == tenant_id,
            )
            .order_by(CalculationSnapshot.created_at.desc())
            .limit(1)
        )
        res = await db.execute(stmt)
        snapshot = res.scalar_one_or_none()
        if not snapshot:
            raise EntityNotFoundError("CalculationSnapshot", f"for assessment {assessment_id}")
        return snapshot

    @staticmethod
    async def list_snapshots(
        db: AsyncSession, tenant_id: str, assessment_id: str
    ) -> List[CalculationSnapshot]:
        stmt = (
            select(CalculationSnapshot)
            .where(
                CalculationSnapshot.assessment_id == assessment_id,
                CalculationSnapshot.tenant_id == tenant_id,
            )
            .order_by(CalculationSnapshot.created_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())
