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
import { ShowTheMathDrawer } from "./ShowTheMathDrawer";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
  // View Mode: Executive Customer View vs Consultant Audit View
  const [viewMode, setViewMode] = useState<"customer" | "consultant">("customer");
  const [isReportViewOpen, setIsReportViewOpen] = useState<boolean>(false);
  const [isShowMathOpen, setIsShowMathOpen] = useState<boolean>(false);

  // Authorized roles for calculation transparency: CONSULTANT, PLATFORM_ADMIN, PARTNER_ADMIN
  const isAuthorizedForMath =
    user?.role === "CONSULTANT" ||
    user?.role === "PLATFORM_ADMIN" ||
    user?.role === "PARTNER_ADMIN";

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

  // Loaded Hourly Rate (canonical loaded_hourly_rate with fallback to legacy internal_loaded_hourly_rate)
  const loadedRateMetric = metrics.loaded_hourly_rate || metrics.internal_loaded_hourly_rate;
  const loadedHourlyRate = loadedRateMetric?.value
    ? Number(loadedRateMetric.value)
    : 86.53846153846154;

  // Single-Event Exposure Hierarchy
  const exposureMetric = metrics.representative_single_event_exposure;
  const isExposureBenchmark =
    exposureMetric?.provenance === "INDUSTRY_BENCHMARK" ||
    exposureMetric?.state === "INDUSTRY_BENCHMARK" ||
    exposureMetric?.provenance === "BENCHMARK_FALLBACK" ||
    answers.q15_is_unknown ||
    !answers.q15_hourly_cost_override;

  const TABS = [
    { id: "overview", label: "Executive Overview", icon: LayoutDashboard },
    { id: "effort-cost", label: "Effort & Operational Cost", icon: Clock },
    { id: "exposure", label: "Single-Event Exposure", icon: ShieldAlert },
    { id: "sandbox", label: "Scenario Sandbox", icon: Sliders },
    { id: "findings", label: "Contextual Findings", icon: Layers },
    { id: "provenance", label: "Calculation Provenance", icon: Calculator },
  ] as const;

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const targetTab = TABS[nextIndex];
      setActiveTab(targetTab.id);
      const nextTabEl = document.getElementById(`tab-${targetTab.id}`);
      nextTabEl?.focus();
    }
  };

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
      <div className="rounded-2xl bg-[#0D1322] p-6 sm:p-8 text-white shadow-xl border border-[#1E293B] relative overflow-hidden">
        {/* meshIQ Brand Accent Hairline */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#008638] via-[#38B449] via-[#8CC63E] to-[#C026D3] pointer-events-none"
        />

        {/* Strengthened meshIQ Radial Data-in-Motion Background Motif */}
        <div
          aria-hidden="true"
          className="absolute -right-28 -top-28 sm:-right-40 sm:-top-40 lg:-right-52 lg:-top-52 w-[550px] h-[550px] sm:w-[700px] sm:h-[700px] lg:w-[850px] lg:h-[850px] pointer-events-none select-none opacity-45 sm:opacity-55 z-0"
        >
          <svg viewBox="0 0 600 600" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="execRadialGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38B449" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#8CC63E" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#8CC63E" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="execRadialMagenta" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C026D3" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38B449" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Concentric orbital rings */}
            <circle cx="300" cy="300" r="90" stroke="#38B449" strokeWidth="1.25" strokeDasharray="4 6" opacity="0.45" />
            <circle cx="300" cy="300" r="155" stroke="#8CC63E" strokeWidth="1" strokeDasharray="3 5" opacity="0.45" />
            <circle cx="300" cy="300" r="225" stroke="#C026D3" strokeWidth="1.2" strokeDasharray="4 8" opacity="0.4" />
            <circle cx="300" cy="300" r="290" stroke="#38B449" strokeWidth="0.75" opacity="0.3" />

            {/* Radiating data-in-motion lines (56 rays) */}
            {Array.from({ length: 56 }).map((_, i) => {
              const angle = (i * 360) / 56;
              const rad = (angle * Math.PI) / 180;
              const innerR = 100 + (i % 3) * 15;
              const outerR = 230 + (i % 5) * 18 + ((i * 7) % 25);
              const x1 = Number((300 + innerR * Math.cos(rad)).toFixed(2));
              const y1 = Number((300 + innerR * Math.sin(rad)).toFixed(2));
              const x2 = Number((300 + outerR * Math.cos(rad)).toFixed(2));
              const y2 = Number((300 + outerR * Math.sin(rad)).toFixed(2));
              const strokeColor = (angle >= 135 && angle <= 225) ? "url(#execRadialMagenta)" : "url(#execRadialGreen)";
              const strokeWidth = i % 4 === 0 ? 1.75 : i % 2 === 0 ? 1.2 : 0.85;

              return (
                <line
                  key={`exec-ray-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={Number((0.45 + (i % 4) * 0.12).toFixed(2))}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Orbiting data nodes */}
            <circle cx="455" cy="300" r="3.5" fill="#38B449" opacity="0.8" />
            <circle cx="300" cy="145" r="3" fill="#8CC63E" opacity="0.8" />
            <circle cx="170" cy="230" r="3" fill="#C026D3" opacity="0.75" />
            <circle cx="420" cy="420" r="3.5" fill="#38B449" opacity="0.7" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-[#38B449]/20 px-3 py-1 text-xs font-bold text-[#8CC63E] border border-[#38B449]/40">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#38B449]" />
                <span>Deterministic Calculation Complete</span>
              </span>
              <span className="text-xs text-slate-300 font-mono bg-[#1E293B] px-2.5 py-1 rounded border border-slate-700">
                Engine: v{calculation.calculation_engine_version}
              </span>
              <span className="text-xs text-slate-300 font-mono bg-[#1E293B] px-2.5 py-1 rounded border border-slate-700">
                Snapshot: {calculation.snapshot_id ? calculation.snapshot_id.substring(0, 8) : "IMMUTABLE"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Assessment Economic Baseline &amp; Scenario Results
            </h1>
            <p className="text-xs sm:text-sm text-[#8CC63E] font-bold">
              {customer?.name || "Enterprise Client"} • IBM MQ Economic Cost &amp; Efficiency Assessment
            </p>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              Deterministic economic baseline, operational effort decomposition, and meshIQ illustrative scenario model for IBM MQ messaging infrastructure.
            </p>
          </div>

          {/* Action Controls: View Mode & Back to Wizard */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg bg-[#1E293B] p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("customer")}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "customer"
                    ? "bg-[#38B449] text-white shadow-xs"
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
                    ? "bg-[#008638] text-white shadow-xs"
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
              className="inline-flex items-center justify-center space-x-2 rounded-lg bg-[#38B449] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#008638] transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Executive Report &amp; PDF</span>
            </button>

            <button
              type="button"
              onClick={onReturnToWizard}
              className="inline-flex items-center justify-center space-x-2 rounded-lg bg-[#1E293B] px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Intake Wizard</span>
            </button>
          </div>
        </div>

        {/* View Mode Context Notice */}
        {viewMode === "consultant" && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center space-x-2 text-xs text-[#8CC63E]">
            <Info className="h-4 w-4 shrink-0 text-[#38B449]" />
            <span>
              <strong>Consultant Audit View Enabled:</strong> Exposing unrounded calculation rates, mathematical formula codes, evaluation states, and seller probing context.
            </span>
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="border border-[#E2E6EE] bg-white rounded-xl shadow-xs px-2 sm:px-4">
        <div
          role="tablist"
          aria-label="Executive Dashboard navigation"
          className="flex space-x-2 sm:space-x-6 overflow-x-auto py-2 no-scrollbar"
        >
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={isSelected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex items-center space-x-2 py-3 px-2 border-b-2 text-xs font-bold whitespace-nowrap transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#008638] rounded-t-sm cursor-pointer ${
                  isSelected
                    ? "border-[#008638] text-[#008638]"
                    : "border-transparent text-[#667085] hover:text-[#172033]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TAB CONTENT: 1. Executive Overview */}
      {activeTab === "overview" && (
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          tabIndex={0}
          className="space-y-8 focus:outline-hidden"
        >
          {/* A. PRIMARY EXECUTIVE HEADLINE: Core Economic Baseline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#38B449]" />
                <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                  Primary Economic Headline
                </h2>
              </div>
              <span className="text-xs text-[#667085]">
                Quantified Middleware Operations Baseline
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Headline Card 1: Total Quantified Operational Labor Cost */}
              <div className="rounded-xl border border-[#E2E6EE] border-t-4 border-t-[#38B449] bg-white p-6 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                      Operational Labor Cost
                    </span>
                    <div className="flex items-center space-x-2">
                      {isAuthorizedForMath && (
                        <button
                          type="button"
                          onClick={() => setIsShowMathOpen(true)}
                          data-testid="show-the-math-btn"
                          className="inline-flex items-center space-x-1 text-[11px] font-bold text-[#008638] hover:text-[#006B2D] bg-[#EEF8F0] hover:bg-[#E5F5E8] px-2 py-0.5 rounded-md border border-[#A8E2B5] transition-colors cursor-pointer shadow-2xs"
                          aria-label="Show the Math for Operational Labor Cost"
                        >
                          <Calculator className="h-3 w-3 mr-0.5" />
                          <span>Show the Math</span>
                        </button>
                      )}
                      <ProvenanceBadge
                        provenance="CALCULATED_RESULT"
                        state={metrics.total_quantified_labor_cost?.state || "VALID"}
                        formulaCode={viewMode === "consultant" ? "C_TOTAL = C_ADMIN + C_TRB" : undefined}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl sm:text-4xl font-black text-[#172033] font-mono tracking-tight" data-testid="dashboard-operational-labor-cost">
                      {formatCurrency(summary.total_operational_labor_cost)}
                    </span>
                    <span className="text-xs font-bold text-[#667085]">/ year</span>
                  </div>
                  <p className="mt-2 text-xs text-[#667085] leading-relaxed">
                    Quantified engineering labor expenditure modeled across routine administration and reactive incident troubleshooting.
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-[#E2E6EE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#667085]">
                  <span>Admin: <strong className="text-[#172033]">{formatCurrency(summary.admin_annual_cost)}</strong></span>
                  <span>•</span>
                  <span>Troubleshooting: <strong className="text-[#172033]">{formatCurrency(summary.troubleshooting_annual_cost)}</strong></span>
                  <span>•</span>
                  <span>Rate: <strong className="text-[#172033]">${loadedHourlyRate.toFixed(2)}/hr</strong></span>
                </div>
              </div>

              {/* Headline Card 2: Operational FTE Burden */}
              <div className="rounded-xl border border-[#E2E6EE] border-t-4 border-t-[#172033] bg-white p-6 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                      Operational FTE Burden
                    </span>
                    <ProvenanceBadge
                      provenance="CALCULATED_RESULT"
                      state={metrics.operational_fte_burden?.state || "VALID"}
                      formulaCode={viewMode === "consultant" ? "FTE = H_TOTAL / 2,080" : undefined}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl sm:text-4xl font-black text-[#172033] font-mono tracking-tight">
                      {formatNumber(summary.operational_fte_burden, 2)} FTE
                    </span>
                    <span className="text-xs font-semibold text-[#667085]">
                      ({formatNumber((summary.admin_annual_hours || 0) + (summary.troubleshooting_annual_hours || 0))} hrs/yr)
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#667085] leading-relaxed">
                    Full-time equivalent engineering headcount consumed by routine middleware configuration, patching, and bridge-call triage.
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#667085]">
                  <span>Standard Benchmark: 2,080 hrs/yr</span>
                  <span className="font-bold text-[#172033]">
                    {(((summary.operational_fte_burden || 0)) * 100).toFixed(0)}% Dedicated FTE Capacity
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* B. SECONDARY ECONOMIC INDICATORS: Exposure & Investment Context */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                  Secondary Economic Indicators
                </h2>
              </div>
              <span className="text-xs text-[#667085]">
                Single-Event Consequence &amp; Customer-Disclosed Spend
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Secondary Card 1: Representative Single-Event Exposure */}
              <div className="rounded-xl border border-[#E2E6EE] border-t-4 border-t-amber-500 bg-white p-6 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                      Single-Event Exposure
                    </span>
                    <ProvenanceBadge
                      provenance={isExposureBenchmark ? "INDUSTRY_BENCHMARK" : "CALCULATED_RESULT"}
                      state={exposureMetric?.state || "VALID"}
                      formulaCode={viewMode === "consultant" ? "EXPOSURE = D_HOURS × R_IMPACT" : undefined}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#172033] font-mono">
                      {metrics.representative_single_event_exposure?.state === "NOT_MODELED" ||
                      metrics.representative_single_event_exposure?.state === "INSUFFICIENT_DATA"
                        ? "—"
                        : formatCurrency(summary.representative_single_event_exposure)}
                    </span>
                    <span className="text-xs font-semibold text-[#667085]">/ event</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Representative Single-Event Exposure
                    </span>
                    <p className="mt-1.5 text-xs text-[#667085] leading-relaxed">
                      Modeled financial impact of one major outage (Duration × Hourly Downtime Rate). <strong>Not annualized loss.</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3.5 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#667085]">
                  <span>Duration: <strong className="text-[#172033]">{answers.q14_disruption_duration || "1.13 hrs"}</strong></span>
                  <span>•</span>
                  <span>{isExposureBenchmark ? "ITIC $300k/hr Benchmark" : "Customer Fact"}</span>
                </div>
              </div>

              {/* Secondary Card 2: Customer-Reported Annual MQ Spend (Q21) */}
              <div className="rounded-xl border border-[#E2E6EE] border-t-4 border-t-slate-400 bg-white p-6 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                      Customer-Reported MQ Spend
                    </span>
                    <ProvenanceBadge
                      provenance={q21IsUnknown ? "MODEL_ASSUMPTION" : "CUSTOMER_FACT"}
                      state={q21IsUnknown ? "NOT_MODELED" : "VALID"}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#172033] font-mono">
                      {q21IsUnknown ? "Not provided" : formatCurrency(q21Value)}
                    </span>
                    {!q21IsUnknown && (
                      <span className="text-xs font-semibold text-[#667085]">/ year</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      Isolated Customer Fact (Q21)
                    </span>
                    <p className="mt-1.5 text-xs text-[#667085] leading-relaxed">
                      Customer-disclosed total licensing and vendor spend. <strong>Preserved as isolated customer fact; never synthesized or equated to operational labor.</strong>
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3.5 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#667085]">
                  <span>Question Code: Q21</span>
                  <span className="font-bold text-[#172033]">
                    {q21IsUnknown ? "Unstated Fact" : "Verified Customer Fact"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* C. CONTROLLED IMPROVEMENT SCENARIO: Capacity Recovery & Illustrative Value */}
          <div className="rounded-2xl border border-[#A8E2B5] bg-gradient-to-br from-white to-[#EEF8F0] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#A8E2B5]/60 pb-3.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-[#008638]" />
                <h2 className="text-sm font-bold text-[#008638] uppercase tracking-wider">
                  meshIQ Controlled Improvement Scenario (Illustrative Simulation)
                </h2>
              </div>
              <span className="inline-flex items-center text-[11px] font-bold text-[#008638] bg-white px-2.5 py-0.5 rounded-full border border-[#A8E2B5]">
                50%×50% Admin • 25% MTTR Acceleration
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Scenario Card 1: Total Recoverable Labor Hours */}
              <div className="rounded-xl border border-[#A8E2B5] bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#008638] uppercase tracking-wider">
                      Total Recoverable Hours
                    </span>
                    <ProvenanceBadge
                      provenance="SCENARIO_PROJECTION"
                      state="VALID"
                      formulaCode={viewMode === "consultant" ? "H_REC = 0.25·H_ADMIN + 0.25·H_TRB" : undefined}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#008638] font-mono">
                      {formatNumber(summary.total_recoverable_labor_hours)} hrs
                    </span>
                    <span className="text-xs font-bold text-[#667085]">/ year</span>
                  </div>
                  <p className="mt-2 text-xs text-[#667085] leading-relaxed">
                    Engineering capacity liberated under approved automation and diagnostic acceleration levers.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#667085]">
                  <span>Liberated Admin: <strong className="text-[#172033]">{formatNumber((summary.admin_annual_hours || 0) * 0.25)} hrs</strong></span>
                  <span>•</span>
                  <span>Liberated Triage: <strong className="text-[#172033]">{formatNumber((summary.troubleshooting_annual_hours || 0) * 0.25)} hrs</strong></span>
                </div>
              </div>

              {/* Scenario Card 2: Illustrative Economic Value */}
              <div className="rounded-xl border border-[#A8E2B5] bg-white p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#008638] uppercase tracking-wider">
                      Illustrative Economic Value
                    </span>
                    <ProvenanceBadge
                      provenance="SCENARIO_PROJECTION"
                      state="VALID"
                      formulaCode={viewMode === "consultant" ? "SAVINGS = H_REC × R_HR" : undefined}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[#008638] font-mono">
                      {formatCurrency(summary.illustrative_annual_labor_savings)}
                    </span>
                    <span className="text-xs font-bold text-[#008638]">/ year</span>
                  </div>
                  <p className="mt-2 text-xs text-[#667085] leading-relaxed">
                    Theoretical capacity value of recovered engineering hours. <strong>Not guaranteed cash savings or fixed ROI.</strong>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E6EE] flex items-center justify-between text-xs text-[#172033]">
                  <span>Applied Loaded Rate: <strong>${loadedHourlyRate.toFixed(2)}/hr</strong></span>
                  <span className="font-bold text-[#008638]">Standard Model Baseline</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#008638] bg-white/80 p-3 rounded-lg border border-[#A8E2B5]/60 leading-relaxed">
              <strong>Scenario Governance Notice:</strong> The controlled improvement scenario models illustrative operational capacity liberation under standard meshIQ automation assumptions. It represents hypothetical efficiency potential and does not constitute a contractual commitment or cash savings guarantee.
            </div>
          </div>

          {/* D. DECISION-SUPPORT VISUALIZATIONS */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold text-[#172033]">
              Operational Baseline &amp; Scenario Visualizations
            </h2>
            <DashboardCharts calculation={calculation} answers={answers} />
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: 2. Effort & Operational Cost Breakdown */}
      {activeTab === "effort-cost" && (
        <div
          id="panel-effort-cost"
          role="tabpanel"
          aria-labelledby="tab-effort-cost"
          tabIndex={0}
          className="space-y-8 focus:outline-hidden"
        >
          <div className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Operational Effort &amp; Cost Decomposition
                </h2>
                <p className="text-xs text-[#667085] mt-1">
                  Full mathematical breakdown of internal labor overhead across administrative maintenance and reactive incident troubleshooting.
                </p>
              </div>
              <ProvenanceBadge provenance="CALCULATED_RESULT" state="VALID" />
            </div>

            {/* Detailed 2-Column Stream Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stream A: Routine Administration */}
              <div className="rounded-xl bg-[#F1F3F7] p-5 border border-[#E2E6EE] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-[#172033]" />
                    <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                      Routine Administration Stream
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
                    Q04 Input
                  </span>
                </div>

                <div className="space-y-3 text-xs text-[#172033]">
                  <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                    <span className="text-[#667085]">Quarterly Admin Time Overhead:</span>
                    <span className="font-bold text-[#172033]">
                      {answers.q04_dropdown || "80 hours / quarter"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                    <span className="text-[#667085]">Annual Admin Hours (H_admin):</span>
                    <span className="font-mono font-bold text-[#172033]">
                      {formatNumber(summary.admin_annual_hours)} hrs / year
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                    <span className="text-[#667085]">Loaded Hourly Labor Rate:</span>
                    <span className="font-mono font-bold text-[#172033]">
                      ${loadedHourlyRate.toFixed(2)} / hour
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-[#EEF8F0] px-2.5 rounded font-bold text-[#172033] border border-[#A8E2B5]">
                    <span>Annual Admin Cost (C_admin):</span>
                    <span className="font-mono font-bold text-[#008638]">
                      {formatCurrency(summary.admin_annual_cost)} / year
                    </span>
                  </div>
                </div>
              </div>

              {/* Stream B: Reactive Incident Troubleshooting */}
              <div className="rounded-xl bg-[#F1F3F7] p-5 border border-[#E2E6EE] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-[#38B449]" />
                    <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                      Incident Troubleshooting Stream
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
                    Q06 × Q07 Inputs
                  </span>
                </div>

                <div className="space-y-3 text-xs text-[#172033]">
                  <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                    <span className="text-[#667085]">Incident Frequency (Q06):</span>
                    <span className="font-bold text-[#172033]">
                      {answers.q06_frequency || "About weekly (52/yr)"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                    <span className="text-[#667085]">Staff Labor Hours / Incident (Q07):</span>
                    <span className="font-bold text-[#172033]">
                      {answers.q07_labor_hours || "3–5 hours (4.0 hrs)"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                    <span className="text-[#667085]">Annual Troubleshooting Hours (H_trb):</span>
                    <span className="font-mono font-bold text-[#172033]">
                      {formatNumber(summary.troubleshooting_annual_hours)} hrs / year
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-[#EEF8F0] px-2.5 rounded font-bold text-[#172033] border border-[#A8E2B5]">
                    <span>Annual Troubleshooting Cost (C_trb):</span>
                    <span className="font-mono font-bold text-[#008638]">
                      {formatCurrency(summary.troubleshooting_annual_cost)} / year
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Consolidation Banner */}
            <div className="rounded-xl bg-[#0D1322] p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-[#1E293B]">
              <div>
                <span className="text-xs font-bold text-[#8CC63E] uppercase tracking-wider">
                  Consolidated Quantified Operational Labor
                </span>
                <div className="text-2xl font-black font-mono text-white mt-1">
                  {formatCurrency(summary.total_operational_labor_cost)} / year
                </div>
              </div>
              <div className="flex items-center space-x-6 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block font-medium">Total Hours:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatNumber((summary.admin_annual_hours || 0) + (summary.troubleshooting_annual_hours || 0))} hrs/yr
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">FTE Burden:</span>
                  <span className="font-mono font-bold text-[#8CC63E] text-sm">
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
        <div
          id="panel-exposure"
          role="tabpanel"
          aria-labelledby="tab-exposure"
          tabIndex={0}
          className="space-y-8 focus:outline-hidden"
        >
          <div className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Representative Single-Event Business Exposure
                </h2>
                <p className="text-xs text-[#667085] mt-1">
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
              <div className="p-4 rounded-xl bg-[#F1F3F7] border border-[#E2E6EE]">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                  Disruption Duration (Q14)
                </span>
                <div className="mt-2 text-2xl font-black text-[#172033] font-mono">
                  {answers.q14_disruption_duration || "46–90 min (1.13 hrs)"}
                </div>
                <p className="text-[11px] text-[#667085] mt-1">
                  Representative decimal duration factor applied by calculation engine.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F1F3F7] border border-[#E2E6EE]">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                  Hourly Downtime Rate (Q15)
                </span>
                <div className="mt-2 text-2xl font-black text-[#172033] font-mono">
                  {isExposureBenchmark ? "$300,000 / hr" : formatCurrency(answers.q15_hourly_cost_override)}
                </div>
                <p className="text-[11px] text-[#667085] mt-1">
                  {isExposureBenchmark
                    ? "ITIC 2024 Industry Benchmark applied (Critical/Significant severity)."
                    : "Customer-verified custom hourly downtime rate."}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Representative Single-Event Exposure
                </span>
                <div className="mt-2 text-2xl font-black text-amber-950 font-mono">
                  {formatCurrency(summary.representative_single_event_exposure)}
                </div>
                <p className="text-[11px] text-amber-900 mt-1 font-bold">
                  Exposure for one single major outage event.
                </p>
              </div>
            </div>

            {/* Financial Safeguards Callout */}
            <div className="p-4 rounded-xl bg-[#F1F3F7] border border-[#E2E6EE] text-xs text-[#667085] space-y-2">
              <span className="font-bold text-[#172033] block">Governance Note on Exposure Metric:</span>
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
        <div
          id="panel-sandbox"
          role="tabpanel"
          aria-labelledby="tab-sandbox"
          tabIndex={0}
          className="focus:outline-hidden"
        >
          <ScenarioSandbox calculation={calculation} />
        </div>
      )}

      {/* 3. TAB CONTENT: 5. Contextual Findings & Risk Matrix */}
      {activeTab === "findings" && (
        <div
          id="panel-findings"
          role="tabpanel"
          aria-labelledby="tab-findings"
          tabIndex={0}
          className="space-y-8 focus:outline-hidden"
        >
          <div className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-xs space-y-6">
            <div className="pb-4 border-b border-[#E2E6EE]">
              <h2 className="text-lg font-bold text-[#172033]">
                Assessment Strategic Findings &amp; Risk Matrix
              </h2>
              <p className="text-xs text-[#667085] mt-1">
                Contextual insights synthesized from qualitative discovery responses (Q01–Q03, Q05, Q08–Q11, Q13, Q16–Q19, Q22).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Finding 1: Environmental & Tech Debt */}
              <div className="p-5 rounded-xl bg-[#F1F3F7] border border-[#E2E6EE] space-y-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-[#38B449]" />
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                    Estate Scale &amp; Technical Debt (Q01, Q05)
                  </h3>
                </div>
                <p className="text-xs text-[#172033]">
                  <strong>Estate Scale:</strong> {answers.q01_scale || "51–100 queue managers"} across enterprise infrastructure.
                </p>
                <p className="text-xs text-[#172033]">
                  <strong>Technical Debt:</strong> {answers.q05_tech_debt || "Multiple legacy versions and unsupported instances in production"}.
                </p>
              </div>

              {/* Finding 2: Observability & Swivel-Chair Friction */}
              <div className="p-5 rounded-xl bg-[#F1F3F7] border border-[#E2E6EE] space-y-3">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-[#172033]" />
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                    Observability &amp; Tooling Friction (Q09, Q10)
                  </h3>
                </div>
                <p className="text-xs text-[#172033]">
                  <strong>Tooling Consolidation:</strong> Teams utilize {answers.q09_tools_count || "2–3 disparate tools"} during diagnostic triage.
                </p>
                <p className="text-xs text-[#172033]">
                  <strong>Tracing Friction:</strong> Message-level tracing is {answers.q10_manual_tracing || "mostly manual log correlation across siloed teams"}.
                </p>
              </div>

              {/* Finding 3: Cybersecurity & Compliance */}
              <div className="p-5 rounded-xl bg-[#F1F3F7] border border-[#E2E6EE] space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-[#008638]" />
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                    Security &amp; Governance Friction (Q18, Q19)
                  </h3>
                </div>
                <p className="text-xs text-[#172033]">
                  <strong>Audit Pressure:</strong> {answers.q18_audit_effort || "Moderate regulatory and security audit oversight"}.
                </p>
                <p className="text-xs text-[#172033]">
                  <strong>Remediation Friction:</strong> Patching and CVE remediation introduces {answers.q19_documentation_effort || "moderate operational friction and manual testing"}.
                </p>
              </div>

              {/* Finding 4: Executive Mandate & Timing */}
              <div className="p-5 rounded-xl bg-[#F1F3F7] border border-[#E2E6EE] space-y-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-[#38B449]" />
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                    Executive Mandate &amp; Time to Act (Q16, Q17, Q22)
                  </h3>
                </div>
                <p className="text-xs text-[#172033]">
                  <strong>OpEx Mandate:</strong> {answers.q16_cost_mandate || "Active management goal for infrastructure modernization"}.
                </p>
                <p className="text-xs text-[#172033]">
                  <strong>Target Horizon:</strong> Demonstration of measurable efficiency targeted {answers.q22_migration_plans || "near-term (90–180 days)"}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: 6. Calculation Engine Metric Inventory & Provenance */}
      {activeTab === "provenance" && (
        <div
          id="panel-provenance"
          role="tabpanel"
          aria-labelledby="tab-provenance"
          tabIndex={0}
          className="space-y-8 focus:outline-hidden"
        >
          <div className="rounded-xl border border-[#E2E6EE] bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Calculation Engine Provenance &amp; Metric Inventory
                </h2>
                <p className="text-xs text-[#667085] mt-1">
                  Complete audit trail of all deterministic outputs, evaluation states, and mathematical formula codes generated by Phase 3 engine v{calculation.calculation_engine_version}.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#008638] bg-[#EEF8F0] px-2.5 py-1 rounded border border-[#A8E2B5]">
                Rule Version: calc-rules-v1.0.0
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E2E6EE] text-xs text-left">
                <thead className="bg-[#F1F3F7] font-bold text-[#172033]">
                  <tr>
                    <th className="py-3 px-4">Metric Key</th>
                    <th className="py-3 px-4">Calculated Value</th>
                    <th className="py-3 px-4">Evaluation State</th>
                    <th className="py-3 px-4">Data Provenance Tier</th>
                    <th className="py-3 px-4">Formula / Source Logic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6EE] font-mono">
                  {Object.entries(metrics).map(([key, metric]) => (
                    <tr key={key} className="hover:bg-[#EEF8F0]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#172033] font-sans">
                        {key}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#172033]">
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
                              ? "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                              : metric.state === "INSUFFICIENT_DATA"
                              ? "bg-amber-50 text-amber-800 border border-amber-300"
                              : metric.state === "INDUSTRY_BENCHMARK"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : "bg-[#F1F3F7] text-[#172033]"
                          }`}
                        >
                          {metric.state}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#667085] font-sans">
                        <ProvenanceBadge provenance={metric.provenance} showTooltip={false} />
                      </td>
                      <td className="py-3 px-4 text-[#667085] text-[11px]">
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

      {/* Show the Math Detail Drawer (Authorized Consultant / Admin Persona) */}
      {isAuthorizedForMath && (
        <ShowTheMathDrawer
          isOpen={isShowMathOpen}
          onClose={() => setIsShowMathOpen(false)}
          calculation={calculation}
          customerName={customer?.name}
          answers={answers}
        />
      )}
    </div>
  );
};
