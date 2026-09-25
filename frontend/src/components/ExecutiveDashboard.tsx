"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  FileCheck,
  FileSpreadsheet,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  FileText,
  Printer,
} from "lucide-react";
import {
  CalculationRunResponse,
  Customer,
  Assessment,
} from "../types/assessment";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { DashboardCharts } from "./DashboardCharts";
import { ScenarioSandbox } from "./ScenarioSandbox";
import { ExecutiveReportView } from "./report/ExecutiveReportView";

interface ExecutiveDashboardProps {
  calculation: CalculationRunResponse;
  customer?: Customer | null;
  assessment?: Assessment | null;
  answers?: Record<string, any>;
  onReturnToWizard: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  calculation,
  customer,
  assessment,
  answers = {},
  onReturnToWizard,
}) => {
  // View Mode: Executive Customer View vs Consultant Audit View
  const [viewMode, setViewMode] = useState<"customer" | "consultant">("customer");
  const [isReportViewOpen, setIsReportViewOpen] = useState<boolean>(false);

  // Active Dashboard Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "effort-cost" | "exposure" | "sandbox" | "findings" | "provenance"
  >("overview");

  const summary = calculation.summary;
  const metrics = calculation.computed_metrics || {};

  // Formatter utilities
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

  // Q21 Customer-Reported MQ Spend Handling
  const q21Metric = metrics.customer_reported_mq_spend;
  const q21IsUnknown = answers.q21_is_unknown || !answers.q21_annual_mq_spend;
  const q21Value = answers.q21_annual_mq_spend;

  // Loaded Hourly Rate
  const loadedRateMetric = metrics.internal_loaded_hourly_rate;
  const loadedHourlyRate = loadedRateMetric?.value
    ? Number(loadedRateMetric.value)
    : 86.53846153846154;

  // Single-Event Exposure Hierarchy
  const exposureMetric = metrics.representative_single_event_exposure;
  const isExposureBenchmark = exposureMetric?.state === "INDUSTRY_BENCHMARK" || exposureMetric?.provenance === "BENCHMARK_FALLBACK";

  if (isReportViewOpen) {
    return (
      <ExecutiveReportView
        calculation={calculation}
        customer={customer}
        assessment={assessment}
        answers={answers}
        onBack={() => setIsReportViewOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* 1. Header Bar with Overview, Metadata, and View Mode Toggle */}
      <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-400/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                <span>Deterministic Calculation Complete</span>
              </span>
              <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                Engine: v{calculation.calculation_engine_version}
              </span>
              <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                Snapshot: {calculation.snapshot_id ? calculation.snapshot_id.substring(0, 8) : "IMMUTABLE"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Assessment Economic Baseline & Scenario Results
            </h1>
            <p className="text-xs sm:text-sm text-blue-300 font-semibold">
              {customer?.name || "Enterprise Client"} • IBM MQ Economic Cost & Efficiency Assessment
            </p>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Deterministic economic baseline, operational effort decomposition, and meshIQ illustrative scenario model for IBM MQ messaging infrastructure.
            </p>
          </div>

          {/* Action Controls: View Mode & Back to Wizard */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("customer")}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "customer"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Executive View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("consultant")}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "consultant"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Consultant View</span>
              </button>
            </div>

            {/* Executive Report & PDF Button */}
            <button
              type="button"
              onClick={() => setIsReportViewOpen(true)}
              className="inline-flex items-center justify-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Executive Report & PDF</span>
            </button>

            <button
              type="button"
              onClick={onReturnToWizard}
              className="inline-flex items-center justify-center space-x-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Intake Wizard</span>
            </button>
          </div>
        </div>

        {/* View Mode Context Notice */}
        {viewMode === "consultant" && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center space-x-2 text-xs text-indigo-300">
            <Info className="h-4 w-4 shrink-0 text-indigo-400" />
            <span>
              <strong>Consultant Audit View Enabled:</strong> Exposing unrounded calculation rates, mathematical formula codes, evaluation states, and seller probing context.
            </span>
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-xs px-2 sm:px-4">
        <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto py-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center space-x-2 py-3 px-2 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Executive Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("effort-cost")}
            className={`flex items-center space-x-2 py-3 px-2 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === "effort-cost"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Effort & Operational Cost</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("exposure")}
            className={`flex items-center space-x-2 py-3 px-2 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === "exposure"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Single-Event Exposure</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sandbox")}
            className={`flex items-center space-x-2 py-3 px-2 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === "sandbox"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Scenario Sandbox</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("findings")}
            className={`flex items-center space-x-2 py-3 px-2 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === "findings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Contextual Findings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("provenance")}
            className={`flex items-center space-x-2 py-3 px-2 border-b-2 text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === "provenance"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Calculation Provenance</span>
          </button>
        </nav>
      </div>

      {/* 3. TAB CONTENT: 1. Executive Overview */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Top KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* KPI 1: Total Quantified Operational Labor Cost */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Operational Labor Cost
                </span>
                <ProvenanceBadge
                  provenance="CALCULATED_RESULT"
                  state={metrics.total_quantified_labor_cost?.state || "VALID"}
                  formulaCode={viewMode === "consultant" ? "C_TOTAL = C_ADMIN + C_TRB" : undefined}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {formatCurrency(summary.total_operational_labor_cost)}
                </span>
                <span className="text-xs font-semibold text-slate-500">/ year</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Calculated from modeled staff hours ({formatNumber((summary.admin_annual_hours || 0) + (summary.troubleshooting_annual_hours || 0))} hrs) × loaded hourly rate (${loadedHourlyRate.toFixed(2)}/hr).
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Admin: {formatCurrency(summary.admin_annual_cost)}</span>
                <span>•</span>
                <span>Troubleshooting: {formatCurrency(summary.troubleshooting_annual_cost)}</span>
              </div>
            </div>

            {/* KPI 2: Operational FTE Burden */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Operational FTE Burden
                </span>
                <ProvenanceBadge
                  provenance="CALCULATED_RESULT"
                  state={metrics.operational_fte_burden?.state || "VALID"}
                  formulaCode={viewMode === "consultant" ? "FTE = H_TOTAL / 2,080" : undefined}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {formatNumber(summary.operational_fte_burden, 2)} FTE
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  ({formatNumber((summary.admin_annual_hours || 0) + (summary.troubleshooting_annual_hours || 0))} hrs/yr)
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Full-time equivalent engineering capacity consumed by routine messaging maintenance and triage.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Working Standard: 2,080 hrs/yr</span>
                <span className="font-semibold text-slate-700">
                  {(((summary.operational_fte_burden || 0)) * 100).toFixed(0)}% FTE equivalent
                </span>
              </div>
            </div>

            {/* KPI 3: Representative Single-Event Exposure */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Single-Event Exposure
                </span>
                <ProvenanceBadge
                  provenance={isExposureBenchmark ? "INDUSTRY_BENCHMARK" : "CALCULATED_RESULT"}
                  state={exposureMetric?.state || "VALID"}
                  formulaCode={viewMode === "consultant" ? "EXPOSURE = D_HOURS × R_IMPACT" : undefined}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {metrics.representative_single_event_exposure?.state === "NOT_MODELED" ||
                  metrics.representative_single_event_exposure?.state === "INSUFFICIENT_DATA"
                    ? "—"
                    : formatCurrency(summary.representative_single_event_exposure)}
                </span>
                <span className="text-xs font-semibold text-slate-500">/ event</span>
              </div>
              <div className="mt-2">
                <span className="inline-flex text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Representative Single-Event Exposure
                </span>
                <p className="mt-1 text-xs text-slate-600">
                  Financial exposure for one major outage (Duration × Hourly Downtime Rate). <strong>Not annualized loss.</strong>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Duration: {answers.q14_disruption_duration || "1.13 hrs"}</span>
                <span>•</span>
                <span>{isExposureBenchmark ? "ITIC $300k/hr Benchmark" : "Customer Fact"}</span>
              </div>
            </div>

            {/* KPI 4: Total Recoverable Labor Hours */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Recoverable Hours
                </span>
                <ProvenanceBadge
                  provenance="SCENARIO_PROJECTION"
                  state="VALID"
                  formulaCode={viewMode === "consultant" ? "H_REC = 0.25·H_ADMIN + 0.25·H_TRB" : undefined}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-indigo-700 font-mono">
                  {formatNumber(summary.total_recoverable_labor_hours)} hrs
                </span>
                <span className="text-xs font-semibold text-slate-500">/ year</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Engineering capacity liberated under approved 50%×50% admin and 25% diagnostic acceleration.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Liberated Admin: {formatNumber((summary.admin_annual_hours || 0) * 0.25)} hrs</span>
                <span>•</span>
                <span>Liberated Triage: {formatNumber((summary.troubleshooting_annual_hours || 0) * 0.25)} hrs</span>
              </div>
            </div>

            {/* KPI 5: Illustrative Economic Value */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Illustrative Economic Value
                </span>
                <ProvenanceBadge
                  provenance="SCENARIO_PROJECTION"
                  state="VALID"
                  formulaCode={viewMode === "consultant" ? "SAVINGS = H_REC × R_HR" : undefined}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-emerald-700 font-mono">
                  {formatCurrency(summary.illustrative_annual_labor_savings)}
                </span>
                <span className="text-xs font-semibold text-emerald-800">/ year</span>
              </div>
              <div className="mt-2">
                <span className="inline-flex text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  Illustrative Economic Value
                </span>
                <p className="mt-1 text-xs text-slate-600">
                  Scenario value of liberated hours. <strong>Not guaranteed cash savings or fixed ROI.</strong>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
                <span>Value Rate: ${loadedHourlyRate.toFixed(2)}/hr</span>
                <span className="font-semibold text-emerald-700">Model Baseline</span>
              </div>
            </div>

            {/* KPI 6: Customer-Reported Annual MQ Spend (Q21) */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Customer-Reported MQ Spend
                </span>
                <ProvenanceBadge
                  provenance={q21IsUnknown ? "MODEL_ASSUMPTION" : "CUSTOMER_FACT"}
                  state={q21IsUnknown ? "NOT_MODELED" : "VALID"}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {q21IsUnknown ? "Not provided" : formatCurrency(q21Value)}
                </span>
                {!q21IsUnknown && (
                  <span className="text-xs font-semibold text-slate-500">/ year</span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-600">
                Customer-disclosed total licensing and vendor spend. <strong>Preserved as isolated customer fact; never synthesized or equated to operational labor.</strong>
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Question Code: Q21</span>
                <span className="font-medium text-slate-700">
                  {q21IsUnknown ? "Unstated Fact" : "Customer Fact"}
                </span>
              </div>
            </div>
          </div>

          {/* Decision-Support Visualizations */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Operational Baseline & Scenario Visualizations
            </h2>
            <DashboardCharts calculation={calculation} answers={answers} />
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: 2. Effort & Operational Cost Breakdown */}
      {activeTab === "effort-cost" && (
        <div className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Operational Effort & Cost Decomposition
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Full mathematical breakdown of internal labor overhead across administrative maintenance and reactive incident troubleshooting.
                </p>
              </div>
              <ProvenanceBadge provenance="CALCULATED_RESULT" state="VALID" />
            </div>

            {/* Detailed 2-Column Stream Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stream A: Routine Administration */}
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Routine Administration Stream
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Q04 Input
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Quarterly Admin Time Overhead:</span>
                    <span className="font-bold text-slate-900">
                      {answers.q04_dropdown || "80 hours / quarter"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Annual Admin Hours (H_admin):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatNumber(summary.admin_annual_hours)} hrs / year
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Loaded Hourly Labor Rate:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ${loadedHourlyRate.toFixed(2)} / hour
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-blue-50/70 px-2 rounded font-semibold text-blue-950">
                    <span>Annual Admin Cost (C_admin):</span>
                    <span className="font-mono font-bold text-blue-900">
                      {formatCurrency(summary.admin_annual_cost)} / year
                    </span>
                  </div>
                </div>
              </div>

              {/* Stream B: Reactive Incident Troubleshooting */}
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Incident Troubleshooting Stream
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Q06 × Q07 Inputs
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Incident Frequency (Q06):</span>
                    <span className="font-bold text-slate-900">
                      {answers.q06_frequency || "About weekly (52/yr)"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Staff Labor Hours / Incident (Q07):</span>
                    <span className="font-bold text-slate-900">
                      {answers.q07_labor_hours || "3–5 hours (4.0 hrs)"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Annual Troubleshooting Hours (H_trb):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatNumber(summary.troubleshooting_annual_hours)} hrs / year
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-indigo-50/70 px-2 rounded font-semibold text-indigo-950">
                    <span>Annual Troubleshooting Cost (C_trb):</span>
                    <span className="font-mono font-bold text-indigo-900">
                      {formatCurrency(summary.troubleshooting_annual_cost)} / year
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Consolidation Banner */}
            <div className="rounded-xl bg-slate-900 p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Consolidated Quantified Operational Labor
                </span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {formatCurrency(summary.total_operational_labor_cost)} / year
                </div>
              </div>
              <div className="flex items-center space-x-6 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block">Total Hours:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatNumber((summary.admin_annual_hours || 0) + (summary.troubleshooting_annual_hours || 0))} hrs/yr
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">FTE Burden:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatNumber(summary.operational_fte_burden, 2)} FTE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: 3. Business Consequence & Exposure */}
      {activeTab === "exposure" && (
        <div className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Representative Single-Event Business Exposure
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Downstream financial consequence for a single representative critical messaging disruption.
                </p>
              </div>
              <ProvenanceBadge
                provenance={isExposureBenchmark ? "INDUSTRY_BENCHMARK" : "CALCULATED_RESULT"}
                state={exposureMetric?.state || "VALID"}
              />
            </div>

            {/* Exposure Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Disruption Duration (Q14)
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                  {answers.q14_disruption_duration || "46–90 min (1.13 hrs)"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Representative decimal duration factor applied by calculation engine.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hourly Downtime Rate (Q15)
                </span>
                <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
                  {isExposureBenchmark ? "$300,000 / hr" : formatCurrency(answers.q15_hourly_cost_override)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isExposureBenchmark
                    ? "ITIC 2024 Industry Benchmark applied (Critical/Significant severity)."
                    : "Customer-verified custom hourly downtime rate."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  Representative Single-Event Exposure
                </span>
                <div className="mt-2 text-2xl font-bold text-amber-950 font-mono">
                  {formatCurrency(summary.representative_single_event_exposure)}
                </div>
                <p className="text-[11px] text-amber-900 mt-1 font-semibold">
                  Exposure for one single major outage event.
                </p>
              </div>
            </div>

            {/* Financial Safeguards Callout */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-900 block">Governance Note on Exposure Metric:</span>
              <p>
                Representative Single-Event Exposure is modeled strictly as <code>Exposure = D_hours × R_impact</code>. 
                In accordance with approved business rules (BR-004), this figure represents the potential business impact of <strong>one single event</strong> and must never be annualized or combined with operational labor expenditure.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: 4. Scenario Sandbox */}
      {activeTab === "sandbox" && (
        <ScenarioSandbox calculation={calculation} />
      )}

      {/* 3. TAB CONTENT: 5. Contextual Findings & Risk Matrix */}
      {activeTab === "findings" && (
        <div className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Assessment Strategic Findings & Risk Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Contextual insights synthesized from qualitative discovery responses (Q01–Q03, Q05, Q08–Q11, Q13, Q16–Q19, Q22).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Finding 1: Environmental & Tech Debt */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Estate Scale & Technical Debt (Q01, Q05)
                  </h3>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>Estate Scale:</strong> {answers.q01_scale || "51–100 queue managers"} across enterprise infrastructure.
                </p>
                <p className="text-xs text-slate-700">
                  <strong>Technical Debt:</strong> {answers.q05_tech_debt || "Multiple legacy versions and unsupported instances in production"}.
                </p>
              </div>

              {/* Finding 2: Observability & Swivel-Chair Friction */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Observability & Tooling Friction (Q09, Q10)
                  </h3>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>Tooling Consolidation:</strong> Teams utilize {answers.q09_tools_count || "2–3 disparate tools"} during diagnostic triage.
                </p>
                <p className="text-xs text-slate-700">
                  <strong>Tracing Friction:</strong> Message-level tracing is {answers.q10_manual_tracing || "mostly manual log correlation across siloed teams"}.
                </p>
              </div>

              {/* Finding 3: Cybersecurity & Compliance */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Security & Governance Friction (Q18, Q19)
                  </h3>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>Audit Pressure:</strong> {answers.q18_audit_effort || "Moderate regulatory and security audit oversight"}.
                </p>
                <p className="text-xs text-slate-700">
                  <strong>Remediation Friction:</strong> Patching and CVE remediation introduces {answers.q19_documentation_effort || "moderate operational friction and manual testing"}.
                </p>
              </div>

              {/* Finding 4: Executive Mandate & Timing */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Executive Mandate & Time to Act (Q16, Q17, Q22)
                  </h3>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>OpEx Mandate:</strong> {answers.q16_cost_mandate || "Active management goal for infrastructure modernization"}.
                </p>
                <p className="text-xs text-slate-700">
                  <strong>Target Horizon:</strong> Demonstration of measurable efficiency targeted {answers.q22_migration_plans || "near-term (90–180 days)"}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: 6. Calculation Engine Metric Inventory & Provenance */}
      {activeTab === "provenance" && (
        <div className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Calculation Engine Provenance & Metric Inventory
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Complete audit trail of all deterministic outputs, evaluation states, and mathematical formula codes generated by Phase 3 engine v{calculation.calculation_engine_version}.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Rule Version: calc-rules-v1.0.0
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                <thead className="bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <th className="py-3 px-4">Metric Key</th>
                    <th className="py-3 px-4">Calculated Value</th>
                    <th className="py-3 px-4">Evaluation State</th>
                    <th className="py-3 px-4">Data Provenance Tier</th>
                    <th className="py-3 px-4">Formula / Source Logic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Object.entries(metrics).map(([key, metric]) => (
                    <tr key={key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                        {key}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {metric.value !== null && metric.value !== undefined
                          ? typeof metric.value === "number" || !isNaN(Number(metric.value))
                            ? Number(metric.value).toLocaleString()
                            : String(metric.value)
                          : "—"}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            metric.state === "VALID" || metric.state === "VALID_WITH_DEFAULTS"
                              ? "bg-emerald-100 text-emerald-800"
                              : metric.state === "INSUFFICIENT_DATA"
                              ? "bg-amber-100 text-amber-800"
                              : metric.state === "INDUSTRY_BENCHMARK"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {metric.state}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-sans">
                        <ProvenanceBadge provenance={metric.provenance} showTooltip={false} />
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {metric.formula_code || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
