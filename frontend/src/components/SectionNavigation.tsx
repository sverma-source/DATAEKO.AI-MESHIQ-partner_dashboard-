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
    <nav aria-label="Assessment Sections Navigation" className="w-full bg-[#F7F8FA] border-b border-[#E2E6EE]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1.5 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
          {sections.map((sec) => {
            const isActive = currentSectionId === sec.id;
            const stats = getSectionStats(sec);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSelectSection(sec.id)}
                title={`${sec.id}. ${sec.title} — ${stats.answered}/${stats.total} questions answered`}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Section ${sec.id}: ${sec.title} — ${
                  stats.isComplete
                    ? "Completed"
                    : `${stats.answered} of ${stats.total} questions answered`
                }`}
                className={`group relative flex items-center space-x-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1 cursor-pointer ${
                  isActive
                    ? "bg-white text-[#172033] border-[#008638] shadow-xs ring-1 ring-[#008638]/20 font-bold"
                    : stats.isComplete
                    ? "bg-white text-[#172033] border-[#E2E6EE] hover:border-[#A8E2B5] hover:bg-[#FAFBFD]"
                    : stats.isPartial
                    ? "bg-white text-[#172033] border-amber-300 hover:border-amber-400 hover:bg-[#FFFDF9]"
                    : "text-[#5B6579] bg-white/70 border-[#E2E6EE] hover:bg-white hover:text-[#172033] hover:border-[#CBD2DE]"
                }`}
              >
                {/* Status Indicator Badge */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-150 ${
                    stats.isComplete
                      ? "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                      : stats.isPartial
                      ? "bg-amber-50 text-amber-700 border border-amber-300"
                      : isActive
                      ? "bg-[#008638] text-white"
                      : "bg-[#F1F3F7] text-[#5B6579] border border-[#E2E6EE]"
                  }`}
                  aria-hidden="true"
                >
                  {stats.isComplete ? (
                    <Check className="h-3 w-3 stroke-[3] text-[#008638]" />
                  ) : stats.isPartial ? (
                    <CircleDot className="h-3 w-3 text-amber-600" />
                  ) : (
                    <span>{sec.id}</span>
                  )}
                </div>

                {/* Section Name & Count */}
                <div className="flex flex-col text-left min-w-0">
                  <span
                    className={`leading-tight ${
                      isActive
                        ? "font-extrabold text-[#172033]"
                        : stats.isComplete || stats.isPartial
                        ? "font-bold text-[#172033]"
                        : "font-semibold text-[#5B6579] group-hover:text-[#172033]"
                    }`}
                  >
                    {sec.title}
                  </span>
                  <span
                    className={`text-[10px] leading-tight font-medium ${
                      stats.isComplete
                        ? "text-[#008638] font-semibold"
                        : stats.isPartial
                        ? "text-amber-700 font-semibold"
                        : "text-[#8A94A6]"
                    }`}
                  >
                    {stats.isComplete
                      ? "Completed"
                      : `${stats.answered}/${stats.total} Answered`}
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
            aria-label="Review & Submit - Assessment Summary"
            className={`flex items-center space-x-2 px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-colors duration-150 whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1 cursor-pointer ${
              currentSectionId === "REVIEW"
                ? "bg-white text-[#008638] border-[#008638] shadow-xs ring-1 ring-[#008638]/20"
                : "text-[#172033] bg-[#EEF8F0] border-[#A8E2B5] hover:bg-[#E2F5E6]"
            }`}
          >
            <FileCheck className="h-4 w-4 text-[#008638]" aria-hidden="true" />
            <span>Review &amp; Submit</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
