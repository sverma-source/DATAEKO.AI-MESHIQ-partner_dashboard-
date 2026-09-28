"use client";

import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  HelpCircle,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { CalculationRunResponse } from "../types/assessment";

interface CalculationStatusViewProps {
  calculation: CalculationRunResponse;
  onBackToWizard: () => void;
}

export const CalculationStatusView: React.FC<CalculationStatusViewProps> = ({
  calculation,
  onBackToWizard,
}) => {
  const summary = calculation.summary;

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val?: number, decimals = 1) => {
    if (val === undefined || val === null) return "—";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: decimals,
    }).format(val);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="rounded-2xl bg-[#0D1322] p-6 sm:p-8 text-white shadow-xl border border-[#1E293B]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-[#38B449]/20 px-3 py-1 text-xs font-bold text-[#8CC63E] border border-[#38B449]/40">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#38B449]" />
                <span>Deterministic Calculation Complete</span>
              </span>
              <span className="text-xs text-slate-400 font-mono bg-[#1E293B] px-2 py-0.5 rounded border border-slate-700">
                Engine v{calculation.calculation_engine_version}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-white">
              Assessment Economic Baseline &amp; Scenario Results
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Snapshot created at {new Date(calculation.calculated_at).toLocaleString()} • Immutable provenance verified
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToWizard}
            className="inline-flex items-center space-x-2 rounded-lg bg-[#1E293B] px-4 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Intake Wizard</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Operational Labor */}
        <div className="rounded-xl border border-[#E2E6EE] border-t-4 border-t-[#38B449] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Operational Labor
            </span>
            <DollarSign className="h-4 w-4 text-[#38B449]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] font-mono">
              {formatCurrency(summary.total_operational_labor_cost)}
            </span>
            <span className="text-xs font-semibold text-[#667085]">/ year</span>
          </div>
          <p className="mt-1 text-[11px] text-[#667085]">
            Sum of routine administration ({formatCurrency(summary.admin_annual_cost)}) &amp; reactive troubleshooting ({formatCurrency(summary.troubleshooting_annual_cost)})
          </p>
        </div>

        {/* Operational FTE Burden */}
        <div className="rounded-xl border border-[#E2E6EE] border-t-4 border-t-[#172033] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Operational FTE Burden
            </span>
            <Clock className="h-4 w-4 text-[#172033]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] font-mono">
              {formatNumber(summary.operational_fte_burden, 2)} FTE
            </span>
            <span className="text-xs font-medium text-[#667085]">
              {formatNumber(
                (summary.admin_annual_hours || 0) + (summary.troubleshooting_annual_hours || 0),
                0
              )}{" "}
              hrs/yr
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#667085]">
            Standard annual capacity based on 2,080 working hours per engineer
          </p>
        </div>

        {/* Representative Single-Event Exposure */}
        <div className="rounded-xl border border-[#E2E6EE] border-t-4 border-t-amber-500 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-bold uppercase tracking-wider">
              Single-Event Disruption Exposure
            </span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] font-mono">
              {formatCurrency(summary.representative_single_event_exposure)}
            </span>
            <span className="text-xs font-semibold text-[#667085]">per outage</span>
          </div>
          <p className="mt-1 text-[11px] text-[#667085]">
            Representative outage exposure (Duration × Financial Rate); not annualized
          </p>
        </div>

        {/* meshIQ Illustrative Labor Savings */}
        <div className="rounded-xl border border-[#A8E2B5] border-t-4 border-t-[#38B449] bg-[#EEF8F0] p-5 shadow-xs sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between text-[#172033]">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-[#38B449]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#008638]">
                meshIQ Illustrative Labor Savings (Decomposed Scenario)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#008638]">
              {formatNumber(summary.total_recoverable_labor_hours, 1)} Recoverable Hours
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#172033] font-mono">
              {formatCurrency(summary.illustrative_annual_labor_savings)}
            </span>
            <span className="text-xs font-bold text-[#008638]">annual value</span>
          </div>
          <p className="mt-1 text-xs text-[#667085]">
            50% addressable admin × 50% efficiency + 25% investigation improvement at loaded labor rate
          </p>
        </div>

        {/* Distinct 10% Productivity Opportunity */}
        <div className="rounded-xl border border-emerald-200 border-t-4 border-t-emerald-500 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#172033]">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#172033]">
                10% Productivity Opp.
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#172033] font-mono">
              {formatCurrency(summary.troubleshooting_productivity_opportunity)}
            </span>
            <span className="text-xs font-semibold text-emerald-700">separate metric</span>
          </div>
          <p className="mt-1 text-[11px] text-[#667085]">
            10% troubleshooting labor productivity opportunity (distinct from 25% recovery)
          </p>
        </div>
      </div>

      {/* Detailed Lineage & Metrics Table */}
      <div className="rounded-xl border border-[#E2E6EE] bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E6EE] bg-[#F1F3F7] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172033]">
              Complete Computed Metrics &amp; Provenance Lineage
            </h2>
            <p className="text-xs text-[#667085]">
              Strict audit trail of all deterministic outputs and calculation states
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#667085]">
            Rule Version: calc-rules-v1.0.0
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E2E6EE] text-xs text-left">
            <thead className="bg-[#F1F3F7] font-bold text-[#172033]">
              <tr>
                <th className="py-3 px-4">Metric Identifier</th>
                <th className="py-3 px-4">Calculated Value</th>
                <th className="py-3 px-4">Evaluation State</th>
                <th className="py-3 px-4">Provenance Tier</th>
                <th className="py-3 px-4">Formula / Source Logic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EE]">
              {Object.entries(calculation.computed_metrics).map(([key, metric]) => (
                <tr key={key} className="hover:bg-[#EEF8F0]/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#172033]">
                    {key}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#172033]">
                    {metric.value !== null && metric.value !== undefined
                      ? typeof metric.value === "number" || !isNaN(Number(metric.value))
                        ? Number(metric.value).toLocaleString()
                        : String(metric.value)
                      : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        metric.state === "VALID" || metric.state === "VALID_WITH_DEFAULTS"
                          ? "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                          : metric.state === "INSUFFICIENT_DATA"
                          ? "bg-amber-50 text-amber-800 border border-amber-300"
                          : "bg-[#F1F3F7] text-[#172033]"
                      }`}
                    >
                      {metric.state}
                    </span>
                    {metric.state_reason && (
                      <span className="block text-[10px] text-[#667085] mt-0.5">
                        {metric.state_reason}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#667085]">
                    {metric.provenance}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#667085]">
                    {metric.formula_code || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
