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
      <div className="rounded-2xl bg-[#0D1322] p-6 sm:p-8 text-white border border-[#1E293B] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-[#38B449]/20 px-3 py-0.5 text-xs font-semibold text-[#8CC63E] border border-[#38B449]/30">
                <Sliders className="h-3.5 w-3.5 text-[#38B449]" />
                <span>Controlled Scenario Sandbox</span>
              </span>
              <span className="text-xs text-slate-400 font-mono bg-[#1E293B] px-2 py-0.5 rounded border border-slate-700">
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
              className="inline-flex items-center space-x-1.5 rounded-lg bg-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors self-start md:self-auto"
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
          <span className="font-bold block">Financial Interpretation Safeguard &amp; Historical Integrity:</span>
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
          <div className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6EE]">
              <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Scenario Assumptions
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  isModelBaseline
                    ? "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                    : "bg-amber-50 text-amber-800 border border-amber-300"
                }`}
              >
                {isModelBaseline ? "Approved Baseline" : "User-Defined"}
              </span>
            </div>

            {/* Parameter 1: Addressable Admin Share */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="input-addressable-admin" className="font-semibold text-[#172033]">
                  Addressable Admin Share (Q04 Scope)
                </label>
                <span className="font-mono font-bold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
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
                className="w-full h-2 bg-[#F1F3F7] rounded-lg appearance-none cursor-pointer accent-[#38B449]"
              />
              <div className="flex justify-between text-[11px] text-[#667085]">
                <span>Conservative (10%)</span>
                <span className="font-semibold text-[#172033]">Baseline: 50%</span>
                <span>Aggressive (90%)</span>
              </div>
              <p className="text-[11px] text-[#667085]">
                Proportion of routine MQ queue configuration and maintenance amenable to meshIQ automation.
              </p>
            </div>

            {/* Parameter 2: Admin Efficiency Improvement */}
            <div className="space-y-2 pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="input-admin-efficiency" className="font-semibold text-[#172033]">
                  Admin Efficiency Improvement Rate
                </label>
                <span className="font-mono font-bold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
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
                className="w-full h-2 bg-[#F1F3F7] rounded-lg appearance-none cursor-pointer accent-[#38B449]"
              />
              <div className="flex justify-between text-[11px] text-[#667085]">
                <span>Conservative (10%)</span>
                <span className="font-semibold text-[#172033]">Baseline: 50%</span>
                <span>Aggressive (90%)</span>
              </div>
              <p className="text-[11px] text-[#667085]">
                Efficiency factor achieved on the addressable portion via self-service provisioning and templated governance.
              </p>
            </div>

            {/* Parameter 3: Investigation Improvement */}
            <div className="space-y-2 pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="input-investigation-improvement" className="font-semibold text-[#172033]">
                  Investigation Improvement (MTTR Acceleration)
                </label>
                <span className="font-mono font-bold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
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
                className="w-full h-2 bg-[#F1F3F7] rounded-lg appearance-none cursor-pointer accent-[#38B449]"
              />
              <div className="flex justify-between text-[11px] text-[#667085]">
                <span>Conservative (5%)</span>
                <span className="font-semibold text-[#172033]">Baseline: 25%</span>
                <span>Aggressive (60%)</span>
              </div>
              <p className="text-[11px] text-[#667085]">
                Reduction in total engineering staff hours spent triaging and resolving bridge-call incidents.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Output & Delta Analysis (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Output Card 1: Illustrative Economic Value & Capacity Liberation */}
          <div className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-[#38B449]" />
                <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                  Scenario Projected Outcomes
                </h3>
              </div>
              <ProvenanceBadge provenance="SCENARIO_PROJECTION" state="VALID" />
            </div>

            {/* High-Level Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Illustrative Economic Value */}
              <div className="rounded-xl bg-gradient-to-br from-[#EEF8F0] to-[#E2F5E6]/60 p-4 border border-[#A8E2B5]">
                <span className="text-xs font-semibold text-[#008638] uppercase tracking-wider">
                  Illustrative Economic Value
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-[#0D1322] font-mono">
                    {formatCurrency(scenarioIllustrativeValue)}
                  </span>
                  <span className="text-xs text-[#008638] font-medium">/ year</span>
                </div>
                {!isModelBaseline && (
                  <div className="mt-2 text-[11px] font-semibold flex items-center space-x-1">
                    <span className={deltaValue >= 0 ? "text-[#008638]" : "text-rose-700"}>
                      {deltaValue >= 0 ? `+${formatCurrency(deltaValue)}` : formatCurrency(deltaValue)} vs Baseline Model
                    </span>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-[#008638]/90">
                  Total scenario recovered hours ({formatNumber(scenarioTotalRecHours)} hrs) × loaded hourly labor rate (${loadedRate.toFixed(2)}/hr).
                </p>
              </div>

              {/* Total Recovered Hours */}
              <div className="rounded-xl bg-[#F1F3F7] p-4 border border-[#E2E6EE]">
                <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
                  Total Recovered Labor Hours
                </span>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-[#172033] font-mono">
                    {formatNumber(scenarioTotalRecHours)} hrs
                  </span>
                  <span className="text-xs text-[#667085] font-medium">/ year</span>
                </div>
                {!isModelBaseline && (
                  <div className="mt-2 text-[11px] font-semibold flex items-center space-x-1">
                    <span className={deltaHours >= 0 ? "text-[#008638]" : "text-rose-700"}>
                      {deltaHours >= 0 ? `+${formatNumber(deltaHours)} hrs` : `${formatNumber(deltaHours)} hrs`} vs Baseline Model
                    </span>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-[#667085]">
                  Decomposed into routine admin and incident investigation hours.
                </p>
              </div>
            </div>

            {/* Decomposed Hours Table */}
            <div className="overflow-x-auto border-t border-[#E2E6EE] pt-4">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="text-[#667085] border-b border-[#E2E6EE] pb-2">
                    <th className="py-2 font-semibold">Improvement Stream</th>
                    <th className="py-2 font-semibold">Formula / Factor</th>
                    <th className="py-2 font-semibold">Baseline Model</th>
                    <th className="py-2 font-semibold text-[#172033] font-bold">Scenario Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6EE] text-[#172033]">
                  <tr>
                    <td className="py-2.5 font-medium text-[#172033]">
                      Routine Admin Capacity Liberation
                    </td>
                    <td className="py-2.5 font-mono text-[#667085]">
                      {addressableAdminPct}% × {adminEfficiencyPct}%
                    </td>
                    <td className="py-2.5 font-mono text-[#667085]">
                      {formatNumber(baselineRecAdminHours)} hrs
                    </td>
                    <td className="py-2.5 font-mono font-bold text-[#008638]">
                      {formatNumber(scenarioRecAdminHours)} hrs
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#172033]">
                      Investigation / MTTR Acceleration
                    </td>
                    <td className="py-2.5 font-mono text-[#667085]">
                      {investigationImprovementPct}% of H_trb
                    </td>
                    <td className="py-2.5 font-mono text-[#667085]">
                      {formatNumber(baselineRecTrbHours)} hrs
                    </td>
                    <td className="py-2.5 font-mono font-bold text-[#008638]">
                      {formatNumber(scenarioRecTrbHours)} hrs
                    </td>
                  </tr>
                  <tr className="bg-[#F1F3F7] font-semibold">
                    <td className="py-2.5 text-[#172033]">
                      Total Annual Liberated Capacity
                    </td>
                    <td className="py-2.5 font-mono text-[#667085]">
                      Sum of streams
                    </td>
                    <td className="py-2.5 font-mono text-[#172033]">
                      {formatNumber(baselineTotalRecHours)} hrs
                    </td>
                    <td className="py-2.5 font-mono font-bold text-[#008638]">
                      {formatNumber(scenarioTotalRecHours)} hrs
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Separate 10% Troubleshooting Productivity Opportunity Card */}
          <div className="rounded-xl border border-[#E2E6EE] bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-[#38B449]" />
                <h4 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                  Troubleshooting Productivity Opportunity (Separate 10% Rule)
                </h4>
              </div>
              <ProvenanceBadge provenance="MODEL_ASSUMPTION" state="VALID" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xl font-bold text-[#172033] font-mono">
                {formatCurrency(troubleshootingOpportunity10Pct)}
              </span>
              <span className="text-xs text-[#008638] font-semibold">
                Fixed 10% of Troubleshooting Cost (${formatCurrency(trbCost)})
              </span>
            </div>
            <p className="text-[11px] text-[#667085] leading-relaxed">
              <strong>Isolated Metric:</strong> Computed strictly as <code>C_trb × 10%</code>. 
              This metric remains fully distinct from the 25% investigation improvement scenario above and is never merged, added, or substituted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
