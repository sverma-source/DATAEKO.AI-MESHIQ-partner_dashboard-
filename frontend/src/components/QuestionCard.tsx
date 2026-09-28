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
  const [useOverrideMode, setUseOverrideMode] = useState<boolean>(
    overrideValue !== undefined && overrideValue !== null && overrideValue !== ""
  );

  return (
    <div className="rounded-xl border border-[#E2E6EE] bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-[#CBD2DE]">
      {/* Top Header: Code, Title, Feeds Calculation Tag */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-2.5">
          <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md bg-[#EEF8F0] font-mono text-xs font-bold text-[#008638] border border-[#A8E2B5] mt-0.5">
            {question.code}
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#172033] tracking-tight leading-snug">
              {question.title}
            </h2>
            <span className="text-[11px] text-[#667085] font-medium block mt-0.5">
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
            <Calculator className="h-3 w-3 text-[#38B449]" />
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
        {/* Type A: Controlled Dropdown Options */}
        {question.options && question.options.length > 0 && (
          <div>
            <label
              htmlFor={`select-${question.id}`}
              className="block text-xs font-semibold text-[#667085] mb-1"
            >
              Select Approved Response
            </label>
            <div className="relative">
              <select
                id={`select-${question.id}`}
                value={selectedValue || ""}
                onChange={(e) => onSelectOption(e.target.value)}
                aria-label={`${question.code}: ${question.title}`}
                aria-invalid={!!error}
                aria-describedby={error ? `error-${question.id}` : undefined}
                className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 sm:py-2.5 pr-10 text-xs sm:text-sm font-medium text-[#172033] shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#008638] focus:border-[#008638] ${
                  error
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                    : "border-[#CBD2DE] hover:border-slate-400"
                }`}
              >
                <option value="">-- Choose an assessment response --</option>
                {question.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#667085]">
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
                onClick={() => setUseOverrideMode(!useOverrideMode)}
                aria-expanded={useOverrideMode}
                className="text-xs font-semibold text-[#008638] hover:text-[#006B2D] flex items-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] rounded-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#008638]" />
                <span>
                  {useOverrideMode
                    ? "Hide exact numeric customer fact"
                    : `Provide exact customer fact (${question.overrideLabel || "Exact Number"})`}
                </span>
              </button>

              {question.code === "Q20" && onDefaultToggle && (
                <button
                  type="button"
                  onClick={() => onDefaultToggle(!useDefault)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md border font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                    useDefault
                      ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]"
                      : "bg-[#F1F3F7] text-[#667085] border-[#CBD2DE]"
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
                    Customer Fact Override
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    id={`override-${question.id}`}
                    type="number"
                    step="any"
                    placeholder={question.overridePlaceholder || "0.00"}
                    aria-label={`${question.code} exact numeric value: ${question.overrideLabel || "Exact Numeric Override"}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `error-${question.id}` : undefined}
                    value={overrideValue !== undefined && overrideValue !== null ? overrideValue : ""}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      onOverrideChange(val);
                    }}
                    className="w-full rounded-lg border border-[#CBD2DE] bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#172033] shadow-xs focus:border-[#008638] focus:outline-none focus:ring-2 focus:ring-[#008638]/20"
                  />
                  {question.overrideUnit && (
                    <span className="absolute right-3 text-xs font-semibold text-[#667085] pointer-events-none">
                      {question.overrideUnit}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#667085]">
                  Customer verified figure overrides categorical estimate in calculation engine.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Validation Error */}
        {error && (
          <div id={`error-${question.id}`} role="alert" className="flex items-center space-x-1.5 text-xs text-rose-600 font-medium pt-0.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
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
              className="flex items-center space-x-1 text-xs font-semibold text-[#667085] hover:text-[#172033] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] rounded-sm"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Consultant Probing &amp; Seller Guidance</span>
              {showSellerNotes ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showSellerNotes && (
              <div id={`guidance-${question.id}`} className="mt-2 rounded-lg bg-amber-50/80 p-3 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5">Discovery Probe:</span>
                {question.sellerGuidance}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
