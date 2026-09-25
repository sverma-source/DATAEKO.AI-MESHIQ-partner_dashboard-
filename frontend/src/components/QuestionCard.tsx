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
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:border-slate-300">
      {/* Top Header: Code, Title, Feeds Calculation Tag */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 font-mono text-xs font-bold text-blue-700 border border-blue-200/60">
            {question.code}
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              {question.title}
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Theme: {question.theme}
            </span>
          </div>
        </div>

        {/* Calculation Badge */}
        {question.feedsCalculation && (
          <div
            className="flex items-center space-x-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-200/60"
            title={question.calculationNote || "Directly feeds economic engine"}
          >
            <Calculator className="h-3 w-3" />
            <span className="hidden sm:inline">Feeds Calculation</span>
          </div>
        )}
      </div>

      {/* Question Prompt */}
      <p className="mt-3 text-sm font-medium text-slate-800 leading-relaxed">
        {question.questionText}
      </p>

      {/* Input / Control Body */}
      <div className="mt-4 space-y-4">
        {/* Type A: Controlled Dropdown Options */}
        {question.options && question.options.length > 0 && (
          <div>
            <label
              htmlFor={`select-${question.id}`}
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Select Approved Response
            </label>
            <div className="relative">
              <select
                id={`select-${question.id}`}
                value={selectedValue || ""}
                onChange={(e) => onSelectOption(e.target.value)}
                className={`w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <option value="">-- Choose an assessment response --</option>
                {question.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {/* Type B: Numeric Override / Exact Value Toggle */}
        {question.allowNumericOverride && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setUseOverrideMode(!useOverrideMode)}
                className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center space-x-1"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>
                  {useOverrideMode
                    ? "Hide exact numeric input"
                    : `Provide exact customer fact (${question.overrideLabel || "Exact Number"})`}
                </span>
              </button>

              {question.code === "Q20" && onDefaultToggle && (
                <button
                  type="button"
                  onClick={() => onDefaultToggle(!useDefault)}
                  className={`text-xs px-2 py-0.5 rounded border font-medium ${
                    useDefault
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {useDefault ? "Using Model Default ($180k/yr)" : "Using Custom Salary"}
                </button>
              )}
            </div>

            {useOverrideMode && (
              <div className="mt-2.5 rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                <label
                  htmlFor={`override-${question.id}`}
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {question.overrideLabel || "Exact Numeric Override"}
                </label>
                <div className="relative flex items-center">
                  <input
                    id={`override-${question.id}`}
                    type="number"
                    step="any"
                    placeholder={question.overridePlaceholder || "0.00"}
                    value={overrideValue !== undefined && overrideValue !== null ? overrideValue : ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      onOverrideChange(val);
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {question.overrideUnit && (
                    <span className="absolute right-3 text-xs font-medium text-slate-500 pointer-events-none">
                      {question.overrideUnit}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Customer verified figure overrides categorical estimate in calculation engine.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Validation Error */}
        {error && (
          <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-medium pt-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Calculation Note Banner */}
        {question.calculationNote && (
          <div className="flex items-start space-x-2 rounded-md bg-slate-50 px-3 py-2 border border-slate-200 text-xs text-slate-600">
            <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">Calculation Engine Impact: </span>
              <span>{question.calculationNote}</span>
            </div>
          </div>
        )}

        {/* Seller Guidance Accordion */}
        {question.sellerGuidance && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowSellerNotes(!showSellerNotes)}
              className="flex items-center space-x-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Consultant Probing & Seller Guidance</span>
              {showSellerNotes ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showSellerNotes && (
              <div className="mt-2 rounded-lg bg-amber-50/70 p-3 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                <span className="font-semibold block mb-0.5">Discovery Probe:</span>
                {question.sellerGuidance}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
