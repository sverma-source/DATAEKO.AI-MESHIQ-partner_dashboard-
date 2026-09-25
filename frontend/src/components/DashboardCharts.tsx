"use client";

import React from "react";
import {
  Clock,
  DollarSign,
  TrendingDown,
  Layers,
  Shield,
  Activity,
} from "lucide-react";
import { SummaryMetrics, CalculationRunResponse } from "../types/assessment";

interface DashboardChartsProps {
  calculation: CalculationRunResponse;
  answers?: Record<string, any>;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  calculation,
  answers = {},
}) => {
  const summary = calculation.summary;

  const adminHours = summary.admin_annual_hours || 0;
  const trbHours = summary.troubleshooting_annual_hours || 0;
  const totalHours = adminHours + trbHours;

  const adminCost = summary.admin_annual_cost || 0;
  const trbCost = summary.troubleshooting_annual_cost || 0;
  const totalCost = summary.total_operational_labor_cost || (adminCost + trbCost);

  const recHours = summary.total_recoverable_labor_hours || 0;
  const recSavings = summary.illustrative_annual_labor_savings || 0;

  // Percentages for bar calculations
  const adminHoursPct = totalHours > 0 ? (adminHours / totalHours) * 100 : 50;
  const trbHoursPct = totalHours > 0 ? (trbHours / totalHours) * 100 : 50;

  const adminCostPct = totalCost > 0 ? (adminCost / totalCost) * 100 : 50;
  const trbCostPct = totalCost > 0 ? (trbCost / totalCost) * 100 : 50;

  const recHoursPct = totalHours > 0 ? Math.min(100, (recHours / totalHours) * 100) : 0;
  const retainedHoursPct = Math.max(0, 100 - recHoursPct);

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatNumber = (val?: number, decimals = 0) => {
    if (val === undefined || val === null) return "—";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: decimals,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Operational Labor Hours Composition */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Annual Labor Hours Composition
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              {formatNumber(totalHours)} Total Hours/yr
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Decomposition between routine administration and reactive incident troubleshooting.
          </p>

          {/* Stacked Proportional Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-6 w-full rounded-lg bg-slate-100 flex overflow-hidden border border-slate-200 p-0.5">
              <div
                style={{ width: `${adminHoursPct}%` }}
                className="bg-blue-600 rounded-l transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Routine Admin: ${formatNumber(adminHours)} hrs (${adminHoursPct.toFixed(1)}%)`}
              >
                {adminHoursPct > 15 ? `${adminHoursPct.toFixed(0)}%` : ""}
              </div>
              <div
                style={{ width: `${trbHoursPct}%` }}
                className="bg-indigo-600 rounded-r transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Troubleshooting: ${formatNumber(trbHours)} hrs (${trbHoursPct.toFixed(1)}%)`}
              >
                {trbHoursPct > 15 ? `${trbHoursPct.toFixed(0)}%` : ""}
              </div>
            </div>

            {/* Legend & Numbers */}
            <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Routine Administration</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {formatNumber(adminHours)} hrs/yr ({adminHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Incident Troubleshooting</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {formatNumber(trbHours)} hrs/yr ({trbHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/70 p-3 rounded-lg">
          <span>Operational FTE Burden:</span>
          <span className="font-bold text-slate-900 font-mono">
            {formatNumber(summary.operational_fte_burden, 2)} FTE
          </span>
        </div>
      </div>

      {/* Chart 2: Operational Cost Distribution */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Operational Labor Cost Distribution
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-700">
              {formatCurrency(totalCost)} / yr
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total quantified internal labor expenditure (loaded rate × annual hours).
          </p>

          {/* Stacked Proportional Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-6 w-full rounded-lg bg-slate-100 flex overflow-hidden border border-slate-200 p-0.5">
              <div
                style={{ width: `${adminCostPct}%` }}
                className="bg-blue-700 rounded-l transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Admin Cost: ${formatCurrency(adminCost)} (${adminCostPct.toFixed(1)}%)`}
              >
                {adminCostPct > 15 ? `${adminCostPct.toFixed(0)}%` : ""}
              </div>
              <div
                style={{ width: `${trbCostPct}%` }}
                className="bg-emerald-600 rounded-r transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Troubleshooting Cost: ${formatCurrency(trbCost)} (${trbCostPct.toFixed(1)}%)`}
              >
                {trbCostPct > 15 ? `${trbCostPct.toFixed(0)}%` : ""}
              </div>
            </div>

            {/* Legend & Numbers */}
            <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-blue-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Admin Labor Cost</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {formatCurrency(adminCost)}/yr ({adminCostPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Troubleshooting Cost</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {formatCurrency(trbCost)}/yr ({trbCostPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/70 p-3 rounded-lg">
          <span>Loaded Hourly Labor Rate:</span>
          <span className="font-bold text-slate-900 font-mono">
            {calculation.computed_metrics.internal_loaded_hourly_rate?.value
              ? `$${Number(calculation.computed_metrics.internal_loaded_hourly_rate.value).toFixed(2)}/hr`
              : "$86.54/hr"}
          </span>
        </div>
      </div>

      {/* Chart 3: meshIQ Scenario Capacity Recovery Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Illustrative Labor Recovery Model
              </h3>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {formatNumber(recHours)} Recoverable Hours
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Projected capacity liberated under approved 50%×50% admin & 25% diagnostic improvements.
          </p>

          {/* Recovery Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-6 w-full rounded-lg bg-slate-100 flex overflow-hidden border border-slate-200 p-0.5">
              <div
                style={{ width: `${recHoursPct}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-l transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider shadow-inner"
                title={`Recoverable Hours: ${formatNumber(recHours)} hrs (${recHoursPct.toFixed(1)}%)`}
              >
                {recHoursPct > 10 ? `${recHoursPct.toFixed(0)}%` : ""}
              </div>
              <div
                style={{ width: `${retainedHoursPct}%` }}
                className="bg-slate-300 rounded-r transition-all flex items-center justify-center text-[10px] font-semibold text-slate-700 tracking-wider"
                title={`Remaining Operational Baseline: ${formatNumber(totalHours - recHours)} hrs`}
              >
                {retainedHoursPct > 15 ? "Remaining Baseline" : ""}
              </div>
            </div>

            {/* Sub-breakdown */}
            <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Liberated Capacity</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {formatNumber(recHours)} hrs/yr ({recHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-slate-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-800">Retained Operations</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {formatNumber(Math.max(0, totalHours - recHours))} hrs/yr ({retainedHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200/50">
          <span className="font-medium text-emerald-950">Illustrative Economic Value:</span>
          <span className="font-bold text-emerald-700 font-mono text-sm">
            {formatCurrency(recSavings)} / yr
          </span>
        </div>
      </div>

      {/* Chart 4: Environmental & Risk Profile Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Operational & Governance Indicators
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Contextual Discovery
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Qualitative complexity and risk dimensions captured during discovery interview.
          </p>

          <div className="mt-5 space-y-3 text-xs">
            {/* Indicator 1: Queue Manager Estate Scale */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-medium">Estate Scale (Q01):</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {answers.q01_scale || "51–100 QMGRs"}
              </span>
            </div>

            {/* Indicator 2: Tooling Complexity */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-medium">Monitoring Tools (Q09):</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {answers.q09_tools_count || "2–3 disparate tools"}
              </span>
            </div>

            {/* Indicator 3: Tracing Friction */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-medium">Tracing Visibility (Q10):</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {answers.q10_manual_tracing || "Mostly manual"}
              </span>
            </div>

            {/* Indicator 4: Audit Pressure */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-600 font-medium">Audit Pressure (Q18):</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {answers.q18_audit_effort || "Moderate pressure"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/70 p-3 rounded-lg">
          <span>Modernization Urgency (Q22):</span>
          <span className="font-bold text-slate-800">
            {answers.q22_migration_plans || "Near-term (90–180 days)"}
          </span>
        </div>
      </div>
    </div>
  );
};
