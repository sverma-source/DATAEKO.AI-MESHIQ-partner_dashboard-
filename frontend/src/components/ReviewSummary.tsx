"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit3,
  FileCheck,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  AssessmentResponseState,
  QuestionDefinition,
  SectionDefinition,
} from "../types/assessment";

interface ReviewSummaryProps {
  sections: SectionDefinition[];
  questionsMap: Record<string, QuestionDefinition>;
  answers: AssessmentResponseState;
  onEditSection: (sectionId: string) => void;
  onSubmitAssessment?: () => void;
  onSubmitCalculation?: () => void; // backwards-compatible alias
  isSubmitting?: boolean;
  isCalculating?: boolean; // backwards-compatible alias
  submissionError?: string | null;
  calculationError?: string | null; // backwards-compatible alias
  onRetrySubmission?: () => void;
  onRetryCalculation?: () => void; // backwards-compatible alias
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  sections,
  questionsMap,
  answers,
  onEditSection,
  onSubmitAssessment,
  onSubmitCalculation,
  isSubmitting = false,
  isCalculating = false,
  submissionError,
  calculationError,
  onRetrySubmission,
  onRetryCalculation,
}) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = onSubmitAssessment || onSubmitCalculation;
  const submitting = Boolean(isSubmitting || isCalculating);
  const error = submissionError || calculationError;
  const handleRetry = onRetrySubmission || onRetryCalculation || handleSubmit;

  // Keyboard trap and Escape listener for Confirmation Modal
  useEffect(() => {
    if (!isConfirmModalOpen) return;

    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        setIsConfirmModalOpen(false);
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConfirmModalOpen, submitting]);

  const handleOpenConfirm = () => {
    if (!submitting) {
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmSubmit = () => {
    setIsConfirmModalOpen(false);
    if (handleSubmit) {
      handleSubmit();
    }
  };

  // Helper to format response representation
  const formatAnswerDisplay = (q: QuestionDefinition) => {
    switch (q.code) {
      case "Q01":
        return answers.q01_override
          ? `${answers.q01_override} Queue Managers (Exact Override)`
          : answers.q01_scale || "Not answered";
      case "Q02":
        return answers.q02_override
          ? `${answers.q02_override} Staff (Exact Override)`
          : answers.q02_staffing || "Not answered";
      case "Q03":
        return answers.q03_staffing_model || "Not answered";
      case "Q04":
        return answers.q04_admin_hours !== undefined
          ? `${answers.q04_admin_hours} hours / quarter`
          : answers.q04_dropdown === "UNKNOWN"
          ? "Not sure / To be assessed"
          : answers.q04_dropdown || "Not answered";
      case "Q05":
        return answers.q05_tech_debt || "Not answered";
      case "Q06":
        return answers.q06_frequency || "Not answered";
      case "Q07":
        return answers.q07_override !== undefined
          ? `${answers.q07_override} hours / event (Exact Override)`
          : answers.q07_labor_hours || "Not answered";
      case "Q08":
        return answers.q08_duration || "Not answered";
      case "Q09":
        return answers.q09_tools_count || "Not answered";
      case "Q10":
        return answers.q10_manual_tracing || "Not answered";
      case "Q11":
        return answers.q11_productivity_constraint || "Not answered";
      case "Q12":
        return answers.q12_business_impact || "Not answered";
      case "Q13":
        return answers.q13_recent_disruptions || "Not answered";
      case "Q14":
        return answers.q14_disruption_duration || "Not answered";
      case "Q15":
        return answers.q15_is_unknown
          ? "Unknown / Not sure (Using Benchmark if eligible)"
          : answers.q15_hourly_cost_override !== undefined
          ? `$${answers.q15_hourly_cost_override.toLocaleString()} / hour`
          : "Not provided";
      case "Q16":
        return answers.q16_cost_mandate || "Not answered";
      case "Q17":
        return answers.q17_override !== undefined
          ? `${answers.q17_override}% (Exact Target)`
          : answers.q17_opex_reduction || "Not answered";
      case "Q18":
        return answers.q18_audit_effort || "Not answered";
      case "Q19":
        return answers.q19_documentation_effort || "Not answered";
      case "Q20":
        return answers.q20_use_default
          ? "$180,000 / year (Model Standard Default)"
          : answers.q20_annual_labor_rate !== undefined
          ? `$${answers.q20_annual_labor_rate.toLocaleString()} / year`
          : "$180,000 / year (Default)";
      case "Q21":
        return answers.q21_is_unknown
          ? "Unknown / Not Disclosed"
          : answers.q21_annual_mq_spend !== undefined
          ? `$${answers.q21_annual_mq_spend.toLocaleString()} / year`
          : "Not provided";
      case "Q22":
        return answers.q22_migration_plans || "Not answered";
      default:
        return "Not answered";
    }
  };

  // Calculate Readiness Metrics
  const totalQuestions = 22;
  let answeredCount = 0;
  let attentionCount = 0;
  let customerFactsCount = 0;

  Object.values(questionsMap).forEach((q) => {
    const ans = formatAnswerDisplay(q);
    const isUnanswered = ans === "Not answered" || ans === "Not provided";
    const isUnknown = ans.includes("Unknown") || ans.includes("Not sure");
    const isOverride = ans.includes("Exact") || ans.includes("Override") || ans.includes("Custom");

    if (!isUnanswered) {
      answeredCount++;
      if (isOverride) customerFactsCount++;
    }
    if (isUnanswered || isUnknown) {
      attentionCount++;
    }
  });

  const isAllAnswered = answeredCount === totalQuestions;
  const standardAnswersCount = answeredCount - customerFactsCount;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12" aria-busy={submitting}>
      {/* Accessible Submission In-Progress Status */}
      {submitting && (
        <div
          aria-live="polite"
          className="rounded-xl bg-[#EEF8F0] border border-[#A8E2B5] p-4 flex items-center space-x-3 text-xs font-semibold text-[#008638] shadow-xs"
        >
          <Loader2 className="h-4 w-4 animate-spin text-[#008638] shrink-0" aria-hidden="true" />
          <span>Submitting your assessment... Finalizing discovery responses.</span>
        </div>
      )}

      {/* Accessible Error Alert with Retry Action */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl bg-rose-50 border border-rose-200 p-4 sm:p-5 text-rose-900 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                  Submission Failed
                </div>
                <p className="text-xs font-medium text-rose-900 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              disabled={submitting}
              aria-label="Retry Submission"
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry Submission</span>
            </button>
          </div>
        </div>
      )}

      {/* Review Header Hero Card */}
      <div className="rounded-2xl bg-[#0D1322] border border-[#1E293B] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 rounded-full bg-[#38B449]/20 px-3 py-1 text-xs font-bold text-[#8CC63E] border border-[#38B449]/40">
                <Sparkles className="h-3.5 w-3.5 text-[#38B449]" />
                <span>Pre-Submission Review</span>
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-bold border ${
                  isAllAnswered
                    ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]"
                    : "bg-[#1E293B] text-slate-300 border-slate-700"
                }`}
              >
                {isAllAnswered ? "100% Intake Complete" : `${answeredCount} of ${totalQuestions} Answered`}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Review &amp; Submit Assessment
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Review your discovery responses below. Once submitted, your answers will be finalized for advisory opportunity analysis.
            </p>

            {/* High-Level Summary Note */}
            {!isAllAnswered && (
              <div className="pt-2 text-xs text-slate-300 bg-[#172033]/80 px-3 py-2 rounded-lg border border-[#1E293B] max-w-xl">
                <span>Any uncompleted items will automatically use the application&apos;s standard baseline assumptions.</span>
              </div>
            )}
          </div>

          {/* Dominant Primary CTA */}
          <div className="flex flex-col items-stretch lg:items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={submitting}
              aria-label="Submit Assessment"
              className="inline-flex items-center justify-center space-x-2.5 rounded-xl bg-[#008638] px-7 py-4 text-sm font-extrabold text-white shadow-lg hover:bg-[#006B2D] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#008638] focus:ring-offset-2 focus:ring-offset-[#0D1322] transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <FileCheck className="h-4 w-4" />
              <span>{submitting ? "Submitting Assessment..." : "Submit Assessment"}</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center lg:text-right">
              Finalizes your discovery responses
            </p>
          </div>
        </div>
      </div>

      {/* Sections Review Cards */}
      <div className="space-y-6">
        {sections.map((section) => {
          const answeredQuestions = section.questionIds
            .map((qId) => questionsMap[qId])
            .filter((q): q is QuestionDefinition => {
              if (!q) return false;
              const ans = formatAnswerDisplay(q);
              return ans !== "Not answered" && ans !== "Not provided";
            });

          return (
            <div
              key={section.id}
              className="rounded-xl border border-[#E2E6EE] bg-white p-5 sm:p-6 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-[#E2E6EE] pb-3 mb-3">
                <div>
                  <span className="text-xs font-bold text-[#008638] uppercase tracking-wider">
                    Section {section.id}
                  </span>
                  <h3 className="text-base font-bold text-[#172033]">
                    {section.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onEditSection(section.id)}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#172033] hover:text-[#008638] transition-colors duration-150 px-3 py-1.5 rounded-lg border border-[#CBD2DE] hover:border-[#38B449] hover:bg-[#EEF8F0]/40 bg-white shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638]"
                >
                  <Edit3 className="h-3.5 w-3.5 text-[#008638]" />
                  <span>Edit Section</span>
                </button>
              </div>

              {/* Questions in Section (Answered Only) */}
              {answeredQuestions.length > 0 ? (
                <div className="divide-y divide-[#E2E6EE]">
                  {answeredQuestions.map((q) => {
                    const answerText = formatAnswerDisplay(q);
                    const isUnknown = answerText.includes("Not sure") || answerText.includes("Unknown");
                    const isExactOverride = answerText.includes("Exact Override") || answerText.includes("Exact Target");

                    return (
                      <div key={q.id} className="py-3 sm:grid sm:grid-cols-12 sm:gap-4 items-center">
                        {/* Column 1: Question Identifier and Title (5 cols) */}
                        <div className="sm:col-span-5 flex items-center space-x-2.5">
                          <span className="font-mono text-xs font-bold text-[#172033] bg-[#F1F3F7] px-2 py-0.5 rounded border border-[#E2E6EE] shrink-0">
                            {q.code}
                          </span>
                          <span className="text-xs font-bold text-[#172033]">
                            {q.title}
                          </span>
                        </div>

                        {/* Column 2: Formatted Answer Representation (5 cols) */}
                        <div className="sm:col-span-5 mt-1 sm:mt-0 text-xs">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`font-semibold ${
                                isUnknown
                                  ? "text-amber-800 font-semibold"
                                  : "text-[#172033]"
                              }`}
                            >
                              {answerText}
                            </span>
                          </div>
                        </div>

                        {/* Column 3: Badges & Status (2 cols) */}
                        <div className="sm:col-span-2 mt-2 sm:mt-0 flex items-center justify-end space-x-1.5 shrink-0">
                          {isExactOverride ? (
                            <span className="inline-flex items-center text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              Custom Input
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium text-[#008638] bg-[#EEF8F0] px-2 py-0.5 rounded border border-[#A8E2B5]">
                              Recorded
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-3 text-xs text-[#738096] italic">
                  No items answered in this section yet (standard baseline assumptions will apply).
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Submit Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E2E6EE]">
        <div className="text-xs text-[#667085]">
          <span className="font-bold text-[#172033]">{answeredCount} of {totalQuestions}</span> questions reviewed and ready for final submission.
        </div>
        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={submitting}
          aria-label="Submit Assessment"
          className="inline-flex items-center space-x-2 rounded-lg bg-[#008638] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#006B2D] focus:outline-none focus:ring-2 focus:ring-[#008638] focus:ring-offset-2 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <span>{submitting ? "Submitting..." : "Submit Assessment"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Submission Confirmation Modal */}
      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submission-title"
          aria-describedby="confirm-submission-desc"
          ref={modalRef}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E6EE] space-y-5">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-[#EEF8F0] rounded-xl text-[#008638] border border-[#A8E2B5] shrink-0">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 id="confirm-submission-title" className="text-base font-bold text-[#172033]">
                  Confirm Assessment Submission
                </h3>
                <p id="confirm-submission-desc" className="text-xs text-[#667085] leading-relaxed">
                  Please confirm that you have reviewed all 22 responses. Once submitted, your assessment responses will be finalized and cannot be edited without an authorized reopening process.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F7F8FA] rounded-xl border border-[#E2E6EE] text-xs text-[#475467] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#667085]">Questions Answered:</span>
                <span className="font-bold text-[#172033]">{answeredCount} of {totalQuestions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#667085]">Submission Readiness:</span>
                <span className="font-semibold text-[#008638]">
                  {isAllAnswered ? "100% Intake Complete" : `${answeredCount} of 22 Questions Complete`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                ref={cancelBtnRef}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#475467] hover:bg-[#F1F3F7] rounded-lg transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1"
                aria-label="Go back and continue reviewing responses"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-[#008638] hover:bg-[#006B2D] rounded-lg transition-colors duration-150 shadow-xs cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1"
                aria-label="Confirm & Submit"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

