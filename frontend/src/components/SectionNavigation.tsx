"use client";

import React from "react";
import { Check, CircleDot, FileCheck } from "lucide-react";
import { AssessmentResponseState, SectionDefinition } from "../types/assessment";

interface SectionNavigationProps {
  sections: SectionDefinition[];
  currentSectionId: string; // "A".."G" or "REVIEW"
  onSelectSection: (sectionId: string) => void;
  answers: AssessmentResponseState;
  questionsMap: Record<string, any>;
}

export const SectionNavigation: React.FC<SectionNavigationProps> = ({
  sections,
  currentSectionId,
  onSelectSection,
  answers,
  questionsMap,
}) => {
  // Helper to calculate answered count for a section
  const getSectionStats = (section: SectionDefinition) => {
    let answered = 0;
    section.questionIds.forEach((qId) => {
      const qCode = qId.toLowerCase();
      // Look up answer in state
      const hasAnswer = Object.entries(answers).some(([k, v]) => {
        return k.startsWith(qCode) && v !== undefined && v !== null && v !== "";
      });
      if (hasAnswer) answered++;
    });
    return {
      answered,
      total: section.questionIds.length,
      isComplete: answered === section.questionIds.length,
      isPartial: answered > 0 && answered < section.questionIds.length,
    };
  };

  return (
    <nav aria-label="Assessment Sections Navigation" className="w-full bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
          {sections.map((sec, idx) => {
            const isActive = currentSectionId === sec.id;
            const stats = getSectionStats(sec);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSelectSection(sec.id)}
                aria-current={isActive ? "step" : undefined}
                className={`group flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-white text-blue-900 border-blue-400 shadow-sm ring-1 ring-blue-500/20"
                    : "text-slate-600 bg-slate-100/70 border-transparent hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                {/* Status Indicator Badge */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                    stats.isComplete
                      ? "bg-emerald-100 text-emerald-700"
                      : stats.isPartial
                      ? "bg-amber-100 text-amber-700"
                      : isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {stats.isComplete ? (
                    <Check className="h-3 w-3 stroke-[3]" />
                  ) : stats.isPartial ? (
                    <CircleDot className="h-3 w-3" />
                  ) : (
                    <span>{sec.id}</span>
                  )}
                </div>

                {/* Section Name & Count */}
                <div className="flex flex-col text-left">
                  <span className="font-semibold leading-tight">
                    Section {sec.id}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {stats.answered}/{stats.total} Answered
                  </span>
                </div>
              </button>
            );
          })}

          {/* Review Step Tab */}
          <button
            type="button"
            onClick={() => onSelectSection("REVIEW")}
            aria-current={currentSectionId === "REVIEW" ? "step" : undefined}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
              currentSectionId === "REVIEW"
                ? "bg-white text-blue-900 border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                : "text-slate-700 bg-slate-100 border-transparent hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <FileCheck className="h-4 w-4 text-blue-600" />
            <span>Review & Submit</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
