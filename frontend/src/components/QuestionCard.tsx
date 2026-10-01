"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Sparkles,
} from "lucide-react";
import { QuestionDefinition } from "../types/assessment";

interface QuestionCardProps {
  question: QuestionDefinition;
  selectedValue?: string;
  overrideValue?: number | string;
  isUnknown?: boolean;
  useDefault?: boolean;
  onSelectOption: (val: string) => void;
  onOverrideChange: (val?: number) => void;
  onUnknownToggle?: (isUnknown: boolean) => void;
  onDefaultToggle?: (useDefault: boolean) => void;
  error?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedValue,
  overrideValue,
  isUnknown,
  useDefault,
  onSelectOption,
  onOverrideChange,
  onUnknownToggle,
  onDefaultToggle,
  error,
}) => {
  const [showSellerNotes, setShowSellerNotes] = useState<boolean>(false);

  // Match selectedValue against options resiliently by value, label, or normalized dash
  const matchedOption = question.options?.find((opt) => {
    if (!selectedValue) return false;
    if (opt.value === selectedValue || opt.label === selectedValue) return true;
    const optValDash = opt.value.replace(/[\u2013\u2014]/g, "-").trim();
    const optLabelDash = opt.label.replace(/[\u2013\u2014]/g, "-").trim();
    const selValDash = String(selectedValue).replace(/[\u2013\u2014]/g, "-").trim();
    if (optValDash === selValDash || optLabelDash === selValDash) return true;
    if (selValDash.startsWith(optValDash) || optLabelDash.startsWith(selValDash)) return true;
    return false;
  });
  const effectiveSelectedValue = matchedOption ? matchedOption.value : (selectedValue || "");

  const hasOverride = overrideValue !== undefined && overrideValue !== null && overrideValue !== "";
  const [overrideToggled, setOverrideToggled] = useState<boolean | null>(null);

  // Reset explicit toggle when selected option changes so selection dictates override visibility
  React.useEffect(() => {
    setOverrideToggled(null);
  }, [effectiveSelectedValue]);

  const isOverrideOption = effectiveSelectedValue === "OVERRIDE";
  const isLegacyDraft =
    question.code === "Q04" &&
    Boolean(selectedValue) &&
    selectedValue !== "OVERRIDE" &&
    selectedValue !== "UNKNOWN" &&
    selectedValue !== "Not sure" &&
    !hasOverride;

  const useOverrideMode =
    overrideToggled !== null
      ? overrideToggled
      : (hasOverride || isOverrideOption || isLegacyDraft);

  const isQ04Answered =
    (hasOverride && Number(overrideValue) >= 0) ||
    effectiveSelectedValue === "UNKNOWN" ||
    effectiveSelectedValue === "Not sure";

  const isAnswered =
    question.code === "Q04"
      ? isQ04Answered
      : (effectiveSelectedValue !== undefined && effectiveSelectedValue !== null && effectiveSelectedValue !== "") ||
        hasOverride;

  const q04NegativeError =
    question.code === "Q04" &&
    overrideValue !== undefined &&
    overrideValue !== null &&
    overrideValue !== "" &&
    Number(overrideValue) < 0;

  const displayError = error || (q04NegativeError ? "Quarterly administration hours cannot be negative." : undefined);

  return (
    <div
      className={`rounded-xl border bg-white p-4 sm:p-5 shadow-xs transition-colors duration-150 ${
        displayError
          ? "border-rose-300 ring-1 ring-rose-200"
          : isAnswered
          ? "border-[#D4EAD8] hover:border-[#A8E2B5]"
          : "border-[#E2E6EE] hover:border-[#CBD2DE]"
      }`}
    >
      {/* Top Header: Code, Title, Feeds Calculation Tag */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-2.5 min-w-0">
          <span
            className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold mt-0.5 border ${
              isAnswered
                ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]"
                : "bg-[#F1F3F7] text-[#5B6579] border-[#E2E6EE]"
            }`}
            aria-label={`Question code ${question.code}`}
          >
            {question.code}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[#172033] tracking-tight leading-snug">
              {question.title}
            </h2>
            <span className="text-[11px] text-[#5B6579] font-medium block mt-0.5">
              Theme: {question.theme}
            </span>
          </div>
        </div>

        {/* Calculation Badge */}
        {question.feedsCalculation && (
          <div
            className="flex items-center space-x-1.5 rounded-full bg-[#EEF8F0] px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-[#008638] border border-[#A8E2B5] shrink-0"
            title={question.calculationNote || "Directly feeds economic engine"}
          >
            <Calculator className="h-3 w-3 text-[#38B449]" aria-hidden="true" />
            <span className="hidden sm:inline">Feeds Calculation</span>
          </div>
        )}
      </div>

      {/* Question Prompt */}
      <p className="mt-2.5 text-xs sm:text-sm font-medium text-[#172033] leading-relaxed">
        {question.questionText}
      </p>

      {/* Input / Control Body */}
      <div className="mt-3.5 space-y-3">
        {/* Legacy Draft Context Banner for Q04 */}
        {isLegacyDraft && (
          <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-900">
            <span className="font-semibold">Previous draft selection:</span> {selectedValue}. Please enter exact quarterly hours below or select &quot;Not sure&quot;.
          </div>
        )}

        {/* Type A: Controlled Dropdown Options */}
        {question.options && question.options.length > 0 && (
          <div>
            <label
              htmlFor={`select-${question.id}`}
              className="block text-xs font-semibold text-[#5B6579] mb-1"
            >
              Select Approved Response
            </label>
            <div className="relative">
              <select
                id={`select-${question.id}`}
                value={effectiveSelectedValue}
                onChange={(e) => onSelectOption(e.target.value)}
                aria-label={`${question.code}: ${question.title}`}
                aria-invalid={!!displayError}
                aria-describedby={displayError ? `error-${question.id}` : undefined}
                className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 sm:py-2.5 pr-10 text-xs sm:text-sm font-medium text-[#172033] shadow-xs transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:border-[#008638] cursor-pointer ${
                  displayError
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                    : isAnswered
                    ? "border-[#A8E2B5] hover:border-[#008638] hover:bg-[#FBFDFB]"
                    : "border-[#CBD2DE] hover:border-[#008638] hover:bg-[#FBFDFB]"
                }`}
              >
                <option value="">-- Choose an assessment response --</option>
                {question.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5B6579]" aria-hidden="true">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {/* Type B: Numeric Override / Exact Customer Fact */}
        {question.allowNumericOverride && (
          <div className="pt-1.5 border-t border-[#E2E6EE]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOverrideToggled(!useOverrideMode)}
                aria-expanded={useOverrideMode}
                className="text-xs font-semibold text-[#008638] hover:text-[#006B2D] hover:bg-[#EEF8F0] px-2 py-1 -ml-2 rounded-md flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#008638]" />
                <span>
                  {useOverrideMode
                    ? (question.code === "Q04" ? "Hide quarterly hours input" : "Hide exact numeric customer fact")
                    : (question.code === "Q04" ? "Provide exact quarterly hours" : `Provide exact customer fact (${question.overrideLabel || "Exact Number"})`)}
                </span>
              </button>

              {question.code === "Q20" && onDefaultToggle && (
                <button
                  type="button"
                  onClick={() => onDefaultToggle(!useDefault)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md border font-semibold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                    useDefault
                      ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5] hover:bg-[#E2F5E6] hover:border-[#008638]"
                      : "bg-[#F1F3F7] text-[#667085] border-[#CBD2DE] hover:bg-[#E8ECF2] hover:text-[#172033] hover:border-[#94A3B8]"
                  }`}
                >
                  {useDefault ? "Using Model Default ($180k/yr)" : "Using Custom Salary"}
                </button>
              )}
            </div>

            {useOverrideMode && (
              <div className="mt-2 rounded-lg bg-[#F8FAFC] p-3 border border-[#E2E6EE] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`override-${question.id}`}
                    className="block text-xs font-bold text-[#172033]"
                  >
                    {question.overrideLabel || "Exact Numeric Override"}
                  </label>
                  <span className="text-[10px] font-semibold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
                    {question.code === "Q04" ? "Customer Fact" : "Customer Fact Override"}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    id={`override-${question.id}`}
                    type="number"
                    step="any"
                    min={question.code === "Q04" ? "0" : undefined}
                    placeholder={question.overridePlaceholder || "0.00"}
                    aria-label={`${question.code} exact numeric value: ${question.overrideLabel || "Exact Numeric Override"}`}
                    aria-invalid={!!displayError}
                    aria-describedby={displayError ? `error-${question.id}` : undefined}
                    value={overrideValue !== undefined && overrideValue !== null ? overrideValue : ""}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      onOverrideChange(val);
                    }}
                    className="w-full rounded-lg border border-[#CBD2DE] hover:border-[#94A3B8] focus:border-[#008638] bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#172033] shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638]/20 transition-colors duration-150"
                  />
                  {question.overrideUnit && (
                    <span className="absolute right-3 text-xs font-semibold text-[#5B6579] pointer-events-none">
                      {question.overrideUnit}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5B6579]">
                  {question.code === "Q04"
                    ? "Total combined staff hours per typical quarter spent on routine IBM MQ administration and management."
                    : "Customer verified figure overrides categorical estimate in calculation engine."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Validation Error */}
        {displayError && (
          <div id={`error-${question.id}`} role="alert" className="flex items-center space-x-1.5 text-xs text-rose-600 font-medium pt-0.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Compact Engine Impact Banner */}
        {question.calculationNote && (
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2 border border-[#E2E6EE] text-xs">
            <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-[#008638]">
              <Info className="h-3.5 w-3.5 shrink-0 text-[#008638]" />
              <span>ENGINE IMPACT</span>
            </div>
            <p className="text-xs text-[#172033] mt-0.5 leading-normal">
              {question.calculationNote}
            </p>
          </div>
        )}

        {/* Seller Guidance Accordion */}
        {question.sellerGuidance && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowSellerNotes(!showSellerNotes)}
              aria-expanded={showSellerNotes}
              aria-controls={`guidance-${question.id}`}
              className="flex items-center space-x-1.5 text-xs font-semibold text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7] px-2 py-1 -ml-2 rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638]"
            >
              <HelpCircle className="h-3.5 w-3.5 text-[#5B6579]" />
              <span>Consultant Probing &amp; Seller Guidance</span>
              {showSellerNotes ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showSellerNotes && (
              <div id={`guidance-${question.id}`} className="mt-2 rounded-lg bg-amber-50/80 p-3 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5 text-amber-950">Discovery Probe:</span>
                {question.sellerGuidance}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
