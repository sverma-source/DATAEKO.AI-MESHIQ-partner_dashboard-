"use client";

import React, { useMemo } from "react";
import {
  FileText,
  ShieldAlert,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Info,
  Layers,
  ShieldCheck,
  Building2,
  ArrowRight,
} from "lucide-react";
import { CalculationRunResponse, MetricResult } from "../types/assessment";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { MathTargetMetricKey } from "./ShowTheMathDrawer";

interface ExecutiveEconomicNarrativeProps {
  calculation: CalculationRunResponse;
  onShowMath?: (target: MathTargetMetricKey) => void;
  isAuthorizedForMath?: boolean;
  customerName?: string;
}

export const ExecutiveEconomicNarrative: React.FC<ExecutiveEconomicNarrativeProps> = ({
  calculation,
  onShowMath,
  isAuthorizedForMath = false,
  customerName = "Enterprise Client",
}) => {
  const summary = calculation.summary;
  const metrics = calculation.computed_metrics || {};
  const assumptions = calculation.assumptions_used || {};

  // Formatters
  const formatCurrency = (val?: number | string | null) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const formatNumber = (val?: number | string | null, decimals = 1) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "—";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: decimals,
    }).format(Number(val));
  };

  // 1. Economic Burden Metrics
  const totalLaborMetric = metrics.total_quantified_labor_cost;
  const adminLaborMetric = metrics.annual_admin_labor_cost;
  const trbLaborMetric = metrics.annual_troubleshooting_labor_cost;
  const fteMetric = metrics.operational_fte_burden;
  const loadedRateMetric = metrics.loaded_hourly_rate || metrics.internal_loaded_hourly_rate;

  const laborCostValue = totalLaborMetric?.value ?? summary.total_operational_labor_cost ?? null;
  const fteValue = fteMetric?.value ?? summary.operational_fte_burden ?? null;
  const rateValue = loadedRateMetric?.value ? Number(loadedRateMetric.value) : 86.53846153846154;

  // 2. Financial Exposure Metrics
  const exposureMetric = metrics.potential_financial_exposure || metrics.representative_single_event_exposure;
  const durationMetric = metrics.representative_duration_hours;
  const rateImpactMetric = metrics.applicable_financial_rate;

  const exposureValue = exposureMetric?.value ?? summary.representative_single_event_exposure ?? null;
  const durationValue = durationMetric?.value ?? null;
  const rateImpactValue = rateImpactMetric?.value ?? null;

  // 3. Recoverable Opportunity Metrics
  const totalRecHoursMetric = metrics.total_recovered_hours;
  const recAdminMetric = metrics.recovered_admin_hours;
  const recInvMetric = metrics.recovered_investigation_hours;
  const illustrativeValMetric = metrics.illustrative_economic_value;
  const trbOppMetric = metrics.troubleshooting_productivity_opportunity;

  const totalRecHoursValue = totalRecHoursMetric?.value ?? summary.total_recoverable_labor_hours ?? null;
  const illustrativeValValue = illustrativeValMetric?.value ?? summary.illustrative_annual_labor_savings ?? null;
  const trbOppValue = trbOppMetric?.value ?? summary.troubleshooting_productivity_opportunity ?? null;

  // 4. Data Completeness Categorization
  const completenessSummary = useMemo(() => {
    const modeled: { label: string; metricKey: string; value: string; provenance: string }[] = [];
    const incomplete: { label: string; metricKey: string; reason: string }[] = [];
    const notModeled: { label: string; metricKey: string; reason: string }[] = [];

    // Helper to evaluate a metric
    const evaluate = (
      label: string,
      metricKey: string,
      metric?: MetricResult,
      fallbackVal?: number | string | null,
      unit = ""
    ) => {
      const state = metric?.state;
      const val = metric?.value ?? fallbackVal;
      const prov = metric?.provenance || "CALCULATED_RESULT";
      const reason = metric?.state_reason || "Required assessment inputs unprovided";

      if (state === "VALID" || state === "VALID_WITH_DEFAULTS") {
        modeled.push({
          label,
          metricKey,
          value: typeof val === "number" || (!isNaN(Number(val)) && val !== null)
            ? `${unit.includes("FTE") || unit.includes("hrs") ? formatNumber(val) : formatCurrency(val)} ${unit}`.trim()
            : "Active",
          provenance: prov,
        });
      } else if (state === "INSUFFICIENT_DATA") {
        incomplete.push({
          label,
          metricKey,
          reason,
        });
      } else if (state === "NOT_MODELED") {
        notModeled.push({
          label,
          metricKey,
          reason,
        });
      } else if (val !== null && val !== undefined) {
        modeled.push({
          label,
          metricKey,
          value: `${unit.includes("FTE") || unit.includes("hrs") ? formatNumber(val) : formatCurrency(val)} ${unit}`.trim(),
          provenance: prov,
        });
      } else {
        notModeled.push({
          label,
          metricKey,
          reason,
        });
      }
    };

    evaluate("Routine Admin Labor Cost", "annual_admin_labor_cost", adminLaborMetric, summary.admin_annual_cost, "/ yr");
    evaluate("Troubleshooting Labor Cost", "annual_troubleshooting_labor_cost", trbLaborMetric, summary.troubleshooting_annual_cost, "/ yr");
    evaluate("Total Operational Labor Cost", "total_quantified_labor_cost", totalLaborMetric, summary.total_operational_labor_cost, "/ yr");
    evaluate("Operational FTE Burden", "operational_fte_burden", fteMetric, summary.operational_fte_burden, "FTE");
    evaluate("Single-Event Exposure", "potential_financial_exposure", exposureMetric, summary.representative_single_event_exposure, "/ event");
    evaluate("Recovered Admin Hours", "recovered_admin_hours", recAdminMetric, null, "hrs / yr");
    evaluate("Recovered Investigation Hours", "recovered_investigation_hours", recInvMetric, null, "hrs / yr");
    evaluate("Total Recoverable Hours", "total_recovered_hours", totalRecHoursMetric, summary.total_recoverable_labor_hours, "hrs / yr");
    evaluate("Illustrative Economic Value", "illustrative_economic_value", illustrativeValMetric, summary.illustrative_annual_labor_savings, "/ yr");
    evaluate("Troubleshooting Opportunity", "troubleshooting_productivity_opportunity", trbOppMetric, summary.troubleshooting_productivity_opportunity, "/ yr");

    return { modeled, incomplete, notModeled };
  }, [adminLaborMetric, trbLaborMetric, totalLaborMetric, fteMetric, exposureMetric, recAdminMetric, recInvMetric, totalRecHoursMetric, illustrativeValMetric, trbOppMetric, summary]);

  // Provenance Summary Counts
  const provenanceCounts = useMemo(() => {
    let facts = 0;
    let assumptionsCount = 0;
    let benchmarks = 0;
    let calculated = 0;
    let illustrative = 0;

    Object.values(metrics).forEach((m) => {
      const p = m.provenance;
      if (p === "CUSTOMER_FACT") facts++;
      else if (p === "MODEL_ASSUMPTION") assumptionsCount++;
      else if (p === "INDUSTRY_BENCHMARK" || p === "BENCHMARK_FALLBACK") benchmarks++;
      else if (p === "CALCULATED_RESULT") calculated++;
      else if (p === "ILLUSTRATIVE_SCENARIO" || p === "SCENARIO_PROJECTION") illustrative++;
    });

    return { facts, assumptionsCount, benchmarks, calculated, illustrative };
  }, [metrics]);

  return (
    <section
      aria-label="Executive Economic Summary"
      data-testid="executive-economic-narrative"
      className="rounded-2xl border border-[#CBD2DE] bg-white shadow-xs overflow-hidden"
    >
      {/* 1. Header & Executive Positioning */}
      <div className="bg-[#0D1322] text-white p-5 sm:p-6 border-b border-[#1E293B] relative overflow-hidden">
        {/* Subtle accent glow */}
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-10 w-48 h-48 bg-[#008638]/20 rounded-full blur-2xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#008638]/25 text-[#8CC63E] border border-[#008638]/40 text-[11px] font-bold tracking-wide uppercase">
                <FileText className="h-3 w-3" />
                <span>Executive Economic Narrative</span>
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                Audit Record • {calculation.calculation_engine_version ? `v${calculation.calculation_engine_version}` : "Authoritative"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Economic Interpretation &amp; Decision Baseline</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Traceable executive interpretation synthesized deterministically from authoritative assessment responses and the calculation engine snapshot.
            </p>
          </div>

          <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 text-right border-t sm:border-t-0 sm:border-l border-slate-700/60 pt-3 sm:pt-0 sm:pl-5">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Authoritative Baseline</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5" data-testid="narrative-customer-scope">
              <Building2 className="h-3.5 w-3.5 text-[#38B449]" />
              <span>Advisory Portfolio</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Rule: {calculation.assessment_version || Object.values(metrics)[0]?.rule_version || "calc-rules-v1.0.0"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Structured Narrative Grid: 4 Core Economic Dimensions */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: Quantified Operational Burden */}
          <div
            className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#008638] bg-[#FAFBFD] p-4.5 flex flex-col justify-between space-y-3"
            data-testid="narrative-operational-burden-card"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#008638]" />
                  <span>1. Operational Labor Burden</span>
                </span>
                <ProvenanceBadge
                  provenance={totalLaborMetric?.provenance || "CALCULATED_RESULT"}
                  state={totalLaborMetric?.state || "VALID"}
                />
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-[#172033] font-mono" data-testid="narrative-labor-cost-value">
                    {formatCurrency(laborCostValue)} / yr
                  </span>
                  <span className="text-xs font-semibold text-[#667085]">
                    {fteValue !== null ? `(${formatNumber(fteValue, 2)} FTE)` : ""}
                  </span>
                </div>
                {isAuthorizedForMath && onShowMath && (
                  <button
                    type="button"
                    onClick={() => onShowMath("total_quantified_labor_cost")}
                    data-testid="narrative-math-labor-btn"
                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#008638] hover:text-[#006B2D] bg-[#EEF8F0] hover:bg-[#E5F5E8] px-2 py-0.5 rounded border border-[#A8E2B5] transition-colors cursor-pointer shadow-2xs shrink-0"
                    aria-label="Show the Math for Operational Labor Cost"
                  >
                    <Calculator className="h-3 w-3 mr-0.5" />
                    <span>Show Math</span>
                  </button>
                )}
              </div>

              {/* Conditional Data-Driven Narrative */}
              <div className="text-xs text-[#475467] leading-relaxed pt-1" data-testid="narrative-labor-text">
                {totalLaborMetric?.state === "VALID" ? (
                  <p>
                    Quantified operational labor expenditure is currently modeled at{" "}
                    <strong className="text-[#172033]">{formatCurrency(laborCostValue)} / yr</strong> across routine queue administration and reactive bridge-call triage, representing{" "}
                    <strong className="text-[#172033]">{formatNumber(fteValue, 2)} dedicated FTEs</strong> at loaded labor cost.
                  </p>
                ) : totalLaborMetric?.state === "VALID_WITH_DEFAULTS" ? (
                  <p>
                    Quantified operational labor cost is modeled at{" "}
                    <strong className="text-[#172033]">{formatCurrency(laborCostValue)} / yr</strong> (<strong>{formatNumber(fteValue, 2)} FTE</strong>). 
                    This calculation incorporates model standard benchmark defaults ($180,000/yr loaded rate).
                  </p>
                ) : totalLaborMetric?.state === "INSUFFICIENT_DATA" ? (
                  <p>
                    Quantified operational labor cost is currently <strong className="text-amber-800">incomplete</strong>.{" "}
                    {totalLaborMetric?.state_reason || "Requires both administration and troubleshooting inputs to finalize total labor expenditure."}
                  </p>
                ) : (
                  <p>
                    Operational labor cost is <strong className="text-slate-600">not currently modeled</strong>. Baseline administration or troubleshooting inputs were unprovided in the assessment.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#E2E6EE] text-[11px] text-[#667085] flex items-center justify-between">
              <span>Admin: <strong className="text-[#172033]">{formatCurrency(summary.admin_annual_cost)}</strong></span>
              <span>•</span>
              <span>Triage: <strong className="text-[#172033]">{formatCurrency(summary.troubleshooting_annual_cost)}</strong></span>
              <span>•</span>
              <span>Rate: <strong className="text-[#172033]">${rateValue.toFixed(2)}/hr</strong></span>
            </div>
          </div>

          {/* Card 2: Single-Event Financial Exposure */}
          <div
            className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#D97706] bg-[#FAFBFD] p-4.5 flex flex-col justify-between space-y-3"
            data-testid="narrative-exposure-card"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-[#D97706]" />
                  <span>2. Single-Event Exposure</span>
                </span>
                <ProvenanceBadge
                  provenance={exposureMetric?.provenance || "MODEL_ASSUMPTION"}
                  state={exposureMetric?.state || "NOT_MODELED"}
                />
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-[#172033] font-mono" data-testid="narrative-exposure-value">
                    {formatCurrency(exposureValue)} / event
                  </span>
                  <span className="text-xs font-semibold text-[#667085]">
                    {durationValue !== null ? `(${formatNumber(durationValue)} hrs)` : ""}
                  </span>
                </div>
                {isAuthorizedForMath && onShowMath && (
                  <button
                    type="button"
                    onClick={() => onShowMath("potential_financial_exposure")}
                    data-testid="narrative-math-exposure-btn"
                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#008638] hover:text-[#006B2D] bg-[#EEF8F0] hover:bg-[#E5F5E8] px-2 py-0.5 rounded border border-[#A8E2B5] transition-colors cursor-pointer shadow-2xs shrink-0"
                    aria-label="Show the Math for Financial Exposure"
                  >
                    <Calculator className="h-3 w-3 mr-0.5" />
                    <span>Show Math</span>
                  </button>
                )}
              </div>

              {/* Conditional Data-Driven Narrative */}
              <div className="text-xs text-[#475467] leading-relaxed pt-1" data-testid="narrative-exposure-text">
                {exposureMetric?.state === "VALID" || exposureMetric?.state === "VALID_WITH_DEFAULTS" ? (
                  <p>
                    Representative single-event downtime exposure is modeled at{" "}
                    <strong className="text-[#172033]">{formatCurrency(exposureValue)} per event</strong> based on an estimated{" "}
                    <strong className="text-[#172033]">{formatNumber(durationValue)} hour</strong> disruption at an applicable financial impact rate of{" "}
                    <strong className="text-[#172033]">{formatCurrency(rateImpactValue)}/hr</strong>.
                  </p>
                ) : exposureMetric?.state === "INSUFFICIENT_DATA" ? (
                  <p>
                    Single-event financial exposure is currently <strong className="text-amber-800">incomplete</strong>.{" "}
                    {exposureMetric?.state_reason || "Requires representative disruption duration and business impact severity."}
                  </p>
                ) : (
                  <p>
                    Single-event financial exposure is <strong className="text-slate-600">not currently modeled</strong>. Disruption duration (Q14) or impact severity (Q12) were unprovided.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#E2E6EE] text-[11px] text-[#667085] flex items-center justify-between">
              <span>Impact: <strong className="text-[#172033]">{formatCurrency(rateImpactValue)}/hr</strong></span>
              <span>•</span>
              <span className="italic">Single incident impact (not annualized loss)</span>
            </div>
          </div>

          {/* Card 3: Controlled Improvement & Recoverable Opportunity */}
          <div
            className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#38B449] bg-[#FAFBFD] p-4.5 flex flex-col justify-between space-y-3"
            data-testid="narrative-opportunity-card"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#38B449]" />
                  <span>3. Recoverable Opportunity</span>
                </span>
                <ProvenanceBadge
                  provenance={illustrativeValMetric?.provenance || "ILLUSTRATIVE_SCENARIO"}
                  state={illustrativeValMetric?.state || "INSUFFICIENT_DATA"}
                />
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-[#008638] font-mono" data-testid="narrative-opportunity-value">
                    {formatCurrency(illustrativeValValue)} / yr
                  </span>
                  <span className="text-xs font-semibold text-[#008638]">
                    {totalRecHoursValue !== null ? `(${formatNumber(totalRecHoursValue)} hrs/yr)` : ""}
                  </span>
                </div>
                {isAuthorizedForMath && onShowMath && (
                  <button
                    type="button"
                    onClick={() => onShowMath("illustrative_economic_value")}
                    data-testid="narrative-math-opportunity-btn"
                    className="inline-flex items-center space-x-1 text-[10px] font-bold text-[#008638] hover:text-[#006B2D] bg-[#EEF8F0] hover:bg-[#E5F5E8] px-2 py-0.5 rounded border border-[#A8E2B5] transition-colors cursor-pointer shadow-2xs shrink-0"
                    aria-label="Show the Math for Recoverable Opportunity"
                  >
                    <Calculator className="h-3 w-3 mr-0.5" />
                    <span>Show Math</span>
                  </button>
                )}
              </div>

              {/* Conditional Data-Driven Narrative */}
              <div className="text-xs text-[#475467] leading-relaxed pt-1" data-testid="narrative-opportunity-text">
                {illustrativeValMetric?.state === "VALID" ? (
                  <p>
                    The controlled improvement scenario (50%×50% admin, 25% MTTR acceleration) models{" "}
                    <strong className="text-[#008638]">{formatNumber(totalRecHoursValue)} recoverable engineering hours / yr</strong>, corresponding to an illustrative capacity valuation of{" "}
                    <strong className="text-[#008638]">{formatCurrency(illustrativeValValue)} / yr</strong>.
                  </p>
                ) : recAdminMetric?.state === "VALID" && (totalRecHoursMetric?.state === "INSUFFICIENT_DATA" || illustrativeValMetric?.state === "INSUFFICIENT_DATA") ? (
                  <p>
                    Scenario modeling captures <strong className="text-[#008638]">{formatNumber(recAdminMetric.value)} recoverable routine admin hours / yr</strong>. 
                    Total recoverable hours and illustrative value remain <strong className="text-amber-800">incomplete</strong> awaiting troubleshooting metrics.
                  </p>
                ) : illustrativeValMetric?.state === "INSUFFICIENT_DATA" ? (
                  <p>
                    Recoverable opportunity is currently <strong className="text-amber-800">incomplete</strong>.{" "}
                    {illustrativeValMetric?.state_reason || "Requires completed baseline administration and troubleshooting hours."}
                  </p>
                ) : (
                  <p>
                    Recoverable scenario opportunity is <strong className="text-slate-600">not currently modeled</strong> because baseline effort metrics are unprovided.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#E2E6EE] text-[11px] text-[#667085] flex items-center justify-between">
              <span>Admin: <strong className="text-[#172033]">{formatNumber(recAdminMetric?.value)} hrs</strong></span>
              <span>•</span>
              <span>Triage: <strong className="text-[#172033]">{formatNumber(recInvMetric?.value)} hrs</strong></span>
              <span>•</span>
              <span className="italic">Capacity valuation (not cash ROI)</span>
            </div>
          </div>
        </div>

        {/* 3. Executive Synthesis & Model Boundary Disclosure */}
        <div className="rounded-xl border border-[#CBD2DE] bg-[#F8FAFC] p-4.5 sm:p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-[#008638]" />
            <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
              Executive Synthesis &amp; Model Boundary Governance
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#344054] leading-relaxed">
            <div className="space-y-1.5 p-3 rounded-lg bg-white border border-[#E2E6EE]">
              <div className="font-bold text-[#172033] flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#008638]" />
                <span>What the Assessment Evidence Supports:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#475467] pl-1">
                <li>Deterministic quantification of routine middleware maintenance and bridge calls.</li>
                <li>Loaded hourly engineering labor rate applied consistently across administrative streams.</li>
                <li>Controlled simulation of addressable administrative automation and triage acceleration.</li>
              </ul>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-white border border-[#E2E6EE]">
              <div className="font-bold text-[#172033] flex items-center space-x-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>What Should NOT Be Inferred:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#475467] pl-1">
                <li><strong>No Guaranteed Cash Savings:</strong> Scenario valuations model liberated staff capacity, not cash reductions or staff reductions.</li>
                <li><strong>No Annualized Exposure:</strong> Single-event downtime figures model potential impact of a single major incident, not cumulative annual loss.</li>
                <li><strong>No Vendor Recommendation:</strong> Metrics provide mathematical baseline transparency without commercial endorsement.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 4. Data Completeness & Limitations Matrix */}
        <div className="rounded-xl border border-[#E2E6EE] bg-white p-4.5 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="h-4 w-4 text-[#008638]" />
              <span>Assessment Data Completeness &amp; Limitations Matrix</span>
            </span>
            <span className="text-[11px] text-[#667085]">
              {completenessSummary.modeled.length} Valid • {completenessSummary.incomplete.length} Incomplete • {completenessSummary.notModeled.length} Not Modeled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Column A: Fully Modeled / Valid */}
            <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E6EE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#008638] flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Modeled ({completenessSummary.modeled.length})</span>
                </span>
                <span className="text-[10px] text-[#667085] uppercase font-semibold">Active</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {completenessSummary.modeled.length > 0 ? (
                  completenessSummary.modeled.map((item, idx) => (
                    <div key={`modeled-${idx}`} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0 text-[11px]">
                      <span className="text-[#172033] truncate max-w-[140px]">{item.label}</span>
                      <span className="font-mono font-semibold text-[#008638]">{item.value}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[#8A94A6] italic py-2">No metrics currently modeled.</div>
                )}
              </div>
            </div>

            {/* Column B: Incomplete / Insufficient Data */}
            <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E6EE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-700 flex items-center space-x-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Incomplete ({completenessSummary.incomplete.length})</span>
                </span>
                <span className="text-[10px] text-amber-700 uppercase font-semibold">Awaiting Data</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {completenessSummary.incomplete.length > 0 ? (
                  completenessSummary.incomplete.map((item, idx) => (
                    <div key={`inc-${idx}`} className="py-1 border-b border-slate-100 last:border-b-0 text-[11px] space-y-0.5">
                      <div className="text-[#172033] font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-amber-700 truncate" title={item.reason}>
                        {item.reason}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#8A94A6] italic py-2">No incomplete metrics identified.</div>
                )}
              </div>
            </div>

            {/* Column C: Unmodeled / Unprovided */}
            <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E6EE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center space-x-1">
                  <Info className="h-3.5 w-3.5" />
                  <span>Not Modeled ({completenessSummary.notModeled.length})</span>
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Unprovided</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {completenessSummary.notModeled.length > 0 ? (
                  completenessSummary.notModeled.map((item, idx) => (
                    <div key={`nm-${idx}`} className="py-1 border-b border-slate-100 last:border-b-0 text-[11px] space-y-0.5">
                      <div className="text-[#172033] font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-[#8A94A6] truncate" title={item.reason}>
                        {item.reason}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#8A94A6] italic py-2">All candidate metrics modeled.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Evidence & Provenance Traceability Footer */}
        <div className="pt-3 border-t border-[#E2E6EE] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#667085]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#172033]">Evidence Provenance:</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-[#172033]">
              {provenanceCounts.facts} Customer Facts
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-[#172033]">
              {provenanceCounts.benchmarks} Benchmarks
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-[#172033]">
              {provenanceCounts.calculated} Calculated Results
            </span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-[#172033]">
              {provenanceCounts.illustrative} Scenarios
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span>Snapshot: <strong className="text-[#172033]">{calculation.snapshot_id ? calculation.snapshot_id.substring(0, 8) : "IMMUTABLE"}</strong></span>
            <span>•</span>
            <span>{calculation.calculated_at ? new Date(calculation.calculated_at).toLocaleDateString() : "Active Record"}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
