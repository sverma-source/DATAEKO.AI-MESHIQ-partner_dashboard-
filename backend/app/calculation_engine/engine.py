"""Pure, deterministic calculation engine for IBM MQ Economic Cost & Efficiency Assessment."""

from decimal import Decimal
from typing import Optional
from .constants import (
    ANNUAL_WORKING_HOURS,
    DEFAULT_ANNUAL_LOADED_LABOR_COST,
    ENGINE_VERSION,
    ITIC_DOWNTIME_BENCHMARK_HOURLY,
    QUARTERS_PER_YEAR,
    RULE_SET_VERSION,
    SCENARIO_ADMIN_ADDRESSABLE_SHARE,
    SCENARIO_ADMIN_EFFICIENCY_IMPROVEMENT,
    SCENARIO_INVESTIGATION_IMPROVEMENT,
    SCENARIO_TROUBLESHOOTING_OPPORTUNITY_SHARE,
)
from .enums import CalculationState, DataProvenanceTier
from .lookups import (
    lookup_disruption_duration,
    lookup_investigation_hours,
    lookup_troubleshooting_events,
    normalize_string,
)
from .models import (
    AssessmentInputs,
    CalculationResults,
    MetricResult,
)


class CalculationEngine:
    """Pure, headless computational engine with zero external dependencies."""

    @classmethod
    def calculate(cls, inputs: AssessmentInputs) -> CalculationResults:
        """Execute the deterministic calculation pipeline on provided assessment inputs."""

        # ---------------------------------------------------------------------
        # 1. Loaded Annual Labor Cost & Loaded Hourly Rate
        # ---------------------------------------------------------------------
        if inputs.q20_loaded_annual_labor_cost is not None and inputs.q20_loaded_annual_labor_cost > 0:
            c_labor = inputs.q20_loaded_annual_labor_cost
            c_labor_prov = DataProvenanceTier.CUSTOMER_FACT
            c_labor_state = CalculationState.VALID
        else:
            c_labor = DEFAULT_ANNUAL_LOADED_LABOR_COST
            c_labor_prov = DataProvenanceTier.MODEL_ASSUMPTION
            c_labor_state = CalculationState.VALID_WITH_DEFAULTS

        # Full unrounded Decimal rate: 180,000 / 2,080 = 86.538461538...
        r_hr = c_labor / ANNUAL_WORKING_HOURS

        loaded_labor_metric = MetricResult(
            value=c_labor,
            state=c_labor_state,
            provenance=c_labor_prov,
            formula_code="LOADED_LABOR_COST_ANNUAL",
            rule_version=RULE_SET_VERSION,
            inputs_used={"q20_override": str(inputs.q20_loaded_annual_labor_cost)},
            state_reason=None if c_labor_state == CalculationState.VALID else "Using default $180,000/yr assumption",
        )

        hourly_rate_metric = MetricResult(
            value=r_hr,
            state=c_labor_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT,
            formula_code="R_HR = C_LABOR / 2080",
            rule_version=RULE_SET_VERSION,
            inputs_used={"loaded_annual_labor_cost": str(c_labor), "annual_working_hours": str(ANNUAL_WORKING_HOURS)},
            state_reason=None,
        )

        # ---------------------------------------------------------------------
        # 2. Annual Administration Hours (H_admin)
        # ---------------------------------------------------------------------
        if inputs.q04_quarterly_admin_hours is not None and inputs.q04_quarterly_admin_hours >= 0:
            h_admin = inputs.q04_quarterly_admin_hours * QUARTERS_PER_YEAR
            h_admin_state = CalculationState.VALID
            h_admin_reason = None
        else:
            h_admin = None
            h_admin_state = CalculationState.INSUFFICIENT_DATA
            h_admin_reason = "Quarterly administration hours (Q04) unprovided or unknown"

        admin_hours_metric = MetricResult(
            value=h_admin,
            state=h_admin_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT if h_admin is not None else DataProvenanceTier.CUSTOMER_FACT,
            formula_code="H_ADMIN = Q04_QUARTERLY_HOURS * 4",
            rule_version=RULE_SET_VERSION,
            inputs_used={"q04_quarterly_admin_hours": str(inputs.q04_quarterly_admin_hours)},
            state_reason=h_admin_reason,
        )

        # ---------------------------------------------------------------------
        # 3. Troubleshooting Frequency (N_events) & Effort per Investigation (H_inv)
        # ---------------------------------------------------------------------
        n_events_int, n_events_state = lookup_troubleshooting_events(inputs.q06_troubleshooting_frequency)
        n_events_val = Decimal(str(n_events_int)) if n_events_int is not None else None

        events_metric = MetricResult(
            value=n_events_val,
            state=n_events_state,
            provenance=DataProvenanceTier.MODEL_ASSUMPTION if n_events_val is not None else DataProvenanceTier.CUSTOMER_FACT,
            formula_code="N_EVENTS = LOOKUP(Q06_FREQUENCY)",
            rule_version=RULE_SET_VERSION,
            inputs_used={"q06_frequency_input": inputs.q06_troubleshooting_frequency},
            state_reason=None if n_events_state == CalculationState.VALID else "Troubleshooting frequency unknown or unprovided",
        )

        h_inv, h_inv_state = lookup_investigation_hours(
            inputs.q07_staff_hours_per_investigation,
            inputs.q07_exact_hours,
        )

        h_inv_reason = None
        if h_inv_state == CalculationState.UNMAPPED:
            h_inv_reason = "Selection 'Varies significantly' has no formula midpoint; requires numeric override"
        elif h_inv_state == CalculationState.NOT_MODELED:
            h_inv_reason = "Hours per investigation (Q07) unknown or unprovided"

        inv_hours_metric = MetricResult(
            value=h_inv,
            state=h_inv_state,
            provenance=DataProvenanceTier.CUSTOMER_FACT if inputs.q07_exact_hours is not None else DataProvenanceTier.MODEL_ASSUMPTION,
            formula_code="H_INV = LOOKUP(Q07_STAFF_HOURS)",
            rule_version=RULE_SET_VERSION,
            inputs_used={
                "q07_staff_hours_input": inputs.q07_staff_hours_per_investigation,
                "q07_exact_hours": str(inputs.q07_exact_hours),
            },
            state_reason=h_inv_reason,
        )

        # ---------------------------------------------------------------------
        # 4. Annual Troubleshooting Staff Hours (H_trb)
        # ---------------------------------------------------------------------
        if n_events_val is not None and h_inv is not None:
            h_trb = n_events_val * h_inv
            h_trb_state = CalculationState.VALID
            h_trb_reason = None
        else:
            h_trb = None
            if h_inv_state == CalculationState.UNMAPPED:
                h_trb_state = CalculationState.INSUFFICIENT_DATA
                h_trb_reason = "Investigation hours unmapped ('Varies significantly')"
            elif n_events_state == CalculationState.NOT_MODELED or h_inv_state == CalculationState.NOT_MODELED:
                h_trb_state = CalculationState.NOT_MODELED
                h_trb_reason = "Troubleshooting inputs not modeled"
            else:
                h_trb_state = CalculationState.INSUFFICIENT_DATA
                h_trb_reason = "Troubleshooting inputs missing or invalid"

        trb_hours_metric = MetricResult(
            value=h_trb,
            state=h_trb_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT,
            formula_code="H_TRB = N_EVENTS * H_INV",
            rule_version=RULE_SET_VERSION,
            inputs_used={"n_events": str(n_events_val), "h_inv": str(h_inv)},
            state_reason=h_trb_reason,
        )

        # ---------------------------------------------------------------------
        # 5. Labor Costs: Admin, Troubleshooting, Total Quantified Labor, FTE
        # ---------------------------------------------------------------------
        # C_admin
        if h_admin is not None:
            c_admin = h_admin * r_hr
            c_admin_state = CalculationState.VALID
            c_admin_reason = None
        else:
            c_admin = None
            c_admin_state = CalculationState.INSUFFICIENT_DATA
            c_admin_reason = "Administration hours missing"

        admin_cost_metric = MetricResult(
            value=c_admin,
            state=c_admin_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT,
            formula_code="C_ADMIN = H_ADMIN * R_HR",
            rule_version=RULE_SET_VERSION,
            inputs_used={"h_admin": str(h_admin), "r_hr": str(r_hr)},
            state_reason=c_admin_reason,
        )

        # C_trb
        if h_trb is not None:
            c_trb = h_trb * r_hr
            c_trb_state = CalculationState.VALID
            c_trb_reason = None
        else:
            c_trb = None
            c_trb_state = h_trb_state
            c_trb_reason = h_trb_reason

        trb_cost_metric = MetricResult(
            value=c_trb,
            state=c_trb_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT,
            formula_code="C_TRB = H_TRB * R_HR",
            rule_version=RULE_SET_VERSION,
            inputs_used={"h_trb": str(h_trb), "r_hr": str(r_hr)},
            state_reason=c_trb_reason,
        )

        # C_total
        if h_admin is not None and h_trb is not None:
            c_total = c_admin + c_trb
            c_total_state = CalculationState.VALID
            c_total_reason = None
        else:
            c_total = None
            c_total_state = CalculationState.INSUFFICIENT_DATA
            c_total_reason = "Requires both admin and troubleshooting hours to compute total labor"

        total_labor_metric = MetricResult(
            value=c_total,
            state=c_total_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT,
            formula_code="C_TOTAL = C_ADMIN + C_TRB",
            rule_version=RULE_SET_VERSION,
            inputs_used={"c_admin": str(c_admin), "c_trb": str(c_trb)},
            state_reason=c_total_reason,
        )

        # Operational FTE Burden
        if h_admin is not None and h_trb is not None:
            total_hours = h_admin + h_trb
            fte = total_hours / ANNUAL_WORKING_HOURS
            fte_state = CalculationState.VALID
            fte_reason = None
        else:
            fte = None
            fte_state = CalculationState.INSUFFICIENT_DATA
            fte_reason = "Total hours incomplete"

        fte_metric = MetricResult(
            value=fte,
            state=fte_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT,
            formula_code="FTE = (H_ADMIN + H_TRB) / 2080",
            rule_version=RULE_SET_VERSION,
            inputs_used={"h_admin": str(h_admin), "h_trb": str(h_trb), "annual_working_hours": str(ANNUAL_WORKING_HOURS)},
            state_reason=fte_reason,
        )

        # ---------------------------------------------------------------------
        # 6. Disruption & Single-Event Financial Exposure
        # ---------------------------------------------------------------------
        d_hours, d_hours_state = lookup_disruption_duration(inputs.q14_disruption_duration)

        duration_metric = MetricResult(
            value=d_hours,
            state=d_hours_state,
            provenance=DataProvenanceTier.MODEL_ASSUMPTION if d_hours is not None else DataProvenanceTier.CUSTOMER_FACT,
            formula_code="D_HOURS = LOOKUP(Q14_DURATION)",
            rule_version=RULE_SET_VERSION,
            inputs_used={"q14_duration_input": inputs.q14_disruption_duration},
            state_reason=None if d_hours_state == CalculationState.VALID else "Disruption duration unknown or unprovided",
        )

        # Applicable Financial Rate ($/hr) Hierarchy
        norm_severity = normalize_string(inputs.q12_business_impact_severity)

        if inputs.q15_hourly_downtime_cost is not None and inputs.q15_hourly_downtime_cost > 0:
            r_impact = inputs.q15_hourly_downtime_cost
            r_impact_prov = DataProvenanceTier.CUSTOMER_FACT
            r_impact_state = CalculationState.VALID
            r_impact_reason = None
        else:
            # Fallback to ITIC Benchmark only if Q12 is Significant or Critical
            is_significant_or_critical = norm_severity in (
                "critical (immediate customer/revenue halt)",
                "critical",
                "significant (severe degradation/slas breached)",
                "significant",
            )
            if is_significant_or_critical:
                r_impact = ITIC_DOWNTIME_BENCHMARK_HOURLY
                r_impact_prov = DataProvenanceTier.INDUSTRY_BENCHMARK
                r_impact_state = CalculationState.VALID_WITH_DEFAULTS
                r_impact_reason = "Using ITIC $300,000/hr benchmark for Critical/Significant impact"
            else:
                r_impact = None
                r_impact_prov = DataProvenanceTier.MODEL_ASSUMPTION
                r_impact_state = CalculationState.NOT_MODELED
                r_impact_reason = "Financial downtime rate not modeled for non-critical/unprovided impact"

        rate_impact_metric = MetricResult(
            value=r_impact,
            state=r_impact_state,
            provenance=r_impact_prov,
            formula_code="R_IMPACT = Q15_OVERRIDE OR (ITIC_300K IF Q12 IN {CRITICAL, SIGNIFICANT})",
            rule_version=RULE_SET_VERSION,
            inputs_used={
                "q15_hourly_cost": str(inputs.q15_hourly_downtime_cost),
                "q12_severity": inputs.q12_business_impact_severity,
            },
            state_reason=r_impact_reason,
        )

        # Potential Single-Event Financial Exposure
        if d_hours is not None and r_impact is not None:
            exposure = d_hours * r_impact
            exposure_state = CalculationState.VALID
            exposure_reason = None
        else:
            exposure = None
            if r_impact_state == CalculationState.NOT_MODELED or d_hours_state == CalculationState.NOT_MODELED:
                exposure_state = CalculationState.NOT_MODELED
                exposure_reason = "Disruption exposure not modeled"
            else:
                exposure_state = CalculationState.INSUFFICIENT_DATA
                exposure_reason = "Disruption duration or financial rate missing"

        exposure_metric = MetricResult(
            value=exposure,
            state=exposure_state,
            provenance=DataProvenanceTier.CALCULATED_RESULT,
            formula_code="EXPOSURE_SINGLE = D_HOURS * R_IMPACT",
            rule_version=RULE_SET_VERSION,
            inputs_used={"d_hours": str(d_hours), "r_impact": str(r_impact)},
            state_reason=exposure_reason,
        )

        # ---------------------------------------------------------------------
        # 7. Decomposed meshIQ Improvement Scenario
        # ---------------------------------------------------------------------
        # Admin hours recovered: H_admin * 50% * 50% = H_admin * 0.25
        if h_admin is not None:
            rec_admin = h_admin * SCENARIO_ADMIN_ADDRESSABLE_SHARE * SCENARIO_ADMIN_EFFICIENCY_IMPROVEMENT
            rec_admin_state = CalculationState.VALID
            rec_admin_reason = None
        else:
            rec_admin = None
            rec_admin_state = CalculationState.INSUFFICIENT_DATA
            rec_admin_reason = "Admin hours missing"

        rec_admin_metric = MetricResult(
            value=rec_admin,
            state=rec_admin_state,
            provenance=DataProvenanceTier.ILLUSTRATIVE_SCENARIO,
            formula_code="H_REC_ADMIN = H_ADMIN * 0.50_ADDRESSABLE * 0.50_EFFICIENCY",
            rule_version=RULE_SET_VERSION,
            inputs_used={
                "h_admin": str(h_admin),
                "addressable_share": str(SCENARIO_ADMIN_ADDRESSABLE_SHARE),
                "admin_efficiency": str(SCENARIO_ADMIN_EFFICIENCY_IMPROVEMENT),
            },
            state_reason=rec_admin_reason,
        )

        # Investigation hours recovered: H_trb * 25%
        if h_trb is not None:
            rec_inv = h_trb * SCENARIO_INVESTIGATION_IMPROVEMENT
            rec_inv_state = CalculationState.VALID
            rec_inv_reason = None
        else:
            rec_inv = None
            rec_inv_state = h_trb_state
            rec_inv_reason = h_trb_reason

        rec_inv_metric = MetricResult(
            value=rec_inv,
            state=rec_inv_state,
            provenance=DataProvenanceTier.ILLUSTRATIVE_SCENARIO,
            formula_code="H_REC_INV = H_TRB * 0.25_INVESTIGATION_IMP",
            rule_version=RULE_SET_VERSION,
            inputs_used={
                "h_trb": str(h_trb),
                "investigation_improvement": str(SCENARIO_INVESTIGATION_IMPROVEMENT),
            },
            state_reason=rec_inv_reason,
        )

        # Total hours recovered
        if rec_admin is not None and rec_inv is not None:
            rec_total = rec_admin + rec_inv
            rec_total_state = CalculationState.VALID
            rec_total_reason = None
        else:
            rec_total = None
            rec_total_state = CalculationState.INSUFFICIENT_DATA
            rec_total_reason = "Incomplete admin or investigation recovery metrics"

        rec_total_metric = MetricResult(
            value=rec_total,
            state=rec_total_state,
            provenance=DataProvenanceTier.ILLUSTRATIVE_SCENARIO,
            formula_code="H_REC_TOTAL = H_REC_ADMIN + H_REC_INV",
            rule_version=RULE_SET_VERSION,
            inputs_used={"rec_admin": str(rec_admin), "rec_inv": str(rec_inv)},
            state_reason=rec_total_reason,
        )

        # Illustrative Economic Value ($)
        if rec_total is not None:
            val_illustrative = rec_total * r_hr
            val_illustrative_state = CalculationState.VALID
            val_illustrative_reason = None
        else:
            val_illustrative = None
            val_illustrative_state = CalculationState.INSUFFICIENT_DATA
            val_illustrative_reason = "Total recovered hours incomplete"

        illustrative_val_metric = MetricResult(
            value=val_illustrative,
            state=val_illustrative_state,
            provenance=DataProvenanceTier.ILLUSTRATIVE_SCENARIO,
            formula_code="V_ILLUSTRATIVE = H_REC_TOTAL * R_HR",
            rule_version=RULE_SET_VERSION,
            inputs_used={"rec_total": str(rec_total), "r_hr": str(r_hr)},
            state_reason=val_illustrative_reason,
        )

        # ---------------------------------------------------------------------
        # 8. Distinct 10% Troubleshooting Productivity Opportunity
        # ---------------------------------------------------------------------
        if c_trb is not None:
            opp_trb = c_trb * SCENARIO_TROUBLESHOOTING_OPPORTUNITY_SHARE
            opp_trb_state = CalculationState.VALID
            opp_trb_reason = None
        else:
            opp_trb = None
            opp_trb_state = c_trb_state
            opp_trb_reason = c_trb_reason

        trb_opp_metric = MetricResult(
            value=opp_trb,
            state=opp_trb_state,
            provenance=DataProvenanceTier.ILLUSTRATIVE_SCENARIO,
            formula_code="OPP_TRB = C_TRB * 0.10",
            rule_version=RULE_SET_VERSION,
            inputs_used={"c_trb": str(c_trb), "opportunity_share": str(SCENARIO_TROUBLESHOOTING_OPPORTUNITY_SHARE)},
            state_reason=opp_trb_reason,
        )

        # ---------------------------------------------------------------------
        # 9. Contextual Customer Reported Spend (Q21)
        # ---------------------------------------------------------------------
        if inputs.q21_customer_reported_spend is not None and inputs.q21_customer_reported_spend >= 0:
            spend_val = inputs.q21_customer_reported_spend
            spend_state = CalculationState.VALID
            spend_reason = None
        else:
            spend_val = None
            spend_state = CalculationState.NOT_MODELED
            spend_reason = "Customer annual spend (Q21) unprovided"

        spend_metric = MetricResult(
            value=spend_val,
            state=spend_state,
            provenance=DataProvenanceTier.CUSTOMER_FACT,
            formula_code="CUSTOMER_REPORTED_ANNUAL_SPEND",
            rule_version=RULE_SET_VERSION,
            inputs_used={"q21_spend": str(inputs.q21_customer_reported_spend)},
            state_reason=spend_reason,
        )

        # ---------------------------------------------------------------------
        # 10. Package & Return Final Results DTO
        # ---------------------------------------------------------------------
        return CalculationResults(
            annual_admin_hours=admin_hours_metric,
            annual_troubleshooting_events=events_metric,
            staff_hours_per_investigation=inv_hours_metric,
            annual_troubleshooting_hours=trb_hours_metric,
            loaded_annual_labor_cost=loaded_labor_metric,
            loaded_hourly_rate=hourly_rate_metric,
            annual_admin_labor_cost=admin_cost_metric,
            annual_troubleshooting_labor_cost=trb_cost_metric,
            total_quantified_labor_cost=total_labor_metric,
            operational_fte_burden=fte_metric,
            representative_duration_hours=duration_metric,
            applicable_financial_rate=rate_impact_metric,
            potential_financial_exposure=exposure_metric,
            recovered_admin_hours=rec_admin_metric,
            recovered_investigation_hours=rec_inv_metric,
            total_recovered_hours=rec_total_metric,
            illustrative_economic_value=illustrative_val_metric,
            troubleshooting_productivity_opportunity=trb_opp_metric,
            customer_reported_annual_spend=spend_metric,
            engine_version=ENGINE_VERSION,
            rule_set_version=RULE_SET_VERSION,
            execution_status="SUCCESS",
        )
