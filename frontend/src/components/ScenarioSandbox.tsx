"use client";

import React, { useState } from "react";
import {
  Sliders,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
} from "lucide-react";
import { CalculationRunResponse } from "../types/assessment";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface ScenarioSandboxProps {
  calculation: CalculationRunResponse;
}

export const ScenarioSandbox: React.FC<ScenarioSandboxProps> = ({ calculation }) => {
  const summary = calculation.summary;
  const adminHours = summary.admin_annual_hours || 0;
  const trbHours = summary.troubleshooting_annual_hours || 0;
  const trbCost = summary.troubleshooting_annual_cost || 0;

  // Extract Loaded Hourly Rate (R_hr)
  const loadedRateMetric = calculation.computed_metrics.internal_loaded_hourly_rate;
  const loadedRate = loadedRateMetric?.value ? Number(loadedRateMetric.value) : 86.53846153846154;

  // Baseline Approved Parameters (Fixed Model Constants)
  const BASELINE_ADDRESSABLE_ADMIN_PCT = 50;
  const BASELINE_ADMIN_EFFICIENCY_PCT = 50;
  const BASELINE_INVESTIGATION_IMPROVEMENT_PCT = 25;

  // User-Defined Scenario Parameters State
  const [addressableAdminPct, setAddressableAdminPct] = useState<number>(BASELINE_ADDRESSABLE_ADMIN_PCT);
  const [adminEfficiencyPct, setAdminEfficiencyPct] = useState<number>(BASELINE_ADMIN_EFFICIENCY_PCT);
  const [investigationImprovementPct, setInvestigationImprovementPct] = useState<number>(BASELINE_INVESTIGATION_IMPROVEMENT_PCT);

  // Check if current parameters match model baseline
  const isModelBaseline =
    addressableAdminPct === BASELINE_ADDRESSABLE_ADMIN_PCT &&
    adminEfficiencyPct === BASELINE_ADMIN_EFFICIENCY_PCT &&
    investigationImprovementPct === BASELINE_INVESTIGATION_IMPROVEMENT_PCT;

  // Reset to Baseline
  const handleResetToBaseline = () => {
    setAddressableAdminPct(BASELINE_ADDRESSABLE_ADMIN_PCT);
    setAdminEfficiencyPct(BASELINE_ADMIN_EFFICIENCY_PCT);
    setInvestigationImprovementPct(BASELINE_INVESTIGATION_IMPROVEMENT_PCT);
  };

  // Baseline Derived Quantities
  const baselineRecAdminHours = adminHours * 0.5 * 0.5; // 25% of H_admin
  const baselineRecTrbHours = trbHours * 0.25; // 25% of H_trb
  const baselineTotalRecHours = baselineRecAdminHours + baselineRecTrbHours;
  const baselineIllustrativeValue = baselineTotalRecHours * loadedRate;

  // Separate 10% Troubleshooting Productivity Opportunity (Fixed baseline concept)
  const troubleshootingOpportunity10Pct = trbCost * 0.1;

  // Interactive Scenario Derived Quantities
  const scenarioRecAdminHours = adminHours * (addressableAdminPct / 100) * (adminEfficiencyPct / 100);
  const scenarioRecTrbHours = trbHours * (investigationImprovementPct / 100);
  const scenarioTotalRecHours = scenarioRecAdminHours + scenarioRecTrbHours;
  const scenarioIllustrativeValue = scenarioTotalRecHours * loadedRate;

  // Delta vs Baseline
  const deltaHours = scenarioTotalRecHours - baselineTotalRecHours;
  const deltaValue = scenarioIllustrativeValue - baselineIllustrativeValue;

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
    <div className="space-y-8">
      {/* Sandbox Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white border border-slate-800 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-400/30">
                <Sliders className="h-3.5 w-3.5" />
                <span>Controlled Scenario Sandbox</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isModelBaseline ? "Baseline Approved Parameters" : "Custom Scenario Active"}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-2 text-white sm:text-3xl">
              meshIQ Efficiency Scenario Modeler
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Model potential operational capacity liberation by adjusting addressable administrative overhead and root-cause diagnostic acceleration parameters.
            </p>
          </div>

          {!isModelBaseline && (
            <button
              type="button"
              onClick={handleResetToBaseline}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors self-start md:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Model Baseline</span>
            </button>
          )}
        </div>
      </div>

      {/* Strict Financial Safeguard Notice */}
      <div className="flex items-start space-x-3 rounded-xl bg-amber-50 p-4 border border-amber-200/90 text-xs text-amber-900">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">Financial Interpretation Safeguard & Historical Integrity:</span>
          <p>
            Scenario models evaluate <em>illustrative capacity liberation</em> based on hypothetical operational improvements. 
            Modifications made in this sandbox are <strong>exploratory client-side simulations</strong> (<em>Scenario only — does not modify the official assessment</em>). 
            Adjusting parameters <strong>never modifies the official assessment, persisted responses, or historical calculation snapshot</strong>.
            Economic value is labeled as <em>"Illustrative Economic Value"</em> and must not be represented as guaranteed cash savings.
          </p>
        </div>
      </div>

      {/* Main Grid: Parameter Controls & Real-Time Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Parameter Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Scenario Assumptions
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  isModelBaseline
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-amber-50 text-amber-800 border border-amber-300"
                }`}
              >
                {isModelBaseline ? "Approved Baseline" : "User-Defined"}
              </span>
            </div>

            {/* Parameter 1: Addressable Admin Share */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="input-addressable-admin" className="font-semibold text-slate-700">
                  Addressable Admin Share (Q04 Scope)
                </label>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border">
                  {addressableAdminPct}%
                </span>
              </div>
              <input
                id="input-addressable-admin"
                type="range"
                min="10"
                max="90"
                step="5"
                value={addressableAdminPct}
                onChange={(e) => setAddressableAdminPct(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Conservative (10%)</span>
                <span className="font-semibold text-slate-700">Baseline: 50%</span>
                <span>Aggressive (90%)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Proportion of routine MQ queue configuration and maintenance amenable to meshIQ automation.
              </p>
            </div>

            {/* Parameter 2: Admin Efficiency Improvement */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="input-admin-efficiency" className="font-semibold text-slate-700">
                  Admin Efficiency Improvement Rate
                </label>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border">
                  {adminEfficiencyPct}%
                </span>
              </div>
              <input
                id="input-admin-efficiency"
                type="range"
                min="10"
                max="90"
                step="5"
                value={adminEfficiencyPct}
                onChange={(e) => setAdminEfficiencyPct(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Conservative (10%)</span>
                <span className="font-semibold text-slate-700">Baseline: 50%</span>
                <span>Aggressive (90%)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Efficiency factor achieved on the addressable portion via self-service provisioning and templated governance.
              </p>
            </div>

            {/* Parameter 3: Investigation Improvement */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="input-investigation-improvement" className="font-semibold text-slate-700">
                  Investigation Improvement (MTTR Acceleration)
                </label>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border">
                  {investigationImprovementPct}%
                </span>
              </div>
              <input
                id="input-investigation-improvement"
                type="range"
                min="5"
                max="60"
                step="5"
                value={investigationImprovementPct}
                onChange={(e) => setInvestigationImprovementPct(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Conservative (5%)</span>
                <span className="font-semibold text-slate-700">Baseline: 25%</span>
                <span>Aggressive (60%)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Reduction in total engineering staff hours spent triaging and resolving bridge-call incidents.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Output & Delta Analysis (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Output Card 1: Illustrative Economic Value & Capacity Liberation */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Scenario Projected Outcomes
                </h3>
              </div>
              <ProvenanceBadge provenance="SCENARIO_PROJECTION" state="VALID" />
            </div>

            {/* High-Level Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Illustrative Economic Value */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">
                  Illustrative Economic Value
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-emerald-950 font-mono">
                    {formatCurrency(scenarioIllustrativeValue)}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">/ year</span>
                </div>
                {!isModelBaseline && (
                  <div className="mt-2 text-[11px] font-semibold flex items-center space-x-1">
                    <span className={deltaValue >= 0 ? "text-emerald-700" : "text-rose-700"}>
                      {deltaValue >= 0 ? `+${formatCurrency(deltaValue)}` : formatCurrency(deltaValue)} vs Baseline Model
                    </span>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-emerald-800/80">
                  Total scenario recovered hours ({formatNumber(scenarioTotalRecHours)} hrs) × loaded hourly labor rate (${loadedRate.toFixed(2)}/hr).
                </p>
              </div>

              {/* Total Recovered Hours */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Total Recovered Labor Hours
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900 font-mono">
                    {formatNumber(scenarioTotalRecHours)} hrs
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ year</span>
                </div>
                {!isModelBaseline && (
                  <div className="mt-2 text-[11px] font-semibold flex items-center space-x-1">
                    <span className={deltaHours >= 0 ? "text-indigo-700" : "text-rose-700"}>
                      {deltaHours >= 0 ? `+${formatNumber(deltaHours)} hrs` : `${formatNumber(deltaHours)} hrs`} vs Baseline Model
                    </span>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-500">
                  Decomposed into routine admin and incident investigation hours.
                </p>
              </div>
            </div>

            {/* Decomposed Hours Table */}
            <div className="overflow-x-auto border-t border-slate-100 pt-4">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200 pb-2">
                    <th className="py-2 font-semibold">Improvement Stream</th>
                    <th className="py-2 font-semibold">Formula / Factor</th>
                    <th className="py-2 font-semibold">Baseline Model</th>
                    <th className="py-2 font-semibold text-slate-900 font-bold">Scenario Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5 font-medium text-slate-900">
                      Routine Admin Capacity Liberation
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">
                      {addressableAdminPct}% × {adminEfficiencyPct}%
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">
                      {formatNumber(baselineRecAdminHours)} hrs
                    </td>
                    <td className="py-2.5 font-mono font-bold text-blue-700">
                      {formatNumber(scenarioRecAdminHours)} hrs
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-slate-900">
                      Investigation / MTTR Acceleration
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">
                      {investigationImprovementPct}% of H_trb
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">
                      {formatNumber(baselineRecTrbHours)} hrs
                    </td>
                    <td className="py-2.5 font-mono font-bold text-indigo-700">
                      {formatNumber(scenarioRecTrbHours)} hrs
                    </td>
                  </tr>
                  <tr className="bg-slate-50/70 font-semibold">
                    <td className="py-2.5 text-slate-900">
                      Total Annual Liberated Capacity
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">
                      Sum of streams
                    </td>
                    <td className="py-2.5 font-mono text-slate-700">
                      {formatNumber(baselineTotalRecHours)} hrs
                    </td>
                    <td className="py-2.5 font-mono font-bold text-emerald-700">
                      {formatNumber(scenarioTotalRecHours)} hrs
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Separate 10% Troubleshooting Productivity Opportunity Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Troubleshooting Productivity Opportunity (Separate 10% Rule)
                </h4>
              </div>
              <ProvenanceBadge provenance="MODEL_ASSUMPTION" state="VALID" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xl font-bold text-purple-950 font-mono">
                {formatCurrency(troubleshootingOpportunity10Pct)}
              </span>
              <span className="text-xs text-purple-700 font-semibold">
                Fixed 10% of Troubleshooting Cost ($ {formatCurrency(trbCost)})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Isolated Metric:</strong> Computed strictly as <code>C_trb × 10%</code>. 
              This metric remains fully distinct from the 25% investigation improvement scenario above and is never merged, added, or substituted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
