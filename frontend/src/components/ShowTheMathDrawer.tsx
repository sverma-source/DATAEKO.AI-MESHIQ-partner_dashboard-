"use client";

import React, { useEffect, useRef } from "react";
import {
  Calculator,
  CheckCircle2,
  FileCode2,
  Info,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { CalculationRunResponse, MetricResult } from "../types/assessment";
import { ProvenanceBadge } from "./ProvenanceBadge";

export type MathTargetMetricKey =
  | "total_quantified_labor_cost"
  | "potential_financial_exposure"
  | "illustrative_economic_value"
  | "total_recovered_hours"
  | "recoverable_opportunity";

interface ShowTheMathDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: CalculationRunResponse;
  customerName?: string;
  answers?: Record<string, any>;
  targetMetricKey?: MathTargetMetricKey;
}

export const ShowTheMathDrawer: React.FC<ShowTheMathDrawerProps> = ({
  isOpen,
  onClose,
  calculation,
  customerName,
  answers = {},
  targetMetricKey = "total_quantified_labor_cost",
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Remember currently focused element to restore upon close
    if (typeof document !== "undefined") {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
    }

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        onClose();
        return;
      }

      // Trap focus inside drawer
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocusedElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const metrics = calculation.computed_metrics || {};
  const summary = calculation.summary || {};
  const assumptions = calculation.assumptions_used || {};
  const benchmarks = calculation.benchmarks_used || {};

  // Formatter utilities (Presentation only, NO calculation)
  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const formatNumber = (val: any, decimals = 1) => {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "—";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: decimals,
    }).format(Number(val));
  };

  // Human-readable state badge
  const renderStateBadge = (state?: string) => {
    const s = state || "VALID";
    if (s === "VALID") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Valid</span>
        </span>
      );
    }
    if (s === "VALID_WITH_DEFAULTS") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Info className="h-3 w-3" />
          <span>Valid with Defaults</span>
        </span>
      );
    }
    if (s === "INSUFFICIENT_DATA") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <span>Insufficient Data</span>
        </span>
      );
    }
    if (s === "NOT_MODELED") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <span>Not Modeled</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <span>{s}</span>
      </span>
    );
  };

  // --------------------------------------------------------------------------
  // METRIC RESOLUTION
  // --------------------------------------------------------------------------
  const isExposure = targetMetricKey === "potential_financial_exposure";
  const isRecoveredHours = targetMetricKey === "total_recovered_hours";
  const isScenario =
    targetMetricKey === "illustrative_economic_value" ||
    targetMetricKey === "total_recovered_hours" ||
    targetMetricKey === "recoverable_opportunity";

  // Target Metric Resolution
  let targetMetric: MetricResult | undefined;
  let targetValue: any = null;
  let targetMetricKeyName = "total_quantified_labor_cost";
  let targetUnit = "USD / year";
  let targetDescription = "";

  if (isExposure) {
    targetMetric = metrics.potential_financial_exposure || metrics.representative_single_event_exposure;
    targetValue = targetMetric?.value ?? summary.representative_single_event_exposure ?? null;
    targetMetricKeyName = "potential_financial_exposure";
    targetUnit = "USD / event";
    targetDescription =
      "Modeled financial impact of a single major messaging disruption event (Representative Duration × Applicable Downtime Rate). Not an annualized loss.";
  } else if (isRecoveredHours) {
    targetMetric = metrics.total_recovered_hours;
    targetValue = targetMetric?.value ?? summary.total_recoverable_labor_hours ?? null;
    targetMetricKeyName = "total_recovered_hours";
    targetUnit = "hours / year";
    targetDescription =
      "Annual engineering capacity liberated under approved automation and diagnostic acceleration levers. Illustrative simulation.";
  } else if (isScenario) {
    targetMetric = metrics.illustrative_economic_value;
    targetValue = targetMetric?.value ?? summary.illustrative_annual_labor_savings ?? null;
    targetMetricKeyName = "illustrative_economic_value";
    targetUnit = "USD / year";
    targetDescription =
      "Theoretical annual economic value of liberated engineering capacity (Total Recovered Hours × Loaded Hourly Labor Rate). Not guaranteed cash savings or fixed ROI.";
  } else {
    targetMetric = metrics.total_quantified_labor_cost;
    targetValue = targetMetric?.value ?? summary.total_operational_labor_cost ?? null;
    targetMetricKeyName = "total_quantified_labor_cost";
    targetUnit = "USD / year";
    targetDescription =
      "Authoritative annual quantified engineering labor cost derived deterministically across routine queue administration and reactive incident troubleshooting.";
  }

  // Component metrics for Labor Cost
  const adminCostMetric: MetricResult | undefined = metrics.annual_admin_labor_cost;
  const adminCostValue = adminCostMetric?.value ?? summary.admin_annual_cost ?? null;
  const trbCostMetric: MetricResult | undefined = metrics.annual_troubleshooting_labor_cost;
  const trbCostValue = trbCostMetric?.value ?? summary.troubleshooting_annual_cost ?? null;

  // Intermediate metrics for Labor Cost
  const adminHoursMetric = metrics.annual_admin_hours;
  const trbEventsMetric = metrics.annual_troubleshooting_events;
  const invHoursMetric = metrics.staff_hours_per_investigation;
  const trbHoursMetric = metrics.annual_troubleshooting_hours;
  const loadedLaborMetric = metrics.loaded_annual_labor_cost;
  const loadedRateMetric = metrics.loaded_hourly_rate || metrics.internal_loaded_hourly_rate;

  // Component metrics for Financial Exposure
  const durationMetric: MetricResult | undefined = metrics.representative_duration_hours;
  const rateImpactMetric: MetricResult | undefined = metrics.applicable_financial_rate;

  // Scenario specific metrics (E3)
  const recAdminMetric: MetricResult | undefined = metrics.recovered_admin_hours;
  const recInvMetric: MetricResult | undefined = metrics.recovered_investigation_hours;
  const totalRecHoursMetric: MetricResult | undefined = metrics.total_recovered_hours;
  const illustrativeValMetric: MetricResult | undefined = metrics.illustrative_economic_value;
  const trbOppMetric: MetricResult | undefined = metrics.troubleshooting_productivity_opportunity;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="show-the-math-title"
      className="fixed inset-0 z-50 overflow-hidden bg-[#0D1322]/65 backdrop-blur-xs flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col relative animate-in slide-in-from-right duration-200 border-l border-[#E2E6EE]"
      >
        {/* Top Brand Accent Hairline */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#008638] via-[#38B449] via-[#8CC63E] 75% to-[#C026D3] 100% pointer-events-none"
        />

        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2E6EE] flex items-start justify-between gap-4 bg-[#F8FAFC]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                <Calculator className="h-3 w-3 mr-1" />
                Calculation Transparency
              </span>
              <span className="text-xs text-[#667085] font-mono">
                Engine v{calculation.calculation_engine_version || "1.0.0"}
              </span>
            </div>
            <h2
              id="show-the-math-title"
              className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight mt-1.5"
            >
              {isExposure
                ? "Single-Event Financial Exposure Breakdown"
                : isScenario
                ? isRecoveredHours
                  ? "Recoverable Labor Hours Breakdown"
                  : "Recoverable Opportunity & Scenario Breakdown"
                : "Operational Labor Cost Breakdown"}
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Deterministic mathematical derivation and input lineage for{" "}
              <strong className="text-[#172033]">{customerName || "Enterprise Customer"}</strong>
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close calculation detail panel"
            className="rounded-lg p-1.5 text-[#667085] hover:text-[#172033] hover:bg-slate-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008638] cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-[#172033]">
          {/* 1. Primary Metric Hero Banner */}
          <div className="rounded-xl bg-[#0D1322] p-5 sm:p-6 text-white border border-[#1E293B] shadow-md relative overflow-hidden">
            <div aria-hidden="true" className="absolute -right-8 -top-8 w-44 h-44 opacity-25 pointer-events-none">
              <svg viewBox="0 0 160 160" className="w-full h-full" fill="none">
                <circle cx="80" cy="80" r="45" stroke="#38B449" strokeWidth="1" strokeDasharray="3 4" />
                <circle cx="80" cy="80" r="70" stroke="#8CC63E" strokeWidth="1" strokeDasharray="2 3" />
              </svg>
            </div>

            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  {targetMetricKeyName}
                </span>
                {renderStateBadge(targetMetric?.state)}
              </div>

              <div className="flex items-baseline space-x-2">
                <span
                  className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight"
                  data-testid="target-metric-value"
                >
                  {isRecoveredHours ? formatNumber(targetValue) : formatCurrency(targetValue)}
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {targetUnit}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {targetDescription}
              </p>

              {targetMetric?.state_reason && (
                <div className="pt-2 text-xs text-amber-300 flex items-center space-x-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>{targetMetric.state_reason}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Canonical Formula & Provenance */}
          <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
                <FileCode2 className="h-4 w-4 text-[#008638]" />
                <span>Canonical Formula Specification</span>
              </span>
              <ProvenanceBadge
                provenance={targetMetric?.provenance || (isScenario ? "ILLUSTRATIVE_SCENARIO" : "CALCULATED_RESULT")}
                state={targetMetric?.state || "VALID"}
              />
            </div>

            <div className="rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] p-3 font-mono text-xs text-[#172033] flex flex-col space-y-1">
              <div className="text-[11px] text-[#667085] uppercase font-bold">Rule Set Formula:</div>
              <div className="font-bold text-[#008638] text-sm" data-testid="canonical-formula-code">
                {isExposure
                  ? targetMetric?.formula_code || "EXPOSURE_SINGLE = D_HOURS * R_IMPACT"
                  : isRecoveredHours
                  ? totalRecHoursMetric?.formula_code || "H_REC_TOTAL = H_REC_ADMIN + H_REC_INV"
                  : isScenario
                  ? illustrativeValMetric?.formula_code || "V_ILLUSTRATIVE = H_REC_TOTAL * R_HR"
                  : targetMetric?.formula_code || "C_TOTAL = C_ADMIN + C_TRB"}
              </div>
              <div className="text-[11px] text-[#667085] pt-1">
                {isExposure ? (
                  <>
                    Where <code className="text-[#172033] font-bold">EXPOSURE_SINGLE</code> is Single-Event Financial Exposure,{" "}
                    <code className="text-[#172033] font-bold">D_HOURS</code> is Representative Disruption Duration (hours), and{" "}
                    <code className="text-[#172033] font-bold">R_IMPACT</code> is Applicable Hourly Downtime Cost ($/hr).
                  </>
                ) : isRecoveredHours ? (
                  <>
                    Where <code className="text-[#172033] font-bold">H_REC_TOTAL</code> is Total Recoverable Hours,{" "}
                    <code className="text-[#172033] font-bold">H_REC_ADMIN</code> is Recovered Admin Hours (H_ADMIN × 50% × 50%), and{" "}
                    <code className="text-[#172033] font-bold">H_REC_INV</code> is Recovered Investigation Hours (H_TRB × 25%).
                  </>
                ) : isScenario ? (
                  <>
                    Where <code className="text-[#172033] font-bold">V_ILLUSTRATIVE</code> is Illustrative Economic Value,{" "}
                    <code className="text-[#172033] font-bold">H_REC_TOTAL</code> is Total Recoverable Hours, and{" "}
                    <code className="text-[#172033] font-bold">R_HR</code> is the Loaded Hourly Engineering Rate ($/hr).
                  </>
                ) : (
                  <>
                    Where <code className="text-[#172033] font-bold">C_TOTAL</code> is Total Operational Labor Cost,{" "}
                    <code className="text-[#172033] font-bold">C_ADMIN</code> is Annual Admin Labor Cost, and{" "}
                    <code className="text-[#172033] font-bold">C_TRB</code> is Annual Troubleshooting Labor Cost.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. SCENARIO DETAIL SURFACE (E3 Specific) */}
          {isScenario ? (
            <div className="space-y-6">
              {/* Recoverable Hours Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-[#008638]" />
                    <span>Recoverable Hours Breakdown</span>
                  </span>
                  <span className="text-[11px] text-[#667085]">Authoritative Snapshot Values</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Stream A: Recovered Admin Hours */}
                  <div className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#008638] bg-white p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#172033]">Routine Admin</span>
                      <span className="text-[10px] font-mono text-[#667085] bg-slate-100 px-1 py-0.5 rounded">
                        H_REC_ADMIN
                      </span>
                    </div>
                    <div className="text-xl font-black text-[#172033] font-mono" data-testid="scenario-rec-admin-hours">
                      {formatNumber(recAdminMetric?.value)} hrs/yr
                    </div>
                    <div className="text-[10px] font-mono text-[#667085] truncate" title={recAdminMetric?.formula_code || ""}>
                      {recAdminMetric?.formula_code || "H_ADMIN * 0.50 * 0.50"}
                    </div>
                    <div className="text-[10px] text-[#008638] font-medium pt-0.5">
                      50% scope × 50% efficiency
                    </div>
                  </div>

                  {/* Stream B: Recovered Investigation Hours */}
                  <div className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#38B449] bg-white p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#172033]">Incident Triage</span>
                      <span className="text-[10px] font-mono text-[#667085] bg-slate-100 px-1 py-0.5 rounded">
                        H_REC_INV
                      </span>
                    </div>
                    <div className="text-xl font-black text-[#172033] font-mono" data-testid="scenario-rec-inv-hours">
                      {formatNumber(recInvMetric?.value)} hrs/yr
                    </div>
                    <div className="text-[10px] font-mono text-[#667085] truncate" title={recInvMetric?.formula_code || ""}>
                      {recInvMetric?.formula_code || "H_TRB * 0.25"}
                    </div>
                    <div className="text-[10px] text-[#008638] font-medium pt-0.5">
                      25% MTTR acceleration
                    </div>
                  </div>

                  {/* Stream C: Total Recovered Hours */}
                  <div className="rounded-xl border border-[#A8E2B5] border-t-3 border-t-[#008638] bg-[#EEF8F0]/40 p-3.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#008638]">Total Recoverable</span>
                      <span className="text-[10px] font-mono text-[#008638] bg-white px-1 py-0.5 rounded border border-[#A8E2B5]">
                        H_REC_TOTAL
                      </span>
                    </div>
                    <div className="text-xl font-black text-[#008638] font-mono" data-testid="scenario-total-rec-hours">
                      {formatNumber(totalRecHoursMetric?.value ?? summary.total_recoverable_labor_hours)} hrs/yr
                    </div>
                    <div className="text-[10px] font-mono text-[#008638]/80 truncate" title={totalRecHoursMetric?.formula_code || ""}>
                      {totalRecHoursMetric?.formula_code || "H_REC_ADMIN + H_REC_INV"}
                    </div>
                    <div className="text-[10px] text-[#008638] font-semibold pt-0.5">
                      Sum of streams (from engine)
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#667085] italic">
                  * All recovered hours are retrieved directly from the CalculationSnapshot without client-side addition or calculation.
                </div>
              </div>

              {/* Economic Value & Valuation Section */}
              <div className="rounded-xl border border-[#A8E2B5] bg-white p-4.5 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#008638] uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="h-4 w-4 text-[#008638]" />
                    <span>Illustrative Economic Value (Capacity Valuation)</span>
                  </span>
                  <ProvenanceBadge
                    provenance={illustrativeValMetric?.provenance || "ILLUSTRATIVE_SCENARIO"}
                    state={illustrativeValMetric?.state || "VALID"}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 p-3 rounded-lg bg-[#EEF8F0]/60 border border-[#A8E2B5]">
                  <div>
                    <span className="text-xs text-[#008638] font-semibold uppercase block">
                      Illustrative Economic Value
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#0D1322] font-mono" data-testid="scenario-illustrative-value">
                      {formatCurrency(illustrativeValMetric?.value ?? summary.illustrative_annual_labor_savings)}
                    </span>
                    <span className="text-xs font-semibold text-[#008638] ml-1.5">/ year</span>
                  </div>
                  <div className="text-xs text-[#172033] sm:text-right">
                    <div className="font-semibold">
                      Applied Loaded Labor Rate: <strong>${Number(loadedRateMetric?.value || 86.54).toFixed(2)}/hr</strong>
                    </div>
                    <div className="text-[11px] text-[#667085] font-mono">
                      Formula: {illustrativeValMetric?.formula_code || "V_ILLUSTRATIVE = H_REC_TOTAL * R_HR"}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#667085] leading-relaxed">
                  <strong>Governance Disclaimer:</strong> Evaluates theoretical capacity value of liberated engineering time (<code>H_rec_total × R_hr</code>). 
                  Labeled strictly as <em>Illustrative Economic Value</em> — <strong>not guaranteed cash savings, realized savings, or fixed ROI</strong>.
                </p>
              </div>

              {/* Troubleshooting Productivity Opportunity (Isolated 10% Rule) */}
              <div className="rounded-xl border border-[#E2E6EE] bg-white p-4.5 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <span>Troubleshooting Productivity Opportunity (Separate 10% Rule)</span>
                  </span>
                  <ProvenanceBadge
                    provenance={trbOppMetric?.provenance || "ILLUSTRATIVE_SCENARIO"}
                    state={trbOppMetric?.state || "VALID"}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE]">
                  <div>
                    <span className="text-[11px] text-[#667085] uppercase font-semibold block">
                      Opportunity Value (Isolated)
                    </span>
                    <span className="text-2xl font-black text-[#172033] font-mono" data-testid="scenario-trb-opp-value">
                      {formatCurrency(trbOppMetric?.value ?? summary.troubleshooting_productivity_opportunity)}
                    </span>
                    <span className="text-xs text-[#667085] ml-1.5">/ year</span>
                  </div>
                  <div className="text-xs text-[#667085] sm:text-right font-mono">
                    Formula: {trbOppMetric?.formula_code || "OPP_TRB = C_TRB * 0.10"}
                  </div>
                </div>

                <p className="text-[11px] text-[#667085] leading-relaxed">
                  <strong>Isolated Metric:</strong> Computed strictly as <code>C_trb × 10%</code> on baseline annual troubleshooting labor cost ({formatCurrency(trbCostValue)}). 
                  In accordance with business rules, this figure remains fully distinct from the 25% incident investigation recovery scenario and is never added to or merged with recovered hours economic value.
                </p>
              </div>

              {/* Scenario Assumptions Used */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Scenario Assumptions Used (Snapshot Metadata)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Addressable Admin Share (Q04 Scope)
                    </div>
                    <div className="font-bold text-[#008638] font-mono text-base" data-testid="assumption-admin-addressable">
                      {assumptions.scenario_admin_addressable_share !== undefined
                        ? `${Number(assumptions.scenario_admin_addressable_share) * 100}%`
                        : "50%"}
                    </div>
                    <div className="text-[10px] text-[#667085]">
                      Proportion of routine MQ queue configuration and maintenance amenable to automation.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Admin Efficiency Improvement
                    </div>
                    <div className="font-bold text-[#008638] font-mono text-base" data-testid="assumption-admin-efficiency">
                      {assumptions.scenario_admin_efficiency_improvement !== undefined
                        ? `${Number(assumptions.scenario_admin_efficiency_improvement) * 100}%`
                        : "50%"}
                    </div>
                    <div className="text-[10px] text-[#667085]">
                      Efficiency factor achieved on the addressable portion via self-service provisioning.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Investigation Improvement (MTTR)
                    </div>
                    <div className="font-bold text-[#008638] font-mono text-base" data-testid="assumption-inv-improvement">
                      {assumptions.scenario_investigation_improvement !== undefined
                        ? `${Number(assumptions.scenario_investigation_improvement) * 100}%`
                        : "25%"}
                    </div>
                    <div className="text-[10px] text-[#667085]">
                      Acceleration in root-cause triage across major incident bridge calls.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Troubleshooting Opportunity Share
                    </div>
                    <div className="font-bold text-[#008638] font-mono text-base" data-testid="assumption-trb-opp-share">
                      {assumptions.scenario_troubleshooting_opportunity_share !== undefined
                        ? `${Number(assumptions.scenario_troubleshooting_opportunity_share) * 100}%`
                        : "10%"}
                    </div>
                    <div className="text-[10px] text-[#667085]">
                      Fixed opportunity multiplier applied strictly to baseline troubleshooting expenditure.
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Questions & Assessment Inputs Lineage */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Source Questions &amp; Input Lineage
                </span>

                <div className="space-y-2.5 text-xs">
                  {/* Q04 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q04</span>
                      <span className="font-medium text-[#172033]">Routine Administration Effort:</span>
                      <div className="text-[11px] text-[#667085]">Feeds baseline H_ADMIN &rarr; H_REC_ADMIN</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q04">
                      {answers.q04_dropdown || (answers.q04_admin_hours ? `${answers.q04_admin_hours} hrs/wk` : "1–5 hrs/week (Default)")}
                    </div>
                  </div>

                  {/* Q06 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q06</span>
                      <span className="font-medium text-[#172033]">Troubleshooting Frequency:</span>
                      <div className="text-[11px] text-[#667085]">Feeds baseline N_EVENTS &rarr; H_TRB &rarr; H_REC_INV</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q06">
                      {answers.q06_frequency || "2–3 times / week (Default)"}
                    </div>
                  </div>

                  {/* Q07 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q07</span>
                      <span className="font-medium text-[#172033]">Hours per Investigation:</span>
                      <div className="text-[11px] text-[#667085]">Feeds baseline H_INV &rarr; H_TRB &rarr; H_REC_INV</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q07">
                      {answers.q07_labor_hours || (answers.q07_override ? `${answers.q07_override} hrs` : "2–4 hours (Default)")}
                    </div>
                  </div>

                  {/* Q20 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q20</span>
                      <span className="font-medium text-[#172033]">Loaded Annual Labor Rate:</span>
                      <div className="text-[11px] text-[#667085]">Feeds L_ANNUAL &amp; R_HR &rarr; V_ILLUSTRATIVE</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q20">
                      {answers.q20_use_default
                        ? "$180,000 / yr (Default)"
                        : answers.q20_annual_labor_rate
                        ? `$${answers.q20_annual_labor_rate.toLocaleString()} / yr`
                        : "$180,000 / yr (Default)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Component / Source Classification */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Provenance Classification: Source Tiers
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Customer Fact
                    </div>
                    <div className="font-bold text-[#172033]">
                      Assessment Discovery Inputs
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Customer responses to Q04 (admin effort), Q06 (incident frequency), Q07 (triage hours), and optional Q20 (compensation).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Model Assumption
                    </div>
                    <div className="font-bold text-[#172033]">
                      Standard Constants &amp; Baseline Defaults
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Annual working hours (2,080 hrs) and standard default engineering loaded cost ($180,000/yr).
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Calculated Result
                    </div>
                    <div className="font-bold text-[#172033]">
                      Baseline Operational Expenditure
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Deterministic baseline labor costs (C_ADMIN, C_TRB, C_TOTAL) calculated prior to scenario projection.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Illustrative Scenario
                    </div>
                    <div className="font-bold text-[#008638]">
                      Approved Improvement Multipliers
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Controlled scenario parameters (50%×50% admin, 25% triage, 10% opportunity share) and derived scenario outputs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : isExposure ? (
            /* E2 Single-Event Financial Exposure Surface */
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-[#008638]" />
                    <span>Component Metrics</span>
                  </span>
                  <span className="text-[11px] text-[#667085]">Authoritative Snapshot Values</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Component A: Representative Duration */}
                  <div className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-amber-500 bg-white p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#172033]">
                        Disruption Duration
                      </span>
                      <span className="text-[10px] font-mono text-[#667085] bg-slate-100 px-1.5 py-0.5 rounded">
                        D_HOURS
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[#172033] font-mono" data-testid="component-duration-hours">
                      {formatNumber(durationMetric?.value, 3)} hrs
                    </div>
                    <div className="text-[11px] font-mono text-[#667085]">
                      Formula: {durationMetric?.formula_code || "D_HOURS = LOOKUP(Q14_DURATION)"}
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-[#667085]">
                      <span>Provenance:</span>
                      <span className="font-semibold text-slate-700">
                        {durationMetric?.provenance || "MODEL_ASSUMPTION"}
                      </span>
                    </div>
                  </div>

                  {/* Component B: Applicable Financial Rate */}
                  <div className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#008638] bg-white p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#172033]">
                        Applicable Downtime Rate
                      </span>
                      <span className="text-[10px] font-mono text-[#667085] bg-slate-100 px-1.5 py-0.5 rounded">
                        R_IMPACT
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[#172033] font-mono" data-testid="component-financial-rate">
                      {formatCurrency(rateImpactMetric?.value)} / hr
                    </div>
                    <div className="text-[11px] font-mono text-[#667085] truncate" title={rateImpactMetric?.formula_code || ""}>
                      Formula: {rateImpactMetric?.formula_code || "R_IMPACT = Q15_OVERRIDE OR ITIC_300K"}
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-[#667085]">
                      <span>Provenance:</span>
                      <span className="font-semibold text-[#008638]">
                        {rateImpactMetric?.provenance || "INDUSTRY_BENCHMARK"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#667085] italic">
                  * Component values are retrieved directly from the CalculationSnapshot without client-side recalculation.
                </div>
              </div>

              {/* Provenance Classification */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Provenance Classification: Customer Fact vs. Benchmark
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Rate Source Classification */}
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1.5">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Financial Rate Tier
                    </div>
                    <div className="font-bold text-[#172033]" data-testid="provenance-rate-source">
                      {rateImpactMetric?.provenance === "CUSTOMER_FACT"
                        ? "Customer-Verified Custom Rate (Q15)"
                        : rateImpactMetric?.provenance === "INDUSTRY_BENCHMARK"
                        ? "ITIC $300k/hr Industry Benchmark"
                        : "Not Modeled / Non-Critical Impact"}
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      {rateImpactMetric?.provenance === "CUSTOMER_FACT"
                        ? "Customer verified custom hourly downtime cost provided in Q15 overrides benchmarks."
                        : rateImpactMetric?.provenance === "INDUSTRY_BENCHMARK"
                        ? "Applied standard ITIC $300,000/hr benchmark because business impact (Q12) was rated Critical or Significant."
                        : "Downtime financial rate is not modeled for non-critical impact levels."}
                    </p>
                  </div>

                  {/* Duration Source Classification */}
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1.5">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">
                      Duration Mapping Tier
                    </div>
                    <div className="font-bold text-[#172033]" data-testid="provenance-duration-source">
                      Standard Duration Table Lookup
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Customer range response selected in Q14 mapped to representative decimal hours via authoritative assessment lookup table.
                    </p>
                  </div>
                </div>
              </div>

              {/* Source Questions & Assessment Inputs Lineage */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Source Questions &amp; Input Lineage
                </span>

                <div className="space-y-2.5 text-xs">
                  {/* Q14 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q14</span>
                      <span className="font-medium text-[#172033]">Typical Outage / Disruption Duration:</span>
                      <div className="text-[11px] text-[#667085]">Feeds D_HOURS via duration table lookup</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q14">
                      {answers.q14_disruption_duration || (targetMetric?.inputs_used as any)?.q14_duration_input || "46–90 minutes (1.13 hrs)"}
                    </div>
                  </div>

                  {/* Q12 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q12</span>
                      <span className="font-medium text-[#172033]">Business Impact Severity:</span>
                      <div className="text-[11px] text-[#667085]">Feeds R_IMPACT eligibility for ITIC benchmark</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q12">
                      {answers.q12_business_impact || (rateImpactMetric?.inputs_used as any)?.q12_severity || "Critical / Significant"}
                    </div>
                  </div>

                  {/* Q15 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q15</span>
                      <span className="font-medium text-[#172033]">Custom Hourly Downtime Cost Override:</span>
                      <div className="text-[11px] text-[#667085]">Overrides ITIC benchmark if customer provided</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q15">
                      {answers.q15_is_unknown
                        ? "Unknown / Unprovided"
                        : answers.q15_hourly_cost_override !== undefined && answers.q15_hourly_cost_override !== null
                        ? `${formatCurrency(answers.q15_hourly_cost_override)} / hr`
                        : (rateImpactMetric?.inputs_used as any)?.q15_hourly_cost && (rateImpactMetric?.inputs_used as any)?.q15_hourly_cost !== "None"
                        ? `${formatCurrency((rateImpactMetric?.inputs_used as any)?.q15_hourly_cost)} / hr`
                        : "None (Benchmark Fallback)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Benchmarks Used */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Model Assumptions &amp; Benchmarks Used
                </span>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                      <div className="text-[11px] text-[#667085] uppercase font-semibold">
                        ITIC Downtime Benchmark
                      </div>
                      <div className="font-bold text-[#172033] font-mono text-base" data-testid="benchmark-itic-rate">
                        ${Number(benchmarks.itic_hourly_downtime_benchmark || 300000).toLocaleString()} / hour
                      </div>
                      <div className="text-[10px] text-[#667085]">
                        ITIC 2024 Reliability Survey (Critical Tier)
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                      <div className="text-[11px] text-[#667085] uppercase font-semibold">
                        Duration Lookup Table
                      </div>
                      <div className="font-bold text-[#172033] font-mono">
                        6 Categorical Intervals
                      </div>
                      <div className="text-[10px] text-[#667085]">
                        Standard Decimal Conversion Mapping
                      </div>
                    </div>
                  </div>

                  {/* Duration Lookup Table mapping guide */}
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-2">
                    <div className="text-[11px] font-semibold text-[#172033]">
                      Authoritative Duration Lookup Mapping:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] text-[#667085]">
                      <div className="p-1.5 rounded bg-white border border-[#E2E6EE]">
                        &lt; 15 min &rarr; <strong className="text-[#172033]">0.167 hrs</strong>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E2E6EE]">
                        15–45 min &rarr; <strong className="text-[#172033]">0.467 hrs</strong>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E2E6EE]">
                        46–90 min &rarr; <strong className="text-[#172033]">1.130 hrs</strong>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E2E6EE]">
                        1.5–4 hrs &rarr; <strong className="text-[#172033]">2.750 hrs</strong>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E2E6EE]">
                        4–8 hrs &rarr; <strong className="text-[#172033]">6.000 hrs</strong>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-[#E2E6EE]">
                        &gt; 8 hrs &rarr; <strong className="text-[#172033]">10.000 hrs</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* E1 Operational Labor Cost Surface */
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#667085] uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="h-4 w-4 text-[#008638]" />
                    <span>Component Metrics</span>
                  </span>
                  <span className="text-[11px] text-[#667085]">Authoritative Snapshot Values</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Component A: Annual Admin Labor Cost */}
                  <div className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#008638] bg-white p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#172033]">
                        Admin Labor Cost
                      </span>
                      <span className="text-[10px] font-mono text-[#667085] bg-slate-100 px-1.5 py-0.5 rounded">
                        C_ADMIN
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[#172033] font-mono" data-testid="component-admin-cost">
                      {formatCurrency(adminCostValue)}
                    </div>
                    <div className="text-[11px] font-mono text-[#667085]">
                      Formula: {adminCostMetric?.formula_code || "C_ADMIN = H_ADMIN * R_HR"}
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-[#667085]">
                      <span>Provenance:</span>
                      <span className="font-semibold text-[#008638]">
                        {adminCostMetric?.provenance || "CALCULATED_RESULT"}
                      </span>
                    </div>
                  </div>

                  {/* Component B: Annual Troubleshooting Labor Cost */}
                  <div className="rounded-xl border border-[#E2E6EE] border-t-3 border-t-[#38B449] bg-white p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#172033]">
                        Troubleshooting Labor Cost
                      </span>
                      <span className="text-[10px] font-mono text-[#667085] bg-slate-100 px-1.5 py-0.5 rounded">
                        C_TRB
                      </span>
                    </div>
                    <div className="text-2xl font-black text-[#172033] font-mono" data-testid="component-trb-cost">
                      {formatCurrency(trbCostValue)}
                    </div>
                    <div className="text-[11px] font-mono text-[#667085]">
                      Formula: {trbCostMetric?.formula_code || "C_TRB = H_TRB * R_HR"}
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-[#667085]">
                      <span>Provenance:</span>
                      <span className="font-semibold text-[#008638]">
                        {trbCostMetric?.provenance || "CALCULATED_RESULT"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#667085] italic">
                  * Component costs are retrieved directly from the CalculationSnapshot without client-side recalculation.
                </div>
              </div>

              {/* Intermediate Metrics & Operational Factors */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Intermediate Metrics &amp; Operational Factors
                </span>

                <div className="divide-y divide-[#E2E6EE] text-xs">
                  {/* Intermediate 1: H_ADMIN */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#172033]">Annual Administration Hours (H_ADMIN)</div>
                      <div className="text-[11px] text-[#667085] font-mono">
                        {adminHoursMetric?.formula_code || "H_ADMIN = LOOKUP(Q04_EFFORT) * 52"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#172033] font-mono" data-testid="intermediate-admin-hours">
                        {formatNumber(adminHoursMetric?.value)} hrs/yr
                      </div>
                      <div className="text-[10px] text-[#667085]">{adminHoursMetric?.provenance || "MODEL_ASSUMPTION"}</div>
                    </div>
                  </div>

                  {/* Intermediate 2: N_EVENTS */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#172033]">Annual Troubleshooting Events (N_EVENTS)</div>
                      <div className="text-[11px] text-[#667085] font-mono">
                        {trbEventsMetric?.formula_code || "N_EVENTS = LOOKUP(Q06_FREQUENCY)"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#172033] font-mono" data-testid="intermediate-trb-events">
                        {formatNumber(trbEventsMetric?.value)} events/yr
                      </div>
                      <div className="text-[10px] text-[#667085]">{trbEventsMetric?.provenance || "MODEL_ASSUMPTION"}</div>
                    </div>
                  </div>

                  {/* Intermediate 3: H_INV */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#172033]">Hours per Investigation (H_INV)</div>
                      <div className="text-[11px] text-[#667085] font-mono">
                        {invHoursMetric?.formula_code || "H_INV = LOOKUP(Q07_STAFF_HOURS)"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#172033] font-mono" data-testid="intermediate-inv-hours">
                        {formatNumber(invHoursMetric?.value)} hrs/event
                      </div>
                      <div className="text-[10px] text-[#667085]">{invHoursMetric?.provenance || "MODEL_ASSUMPTION"}</div>
                    </div>
                  </div>

                  {/* Intermediate 4: H_TRB */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#172033]">Annual Troubleshooting Hours (H_TRB)</div>
                      <div className="text-[11px] text-[#667085] font-mono">
                        {trbHoursMetric?.formula_code || "H_TRB = N_EVENTS * H_INV"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#172033] font-mono" data-testid="intermediate-trb-hours">
                        {formatNumber(trbHoursMetric?.value)} hrs/yr
                      </div>
                      <div className="text-[10px] text-[#667085]">{trbHoursMetric?.provenance || "CALCULATED_RESULT"}</div>
                    </div>
                  </div>

                  {/* Intermediate 5: Loaded Labor Rate */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#172033]">Loaded Hourly Engineering Rate (R_HR)</div>
                      <div className="text-[11px] text-[#667085] font-mono">
                        {loadedRateMetric?.formula_code || "R_HR = L_ANNUAL / 2080"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#172033] font-mono" data-testid="intermediate-hourly-rate">
                        ${Number(loadedRateMetric?.value || 86.54).toFixed(2)}/hr
                      </div>
                      <div className="text-[10px] text-[#667085]">
                        {loadedLaborMetric?.provenance === "CUSTOMER_FACT" ? "Customer Rate" : "Standard Default"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Questions & Assessment Inputs Lineage */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Source Questions &amp; Input Lineage
                </span>

                <div className="space-y-2.5 text-xs">
                  {/* Q04 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q04</span>
                      <span className="font-medium text-[#172033]">Routine Administration Effort:</span>
                      <div className="text-[11px] text-[#667085]">Feeds H_ADMIN (Weekly hours × 52)</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q04">
                      {answers.q04_dropdown || (answers.q04_admin_hours ? `${answers.q04_admin_hours} hrs/wk` : "1–5 hrs/week (Default)")}
                    </div>
                  </div>

                  {/* Q06 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q06</span>
                      <span className="font-medium text-[#172033]">Troubleshooting Frequency:</span>
                      <div className="text-[11px] text-[#667085]">Feeds N_EVENTS (Annual investigation volume)</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q06">
                      {answers.q06_frequency || "2–3 times / week (Default)"}
                    </div>
                  </div>

                  {/* Q07 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q07</span>
                      <span className="font-medium text-[#172033]">Hours per Investigation:</span>
                      <div className="text-[11px] text-[#667085]">Feeds H_INV (Staff effort per bridge investigation)</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q07">
                      {answers.q07_labor_hours || (answers.q07_override ? `${answers.q07_override} hrs` : "2–4 hours (Default)")}
                    </div>
                  </div>

                  {/* Q20 */}
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-[#008638] font-mono mr-1.5">Q20</span>
                      <span className="font-medium text-[#172033]">Loaded Annual Labor Rate:</span>
                      <div className="text-[11px] text-[#667085]">Feeds L_ANNUAL &amp; R_HR ($180,000 / 2,080 hrs)</div>
                    </div>
                    <div className="font-mono font-semibold text-[#172033] text-right shrink-0" data-testid="input-q20">
                      {answers.q20_use_default
                        ? "$180,000 / yr (Default)"
                        : answers.q20_annual_labor_rate
                        ? `$${answers.q20_annual_labor_rate.toLocaleString()} / yr`
                        : "$180,000 / yr (Default)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Assumptions & Benchmarks */}
              <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
                  Model Assumptions &amp; Benchmarks Used
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">Standard Working Hours</div>
                    <div className="font-bold text-[#172033] font-mono" data-testid="assumption-working-hours">
                      {assumptions.annual_working_hours || 2080} hours / year
                    </div>
                    <div className="text-[10px] text-[#667085]">Model Standard Benchmark</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E6EE] space-y-1">
                    <div className="text-[11px] text-[#667085] uppercase font-semibold">Default Loaded Labor Rate</div>
                    <div className="font-bold text-[#172033] font-mono" data-testid="assumption-default-labor">
                      ${Number(assumptions.default_annual_loaded_labor_cost || 180000).toLocaleString()} / year
                    </div>
                    <div className="text-[10px] text-[#667085]">Model Standard Default</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. Technical Provenance & Execution Details (Universal) */}
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E6EE] p-4 text-xs space-y-2 text-[#667085]">
            <div className="flex items-center space-x-1.5 font-bold text-[#172033]">
              <ShieldCheck className="h-4 w-4 text-[#008638]" />
              <span>Technical Provenance &amp; Engine Trace</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-[#8A94A6]">Engine Version:</span>{" "}
                <span className="text-[#172033] font-semibold" data-testid="engine-version">
                  {calculation.calculation_engine_version || "1.0.0"}
                </span>
              </div>
              <div>
                <span className="text-[#8A94A6]">Rule Version:</span>{" "}
                <span className="text-[#172033] font-semibold" data-testid="rule-version">
                  {targetMetric?.rule_version || "1.0.0"}
                </span>
              </div>
              <div className="col-span-2 truncate">
                <span className="text-[#8A94A6]">Snapshot ID:</span>{" "}
                <span className="text-[#172033] font-semibold" data-testid="snapshot-id">
                  {calculation.snapshot_id || (calculation as any).id || "IMMUTABLE"}
                </span>
              </div>
              <div className="col-span-2 truncate">
                <span className="text-[#8A94A6]">Calculated At:</span>{" "}
                <span className="text-[#172033]" data-testid="calculated-at">
                  {calculation.calculated_at || "Deterministic Run"}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-[#E2E6EE] text-[11px] text-[#8A94A6] leading-relaxed">
              * Calculated with pure Python Decimal deterministic precision. All business logic, constants, and lookup tables are authoritative and immutable.
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E2E6EE] bg-white flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#172033] bg-[#F1F3F7] hover:bg-[#E2E6EE] rounded-lg transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};

