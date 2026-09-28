"use client";

import React from "react";
import {
  ShieldCheck,
  Building,
  Calculator,
  Sliders,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Info,
} from "lucide-react";

export type ProvenanceTier =
  | "CUSTOMER_FACT"
  | "INDUSTRY_BENCHMARK"
  | "CALCULATED_RESULT"
  | "SCENARIO_PROJECTION"
  | "DEMO_DATA"
  | "BENCHMARK_FALLBACK"
  | "MODEL_ASSUMPTION";

export type MetricEvaluationState =
  | "VALID"
  | "VALID_WITH_DEFAULTS"
  | "INDUSTRY_BENCHMARK"
  | "INSUFFICIENT_DATA"
  | "NOT_MODELED"
  | "NOT_APPLICABLE";

interface ProvenanceBadgeProps {
  provenance?: string;
  state?: string;
  formulaCode?: string;
  showTooltip?: boolean;
  className?: string;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  provenance,
  state,
  formulaCode,
  showTooltip = true,
  className = "",
}) => {
  // Normalize Provenance
  const getProvenanceConfig = () => {
    switch (provenance) {
      case "CUSTOMER_FACT":
      case "CUSTOMER_INPUT":
        return {
          label: "Customer Fact",
          icon: Building,
          color: "bg-slate-100 text-[#172033] border-slate-300",
          description: "Verified customer input provided during assessment discovery.",
        };
      case "INDUSTRY_BENCHMARK":
      case "BENCHMARK_FALLBACK":
        return {
          label: "Industry Benchmark",
          icon: Sparkles,
          color: "bg-[#FAF5FF] text-[#722F8A] border-[#E9D5FF]",
          description: "Authoritative industry benchmark applied due to unspecified customer figure.",
        };
      case "CALCULATED_RESULT":
      case "DETERMINISTIC_CALCULATION":
        return {
          label: "Calculated Metric",
          icon: Calculator,
          color: "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]",
          description: "Deterministic mathematical computation executed by Phase 3 calculation engine.",
        };
      case "SCENARIO_PROJECTION":
      case "ILLUSTRATIVE_SCENARIO":
        return {
          label: "Illustrative Scenario",
          icon: Sliders,
          color: "bg-amber-50 text-amber-800 border-amber-300",
          description: "Hypothetical model projection based on approved improvement scenario parameters.",
        };
      case "MODEL_ASSUMPTION":
        return {
          label: "Model Baseline",
          icon: Info,
          color: "bg-slate-100 text-slate-700 border-slate-200",
          description: "Standard model baseline assumption (e.g. $180,000/yr loaded labor rate).",
        };
      default:
        return {
          label: provenance || "Model Data",
          icon: ShieldCheck,
          color: "bg-slate-100 text-slate-600 border-slate-200",
          description: "Data element tracked under governance framework.",
        };
    }
  };

  // State Badge Config
  const getStateConfig = () => {
    switch (state) {
      case "VALID":
      case "VALID_WITH_DEFAULTS":
        return {
          label: "Validated",
          color: "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]",
        };
      case "INDUSTRY_BENCHMARK":
        return {
          label: "Benchmark Applied",
          color: "bg-[#FAF5FF] text-[#722F8A] border-[#E9D5FF]",
        };
      case "INSUFFICIENT_DATA":
        return {
          label: "Insufficient Data",
          color: "bg-amber-100 text-amber-800 border-amber-300",
        };
      case "NOT_MODELED":
        return {
          label: "Not Modeled",
          color: "bg-slate-100 text-slate-700 border-slate-300",
        };
      case "NOT_APPLICABLE":
        return {
          label: "N/A",
          color: "bg-slate-100 text-slate-500 border-slate-200",
        };
      default:
        return null;
    }
  };

  const prov = getProvenanceConfig();
  const st = getStateConfig();
  const Icon = prov.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Provenance Badge */}
      <span
        title={showTooltip ? `${prov.label}: ${prov.description}` : undefined}
        className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${prov.color} shadow-xs transition-colors`}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span>{prov.label}</span>
      </span>

      {/* State Badge if distinct */}
      {st && state !== "VALID" && (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${st.color}`}
        >
          {st.label}
        </span>
      )}

      {/* Optional Formula Identifier Tag */}
      {formulaCode && (
        <span
          title={`Formula: ${formulaCode}`}
          className="hidden sm:inline-flex font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
        >
          {formulaCode}
        </span>
      )}
    </div>
  );
};
