"use client";

import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  HelpCircle,
  Play,
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
  onSubmitCalculation: () => void;
  isCalculating: boolean;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  sections,
  questionsMap,
  answers,
  onEditSection,
  onSubmitCalculation,
  isCalculating,
}) => {
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Review Header Card */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <span className="inline-flex items-center space-x-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Assessment Discovery Review</span>
            </span>
            <h2 className="text-2xl font-bold tracking-tight mt-2 text-white sm:text-3xl">
              Ready for Engine Calculation
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Review all 22 intake responses below. Submitting will execute the pure deterministic calculation engine and generate an immutable snapshot.
            </p>
          </div>

          <button
            type="button"
            onClick={onSubmitCalculation}
            disabled={isCalculating}
            className="inline-flex items-center justify-center space-x-2 rounded-xl bg-blue-500 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>{isCalculating ? "Executing Engine..." : "Submit for Calculation"}</span>
          </button>
        </div>
      </div>

      {/* Sections Review Cards */}
      <div className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Section {section.id}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {section.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onEditSection(section.id)}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors px-2.5 py-1 rounded-md border border-slate-200 hover:border-blue-300 bg-slate-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Section</span>
              </button>
            </div>

            {/* Questions in Section */}
            <div className="divide-y divide-slate-100">
              {section.questionIds.map((qId) => {
                const q = questionsMap[qId];
                if (!q) return null;
                const answerText = formatAnswerDisplay(q);
                const isUnanswered = answerText === "Not answered" || answerText === "Not provided";
                const isUnknown = answerText.includes("Not sure") || answerText.includes("Unknown");

                return (
                  <div key={q.id} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
                    <dt className="text-xs font-semibold text-slate-700 flex items-center space-x-2">
                      <span className="font-mono text-slate-400">{q.code}:</span>
                      <span>{q.title}</span>
                    </dt>
                    <dd className="mt-1 sm:mt-0 sm:col-span-2 text-xs flex items-center justify-between">
                      <span
                        className={`font-medium ${
                          isUnanswered
                            ? "text-slate-400 italic"
                            : isUnknown
                            ? "text-amber-700 font-semibold"
                            : "text-slate-900"
                        }`}
                      >
                        {answerText}
                      </span>
                      {q.feedsCalculation && (
                        <span className="ml-2 inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                          Engine Input
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Submit Bar */}
      <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onSubmitCalculation}
          disabled={isCalculating}
          className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50"
        >
          <span>{isCalculating ? "Calculating Snapshot..." : "Calculate Assessment"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
