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
      <div
        role="region"
        aria-label="Annual Labor Hours Composition chart"
        className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-[#38B449]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Annual Labor Hours Composition
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
                Calculated Metric
              </span>
              <span className="text-xs font-mono font-bold text-[#172033]">
                {formatNumber(totalHours)} Total Hours/yr
              </span>
            </div>
          </div>
          <p className="text-xs text-[#667085] mt-1.5">
            Decomposition between routine administration and reactive incident troubleshooting.
          </p>

          {/* Stacked Proportional Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-6 w-full rounded-lg bg-[#F1F3F7] flex overflow-hidden border border-[#E2E6EE] p-0.5">
              <div
                style={{ width: `${adminHoursPct}%` }}
                className="bg-[#172033] rounded-l transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Routine Admin: ${formatNumber(adminHours)} hrs (${adminHoursPct.toFixed(1)}%)`}
              >
                {adminHoursPct > 15 ? `${adminHoursPct.toFixed(0)}%` : ""}
              </div>
              <div
                style={{ width: `${trbHoursPct}%` }}
                className="bg-[#38B449] rounded-r transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Troubleshooting: ${formatNumber(trbHours)} hrs (${trbHoursPct.toFixed(1)}%)`}
              >
                {trbHoursPct > 15 ? `${trbHoursPct.toFixed(0)}%` : ""}
              </div>
            </div>

            {/* Legend & Numbers */}
            <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-[#172033] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#172033]">Routine Administration</div>
                  <div className="text-[#667085] font-mono text-[11px]">
                    {formatNumber(adminHours)} hrs/yr ({adminHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-[#38B449] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#172033]">Incident Troubleshooting</div>
                  <div className="text-[#667085] font-mono text-[11px]">
                    {formatNumber(trbHours)} hrs/yr ({trbHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#667085] bg-[#F1F3F7] p-3 rounded-lg">
          <span className="font-medium text-[#172033]">Operational FTE Burden:</span>
          <span className="font-bold text-[#172033] font-mono">
            {formatNumber(summary.operational_fte_burden, 2)} FTE
          </span>
        </div>
      </div>

      {/* Chart 2: Operational Cost Distribution */}
      <div
        role="region"
        aria-label="Operational Labor Cost Distribution chart"
        className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-[#38B449]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Operational Labor Cost Distribution
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
                Calculated Metric
              </span>
              <span className="text-xs font-mono font-bold text-[#008638]">
                {formatCurrency(totalCost)} / yr
              </span>
            </div>
          </div>
          <p className="text-xs text-[#667085] mt-1.5">
            Total quantified internal labor expenditure (loaded rate × annual hours).
          </p>

          {/* Stacked Proportional Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-6 w-full rounded-lg bg-[#F1F3F7] flex overflow-hidden border border-[#E2E6EE] p-0.5">
              <div
                style={{ width: `${adminCostPct}%` }}
                className="bg-[#172033] rounded-l transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Admin Cost: ${formatCurrency(adminCost)} (${adminCostPct.toFixed(1)}%)`}
              >
                {adminCostPct > 15 ? `${adminCostPct.toFixed(0)}%` : ""}
              </div>
              <div
                style={{ width: `${trbCostPct}%` }}
                className="bg-[#008638] rounded-r transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Troubleshooting Cost: ${formatCurrency(trbCost)} (${trbCostPct.toFixed(1)}%)`}
              >
                {trbCostPct > 15 ? `${trbCostPct.toFixed(0)}%` : ""}
              </div>
            </div>

            {/* Legend & Numbers */}
            <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-[#172033] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#172033]">Admin Labor Cost</div>
                  <div className="text-[#667085] font-mono text-[11px]">
                    {formatCurrency(adminCost)}/yr ({adminCostPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-[#008638] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#172033]">Troubleshooting Cost</div>
                  <div className="text-[#667085] font-mono text-[11px]">
                    {formatCurrency(trbCost)}/yr ({trbCostPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#667085] bg-[#F1F3F7] p-3 rounded-lg">
          <span className="font-medium text-[#172033]">Loaded Hourly Labor Rate:</span>
          <span className="font-bold text-[#172033] font-mono">
            {calculation.computed_metrics.internal_loaded_hourly_rate?.value
              ? `$${Number(calculation.computed_metrics.internal_loaded_hourly_rate.value).toFixed(2)}/hr`
              : "$86.54/hr"}
          </span>
        </div>
      </div>

      {/* Chart 3: meshIQ Scenario Capacity Recovery Breakdown */}
      <div
        role="region"
        aria-label="Illustrative Labor Recovery Model chart"
        className="rounded-xl border border-[#A8E2B5] bg-gradient-to-br from-white to-[#EEF8F0] p-6 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-[#38B449]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Illustrative Labor Recovery Model
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Scenario Projection
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                {formatNumber(recHours)} Recoverable Hours
              </span>
            </div>
          </div>
          <p className="text-xs text-[#667085] mt-1.5">
            Projected capacity liberated under approved 50%×50% admin &amp; 25% diagnostic improvements.
          </p>

          {/* Recovery Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="h-6 w-full rounded-lg bg-[#F1F3F7] flex overflow-hidden border border-[#E2E6EE] p-0.5">
              <div
                style={{ width: `${recHoursPct}%` }}
                className="bg-[#38B449] rounded-l transition-all flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                title={`Recoverable Hours: ${formatNumber(recHours)} hrs (${recHoursPct.toFixed(1)}%)`}
              >
                {recHoursPct > 10 ? `${recHoursPct.toFixed(0)}%` : ""}
              </div>
              <div
                style={{ width: `${retainedHoursPct}%` }}
                className="bg-[#CBD2DE] rounded-r transition-all flex items-center justify-center text-[10px] font-bold text-[#172033] tracking-wider"
                title={`Remaining Operational Baseline: ${formatNumber(totalHours - recHours)} hrs`}
              >
                {retainedHoursPct > 15 ? "Remaining Baseline" : ""}
              </div>
            </div>

            {/* Sub-breakdown */}
            <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-[#38B449] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#172033]">Liberated Capacity</div>
                  <div className="text-[#667085] font-mono text-[11px]">
                    {formatNumber(recHours)} hrs/yr ({recHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-3.5 w-3.5 rounded bg-[#CBD2DE] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#172033]">Remaining Baseline</div>
                  <div className="text-[#667085] font-mono text-[11px]">
                    {formatNumber(Math.max(0, totalHours - recHours))} hrs/yr ({retainedHoursPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#A8E2B5] flex items-center justify-between text-xs bg-white p-3 rounded-lg border border-[#A8E2B5]">
          <span className="font-bold text-[#172033]">Illustrative Economic Value:</span>
          <span className="font-bold text-[#008638] font-mono text-sm">
            {formatCurrency(recSavings)} / yr
          </span>
        </div>
      </div>

      {/* Chart 4: Environmental & Risk Profile Matrix */}
      <div
        role="region"
        aria-label="Operational and Governance Indicators summary"
        className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[#172033]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Operational &amp; Governance Indicators
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              Customer Facts
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1.5">
            Qualitative complexity and risk dimensions captured during discovery interview.
          </p>

          <div className="mt-5 space-y-3 text-xs">
            {/* Indicator 1: Queue Manager Estate Scale */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F1F3F7] border border-[#E2E6EE]">
              <span className="text-[#667085] font-medium">Estate Scale (Q01):</span>
              <span className="font-bold text-[#172033] bg-white px-2 py-0.5 rounded border border-[#CBD2DE]">
                {answers.q01_scale || "51–100 QMGRs"}
              </span>
            </div>

            {/* Indicator 2: Tooling Complexity */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F1F3F7] border border-[#E2E6EE]">
              <span className="text-[#667085] font-medium">Monitoring Tools (Q09):</span>
              <span className="font-bold text-[#172033] bg-white px-2 py-0.5 rounded border border-[#CBD2DE]">
                {answers.q09_tools_count || "2–3 disparate tools"}
              </span>
            </div>

            {/* Indicator 3: Tracing Friction */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F1F3F7] border border-[#E2E6EE]">
              <span className="text-[#667085] font-medium">Tracing Visibility (Q10):</span>
              <span className="font-bold text-[#172033] bg-white px-2 py-0.5 rounded border border-[#CBD2DE]">
                {answers.q10_manual_tracing || "Mostly manual"}
              </span>
            </div>

            {/* Indicator 4: Audit Pressure */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F1F3F7] border border-[#E2E6EE]">
              <span className="text-[#667085] font-medium">Audit Pressure (Q18):</span>
              <span className="font-bold text-[#172033] bg-white px-2 py-0.5 rounded border border-[#CBD2DE]">
                {answers.q18_audit_effort || "Moderate pressure"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#667085] bg-[#F1F3F7] p-3 rounded-lg">
          <span className="font-medium text-[#172033]">Modernization Urgency (Q22):</span>
          <span className="font-bold text-[#172033]">
            {answers.q22_migration_plans || "Near-term (90–180 days)"}
          </span>
        </div>
      </div>
    </div>
  );
};
