"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleDot, FileCheck } from "lucide-react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

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

  // Safe horizontal scroll helper with JSDOM fallback and reduced motion support
  const safeScrollTo = useCallback((targetLeft: number, smooth: boolean = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const behavior = smooth && !prefersReducedMotion ? "smooth" : "auto";
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ left: targetLeft, behavior });
    } else {
      container.scrollLeft = targetLeft;
    }
  }, []);

  // Check scroll container overflow state
  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const hasScrollLeft = el.scrollLeft > 2;
    const hasScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setCanScrollLeft(hasScrollLeft);
    setCanScrollRight(hasScrollRight);
  }, []);

  // Listen for scroll & resize events
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateScrollState();
    };

    updateScrollState();
    const rafId = requestAnimationFrame(updateScrollState);

    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollState);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateScrollState();
      });
      ro.observe(el);
    }

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollState);
      ro?.disconnect();
    };
  }, [updateScrollState]);

  // Bring active section into view when currentSectionId changes without page-level jumps
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const activeBtn = container.querySelector(
      `[data-section-id="${currentSectionId}"]`
    ) as HTMLElement | null;
    if (!activeBtn) return;

    const containerLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const btnLeft = activeBtn.offsetLeft;
    const btnWidth = activeBtn.offsetWidth;
    const buffer = 32;

    if (btnLeft < containerLeft + buffer) {
      safeScrollTo(Math.max(0, btnLeft - buffer));
    } else if (btnLeft + btnWidth > containerLeft + containerWidth - buffer) {
      safeScrollTo(
        Math.min(
          container.scrollWidth - containerWidth,
          btnLeft + btnWidth - containerWidth + buffer
        )
      );
    }

    const timer = setTimeout(updateScrollState, 350);
    return () => clearTimeout(timer);
  }, [currentSectionId, safeScrollTo, updateScrollState]);

  // Ensure focused item is brought into view for keyboard users
  const handleButtonFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    const container = scrollContainerRef.current;
    const btn = e.currentTarget;
    if (!container || !btn) return;
    const containerLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const btnLeft = btn.offsetLeft;
    const btnWidth = btn.offsetWidth;
    const buffer = 32;

    if (btnLeft < containerLeft + buffer) {
      safeScrollTo(Math.max(0, btnLeft - buffer));
    } else if (btnLeft + btnWidth > containerLeft + containerWidth - buffer) {
      safeScrollTo(
        Math.min(
          container.scrollWidth - containerWidth,
          btnLeft + btnWidth - containerWidth + buffer
        )
      );
    }
  };

  // Manual scroll buttons for mouse / pointer navigation
  const handleManualScroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = Math.max(180, Math.floor(container.clientWidth * 0.6));
    const targetLeft =
      direction === "left"
        ? Math.max(0, container.scrollLeft - scrollAmount)
        : Math.min(
            container.scrollWidth - container.clientWidth,
            container.scrollLeft + scrollAmount
          );

    safeScrollTo(targetLeft);
  };

  return (
    <nav
      aria-label="Assessment Sections Navigation"
      className="relative w-full bg-[#F7F8FA] border-b border-[#E2E6EE] select-none overflow-hidden"
    >
      {/* Subtle meshIQ Section Track Ambient Motif */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute right-0 top-0 bottom-0 w-80 pointer-events-none opacity-25 overflow-hidden"
      >
        <svg viewBox="0 0 320 60" className="w-full h-full" fill="none">
          <path d="M 0 50 C 80 20, 200 45, 320 15" stroke="#38B449" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 40 55 C 110 30, 220 50, 320 25" stroke="#8CC63E" strokeWidth="0.85" />
          <path d="M 80 60 C 140 40, 240 55, 320 35" stroke="#C026D3" strokeWidth="0.75" opacity="0.6" strokeDasharray="2 3" />
        </svg>
      </div>
      <div className="relative mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* Left Scroll Affordance & Control */}
        {canScrollLeft && (
          <div className="absolute left-0 sm:left-2 top-0 bottom-0 z-10 flex items-center pr-8 bg-gradient-to-r from-[#F7F8FA] via-[#F7F8FA]/95 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => handleManualScroll("left")}
              aria-label="Scroll section navigation left"
              className="pointer-events-auto ml-1 sm:ml-2 h-7 w-7 rounded-full bg-white border border-[#CBD2DE] text-[#172033] shadow-xs flex items-center justify-center hover:bg-[#F1F3F7] hover:border-[#008638] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-[#172033]" />
            </button>
          </div>
        )}

        {/* Right Scroll Affordance & Control */}
        {canScrollRight && (
          <div className="absolute right-0 sm:right-2 top-0 bottom-0 z-10 flex items-center pl-8 bg-gradient-to-l from-[#F7F8FA] via-[#F7F8FA]/95 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => handleManualScroll("right")}
              aria-label="Scroll section navigation right"
              className="pointer-events-auto mr-1 sm:mr-2 h-7 w-7 rounded-full bg-white border border-[#CBD2DE] text-[#172033] shadow-xs flex items-center justify-center hover:bg-[#F1F3F7] hover:border-[#008638] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-[#172033]" />
            </button>
          </div>
        )}

        {/* Horizontal Navigation Scroll Track */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-1.5 sm:space-x-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth"
        >
          {sections.map((sec) => {
            const isActive = currentSectionId === sec.id;
            const stats = getSectionStats(sec);

            return (
              <button
                key={sec.id}
                data-section-id={sec.id}
                onFocus={handleButtonFocus}
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
            data-section-id="REVIEW"
            onFocus={handleButtonFocus}
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
