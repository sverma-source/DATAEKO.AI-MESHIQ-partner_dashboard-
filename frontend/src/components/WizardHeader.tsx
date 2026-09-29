"use client";

import React from "react";
import { Check, Cloud, Loader2, Save } from "lucide-react";
import { SectionDefinition } from "../types/assessment";

interface WizardHeaderProps {
  currentSection: SectionDefinition;
  currentSectionIndex: number;
  totalSections: number;
  answeredCount: number;
  totalQuestions: number;
  saveStatus: "initialized" | "saved" | "saving" | "unsaved" | "error";
  onSave: () => void;
  isSaving: boolean;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentSection,
  currentSectionIndex,
  totalSections,
  answeredCount,
  totalQuestions,
  saveStatus,
  onSave,
  isSaving,
}) => {
  const percentage = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="bg-white border-b border-[#E2E6EE] px-4 py-4 sm:px-6 lg:px-8 shadow-xs">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Section Context & Hierarchy */}
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#008638]">
            <span>Section {currentSectionIndex} of {totalSections}</span>
            <span className="text-[#CBD2DE]" aria-hidden="true">•</span>
            <span>{answeredCount} of {totalQuestions} Questions Answered</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#172033] sm:text-2xl tracking-tight mt-0.5">
            {currentSection.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6579] mt-0.5 max-w-2xl leading-relaxed">{currentSection.subtitle}</p>
        </div>

        {/* Action & Progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:self-center">
          {/* Progress Bar & Percentage */}
          <div className="flex items-center space-x-3 w-full sm:w-48">
            <div className="flex-1 bg-[#F1F3F7] rounded-full h-2 overflow-hidden border border-[#E2E6EE]">
              <div
                className="bg-[#008638] h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Assessment completion progress: ${percentage}%`}
              />
            </div>
            <span className="text-xs font-bold text-[#172033] font-mono w-10 text-right">
              {percentage}%
            </span>
          </div>

          {/* Save Status & Action */}
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 text-xs text-[#5B6579] mr-1" aria-live="polite">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#008638]" />
                  <span className="text-[#008638] font-semibold">Saving...</span>
                </>
              ) : saveStatus === "initialized" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-600 font-medium">Draft initialized</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#008638]" />
                  <span className="text-[#008638] font-medium">Progress saved</span>
                </>
              ) : saveStatus === "unsaved" ? (
                <>
                  <Cloud className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-700 font-medium">Unsaved changes</span>
                </>
              ) : (
                <span className="text-rose-600 font-medium">Save failed</span>
              )}
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              aria-label="Save Progress"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD2DE] bg-white text-[#172033] hover:bg-[#F1F3F7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1 transition-colors duration-150 shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5 text-[#5B6579]" />
              <span>Save Progress</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
