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
import { useAuth } from "../context/AuthContext";

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
  userRole?: string;
  showConsultantDetails?: boolean;
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
  userRole,
  showConsultantDetails,
}) => {
  const { user } = useAuth();
  const effectiveRole = userRole || user?.role;
  const isConsultantOrAdmin =
    Boolean(showConsultantDetails) ||
    effectiveRole === "CONSULTANT" ||
    effectiveRole === "PLATFORM_ADMIN" ||
    effectiveRole === "PARTNER_ADMIN" ||
    effectiveRole === "TENANT_ADMIN" ||
    effectiveRole === "SUPER_ADMIN" ||
    effectiveRole === "DATAEKO_ADMIN";

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

  // Not Sure Detection & Action Handler
  const notSureOption = question.options?.find((opt) => opt.isUnknownOrNotSure);
  const supportsNotSure =
    Boolean(notSureOption) ||
    question.code === "Q04" ||
    question.code === "Q15" ||
    question.code === "Q21";

  const isNotSureSelected =
    effectiveSelectedValue === "Not sure" ||
    effectiveSelectedValue === "UNKNOWN" ||
    Boolean(isUnknown);

  const handleNotSureClick = () => {
    if (notSureOption) {
      onSelectOption(notSureOption.value);
    } else if (question.code === "Q04" || question.code === "Q15" || question.code === "Q21") {
      onSelectOption("UNKNOWN");
    }
    if (onOverrideChange) {
      onOverrideChange(undefined);
    }
  };

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
            {isConsultantOrAdmin && (
              <span className="text-[11px] text-[#5B6579] font-medium block mt-0.5">
                Theme: {question.theme}
              </span>
            )}
          </div>
        </div>

        {/* Calculation Badge (Consultant / Admin only) */}
        {isConsultantOrAdmin && question.feedsCalculation && (
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
            <span className="font-semibold">Previous draft selection:</span> {selectedValue}. Please enter quarterly hours below or select &quot;Not sure&quot;.
          </div>
        )}

        {/* Type A: Controlled Dropdown Options */}
        {question.options && question.options.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor={`select-${question.id}`}
                className="block text-xs font-semibold text-[#5B6579]"
              >
                Select Approved Response
              </label>
              {supportsNotSure && (
                <button
                  type="button"
                  onClick={handleNotSureClick}
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] rounded-md border font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                    isNotSureSelected
                      ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]"
                      : "bg-[#F7F8FA] text-[#5B6579] border-[#E2E6EE] hover:bg-[#EEF8F0]/60 hover:text-[#172033]"
                  }`}
                  aria-label={`${question.code}: Mark as Not sure`}
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Not sure</span>
                </button>
              )}
            </div>
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
                <option value="">-- Choose a response --</option>
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
                    ? (question.code === "Q04" ? "Hide quarterly hours input" : "Hide custom input")
                    : (question.code === "Q04" ? "Provide estimated quarterly hours" : `Provide custom input (${question.overrideLabel || "Custom Value"})`)}
                </span>
              </button>

              <div className="flex items-center space-x-2">
                {supportsNotSure && !question.options?.length && (
                  <button
                    type="button"
                    onClick={handleNotSureClick}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] rounded-md border font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                      isNotSureSelected
                        ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]"
                        : "bg-[#F7F8FA] text-[#5B6579] border-[#E2E6EE] hover:bg-[#EEF8F0]/60 hover:text-[#172033]"
                    }`}
                  >
                    <HelpCircle className="h-3 w-3" />
                    <span>Not sure</span>
                  </button>
                )}

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
            </div>

            {useOverrideMode && (
              <div className="mt-2 rounded-lg bg-[#F8FAFC] p-3 border border-[#E2E6EE] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`override-${question.id}`}
                    className="block text-xs font-bold text-[#172033]"
                  >
                    {question.overrideLabel || "Custom Input"}
                  </label>
                  {isConsultantOrAdmin && (
                    <span className="text-[10px] font-semibold text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
                      {question.code === "Q04" ? "Customer Fact" : "Customer Fact Override"}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    id={`override-${question.id}`}
                    type="number"
                    step="any"
                    min={question.code === "Q04" ? "0" : undefined}
                    placeholder={question.overridePlaceholder || "0"}
                    aria-label={`${question.code} exact numeric value: ${question.overrideLabel || "Custom Input"}`}
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

                {/* Helper hint / description */}
                {question.code === "Q04" ? (
                  <p className="text-[11px] text-[#5B6579] leading-normal">
                    Enter a rough estimate of total team hours per quarter. An exact figure isn&apos;t required.
                  </p>
                ) : question.exampleHint ? (
                  <p className="text-[11px] text-[#5B6579]">
                    {question.exampleHint}
                  </p>
                ) : null}

                {question.code === "Q04" && question.exampleHint && (
                  <p className="text-[10px] text-[#738096] italic">
                    {question.exampleHint}
                  </p>
                )}
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

        {/* Compact Engine Impact Banner (Consultant / Admin only) */}
        {isConsultantOrAdmin && question.calculationNote && (
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

        {/* Seller Guidance Accordion (Consultant / Admin only) */}
        {isConsultantOrAdmin && question.sellerGuidance && (
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

