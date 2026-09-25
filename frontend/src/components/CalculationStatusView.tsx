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
      <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Deterministic Calculation Complete</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Engine v{calculation.calculation_engine_version}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2 text-white">
              Assessment Economic Baseline & Scenario Results
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Snapshot created at {new Date(calculation.calculated_at).toLocaleString()} • Immutable provenance verified
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToWizard}
            className="inline-flex items-center space-x-2 rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Intake Wizard</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Operational Labor */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Operational Labor
            </span>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.total_operational_labor_cost)}
            </span>
            <span className="text-xs font-medium text-slate-500">/ year</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Sum of routine administration ({formatCurrency(summary.admin_annual_cost)}) & reactive troubleshooting ({formatCurrency(summary.troubleshooting_annual_cost)})
          </p>
        </div>

        {/* Operational FTE Burden */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Operational FTE Burden
            </span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatNumber(summary.operational_fte_burden, 2)} FTE
            </span>
            <span className="text-xs font-medium text-slate-500">
              {formatNumber(
                (summary.admin_annual_hours || 0) + (summary.troubleshooting_annual_hours || 0),
                0
              )}{" "}
              hrs/yr
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Standard annual capacity based on 2,080 working hours per engineer
          </p>
        </div>

        {/* Representative Single-Event Exposure */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Single-Event Disruption Exposure
            </span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.representative_single_event_exposure)}
            </span>
            <span className="text-xs font-medium text-slate-500">per outage</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Representative outage exposure (Duration × Financial Rate); not annualized
          </p>
        </div>

        {/* meshIQ Illustrative Labor Savings */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between text-blue-900">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                meshIQ Illustrative Labor Savings (Decomposed Scenario)
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-blue-700">
              {formatNumber(summary.total_recoverable_labor_hours, 1)} Recoverable Hours
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-950">
              {formatCurrency(summary.illustrative_annual_labor_savings)}
            </span>
            <span className="text-xs font-semibold text-blue-800">annual value</span>
          </div>
          <p className="mt-1 text-xs text-blue-800/80">
            50% addressable admin × 50% efficiency + 25% investigation improvement at loaded labor rate
          </p>
        </div>

        {/* Distinct 10% Productivity Opportunity */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-900">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                10% Productivity Opp.
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-950">
              {formatCurrency(summary.troubleshooting_productivity_opportunity)}
            </span>
            <span className="text-xs font-medium text-emerald-800">separate metric</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-800/80">
            10% troubleshooting labor productivity opportunity (distinct from 25% recovery)
          </p>
        </div>
      </div>

      {/* Detailed Lineage & Metrics Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Complete Computed Metrics & Provenance Lineage
            </h2>
            <p className="text-xs text-slate-500">
              Strict audit trail of all deterministic outputs and calculation states
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600">
            Rule Version: calc-rules-v1.0.0
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
            <thead className="bg-slate-50/60 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4">Metric Identifier</th>
                <th className="py-3 px-4">Calculated Value</th>
                <th className="py-3 px-4">Evaluation State</th>
                <th className="py-3 px-4">Provenance Tier</th>
                <th className="py-3 px-4">Formula / Source Logic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(calculation.computed_metrics).map(([key, metric]) => (
                <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">
                    {key}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
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
                          ? "bg-emerald-100 text-emerald-800"
                          : metric.state === "INSUFFICIENT_DATA"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {metric.state}
                    </span>
                    {metric.state_reason && (
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {metric.state_reason}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {metric.provenance}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
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
