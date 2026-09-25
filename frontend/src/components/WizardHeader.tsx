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
  saveStatus: "saved" | "saving" | "unsaved" | "error";
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
    <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Section Context */}
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <span>Section {currentSection.id} of {totalSections}</span>
            <span>•</span>
            <span>{answeredCount} of {totalQuestions} Questions Answered</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl tracking-tight mt-0.5">
            {currentSection.title}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">{currentSection.subtitle}</p>
        </div>

        {/* Action & Progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:self-center">
          {/* Progress Bar & Percentage */}
          <div className="flex items-center space-x-3 w-full sm:w-48">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/80">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-xs font-bold text-slate-700 font-mono w-10 text-right">
              {percentage}%
            </span>
          </div>

          {/* Save Status & Action */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mr-1">
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-slate-600">Progress saved</span>
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
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-slate-500" />
              <span>Save Progress</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
