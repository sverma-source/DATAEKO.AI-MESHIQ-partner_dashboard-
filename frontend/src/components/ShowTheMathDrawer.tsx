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
  X,
} from "lucide-react";
import { CalculationRunResponse, MetricResult } from "../types/assessment";
import { ProvenanceBadge } from "./ProvenanceBadge";

export type MathTargetMetricKey =
  | "total_quantified_labor_cost"
  | "potential_financial_exposure";

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

  // Target Metric: total_quantified_labor_cost vs potential_financial_exposure
  const targetMetric: MetricResult | undefined = isExposure
    ? metrics.potential_financial_exposure || metrics.representative_single_event_exposure
    : metrics.total_quantified_labor_cost;

  const targetValue = isExposure
    ? targetMetric?.value ?? summary.representative_single_event_exposure ?? null
    : targetMetric?.value ?? summary.total_operational_labor_cost ?? null;

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
                  {isExposure ? "potential_financial_exposure" : "total_quantified_labor_cost"}
                </span>
                {renderStateBadge(targetMetric?.state)}
              </div>

              <div className="flex items-baseline space-x-2">
                <span
                  className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight"
                  data-testid="target-metric-value"
                >
                  {formatCurrency(targetValue)}
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {isExposure ? "USD / event" : "USD / year"}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {isExposure
                  ? "Modeled financial impact of a single major messaging disruption event (Representative Duration × Applicable Downtime Rate). Not an annualized loss."
                  : "Authoritative annual quantified engineering labor cost derived deterministically across routine queue administration and reactive incident troubleshooting."}
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
                provenance={targetMetric?.provenance || "CALCULATED_RESULT"}
                state={targetMetric?.state || "VALID"}
              />
            </div>

            <div className="rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] p-3 font-mono text-xs text-[#172033] flex flex-col space-y-1">
              <div className="text-[11px] text-[#667085] uppercase font-bold">Rule Set Formula:</div>
              <div className="font-bold text-[#008638] text-sm" data-testid="canonical-formula-code">
                {isExposure
                  ? targetMetric?.formula_code || "EXPOSURE_SINGLE = D_HOURS * R_IMPACT"
                  : targetMetric?.formula_code || "C_TOTAL = C_ADMIN + C_TRB"}
              </div>
              <div className="text-[11px] text-[#667085] pt-1">
                {isExposure ? (
                  <>
                    Where <code className="text-[#172033] font-bold">EXPOSURE_SINGLE</code> is Single-Event Financial Exposure,{" "}
                    <code className="text-[#172033] font-bold">D_HOURS</code> is Representative Disruption Duration (hours), and{" "}
                    <code className="text-[#172033] font-bold">R_IMPACT</code> is Applicable Hourly Downtime Cost ($/hr).
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

          {/* 3. Component Breakdown (Read Directly from Snapshot) */}
          {isExposure ? (
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
          ) : (
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
          )}

          {/* 4. Customer Fact vs Benchmark / Assumption Classification (E2 Specific) */}
          {isExposure && (
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
          )}

          {/* 5. Intermediate Metrics & Operational Factors (E1 Labor Cost only) */}
          {!isExposure && (
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
          )}

          {/* 6. Source Questions & Assessment Inputs Lineage */}
          <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
              Source Questions &amp; Input Lineage
            </span>

            {isExposure ? (
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
            ) : (
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
            )}
          </div>

          {/* 7. Model Assumptions & Benchmarks */}
          <div className="rounded-xl bg-white border border-[#E2E6EE] p-4.5 sm:p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">
              Model Assumptions &amp; Benchmarks Used
            </span>

            {isExposure ? (
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
            ) : (
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
            )}
          </div>

          {/* 8. Technical Provenance & Execution Details */}
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
