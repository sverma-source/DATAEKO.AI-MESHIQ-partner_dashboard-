"use client";

import React from "react";
import {
  CheckCircle2,
  FileCheck2,
  Lock,
  Building2,
  Calendar,
  Hash,
  ShieldCheck,
} from "lucide-react";
import {
  Assessment,
  AssessmentResponseState,
  Customer,
  QuestionDefinition,
  SectionDefinition,
} from "../types/assessment";

interface SubmittedResponsesViewProps {
  assessment: Assessment;
  customer?: Customer | null;
  sections: SectionDefinition[];
  questionsMap: Record<string, QuestionDefinition>;
  answers: AssessmentResponseState;
}

export const SubmittedResponsesView: React.FC<SubmittedResponsesViewProps> = ({
  assessment,
  customer,
  sections,
  questionsMap,
  answers,
}) => {
  // Format Response Value for Question
  const formatAnswerDisplay = (q: QuestionDefinition) => {
    switch (q.id) {
      case "Q01":
        return answers.q01_override !== undefined
          ? `${answers.q01_override} QMs (Exact Override)`
          : answers.q01_scale || "Not answered";
      case "Q02":
        return answers.q02_override !== undefined
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
          ? `${answers.q07_override} hours (Exact override)`
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

  const formattedDate = assessment.updated_at
    ? new Date(assessment.updated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently submitted";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16" data-testid="submitted-responses-view">
      {/* Submitted Status Hero Banner */}
      <div className="rounded-2xl border border-[#A8E2B5] bg-gradient-to-br from-[#F4FBF6] via-white to-[#EEF8F0] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#E1F5E6] border border-[#A8E2B5] text-[#008638] text-xs font-bold tracking-wide">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ASSESSMENT SUBMITTED & FINALIZED</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#172033]">
                Assessment Submitted
              </h1>
              <p className="mt-1.5 text-sm text-[#5B6579] max-w-2xl leading-relaxed">
                Your submitted responses are shown below. These discovery responses have been formally finalized and can no longer be edited.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-semibold text-[#5B6579] bg-white border border-[#E2E6EE] rounded-xl px-4 py-3 shadow-2xs self-start md:self-auto">
            <Lock className="h-4 w-4 text-[#008638] shrink-0" aria-hidden="true" />
            <span>Read-Only Record</span>
          </div>
        </div>

        {/* Submission Context Metadata Cards */}
        <div className="mt-6 pt-6 border-t border-[#E2E6EE] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/80 border border-[#E2E6EE]">
            <div className="w-8 h-8 rounded-lg bg-[#F0F2F6] flex items-center justify-center text-[#5B6579] shrink-0">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#738096]">
                Customer
              </div>
              <div className="text-xs font-bold text-[#172033] truncate">
                {customer?.name || "Enterprise Customer"}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/80 border border-[#E2E6EE]">
            <div className="w-8 h-8 rounded-lg bg-[#F0F2F6] flex items-center justify-center text-[#5B6579] shrink-0">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#738096]">
                Submission Date
              </div>
              <div className="text-xs font-bold text-[#172033] truncate">
                {formattedDate}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/80 border border-[#E2E6EE]">
            <div className="w-8 h-8 rounded-lg bg-[#F0F2F6] flex items-center justify-center text-[#5B6579] shrink-0">
              <Hash className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#738096]">
                Assessment Record
              </div>
              <div className="text-xs font-bold text-[#172033] truncate font-mono">
                {assessment.title || "Discovery Intake"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Discovery Responses by Canonical 7 Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const sectionQuestions = (section.questionIds || []).map((qId) => questionsMap[qId]).filter(Boolean);

          return (
            <div
              key={section.id}
              className="rounded-2xl border border-[#E2E6EE] bg-white overflow-hidden shadow-xs transition-shadow duration-200"
            >
              {/* Section Header */}
              <div className="px-6 py-4 bg-[#F7F8FA] border-b border-[#E2E6EE] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-md bg-[#E2E6EE] text-[#172033] font-bold text-xs flex items-center justify-center">
                    {section.id}
                  </span>
                  <h2 className="text-sm font-bold text-[#172033] tracking-tight">
                    {section.title}
                  </h2>
                </div>
                <span className="text-xs font-medium text-[#738096]">
                  {sectionQuestions.length} Questions
                </span>
              </div>

              {/* Questions List */}
              <div className="divide-y divide-[#E2E6EE]">
                {sectionQuestions.map((q) => {
                  const displayValue = formatAnswerDisplay(q);
                  const isNotAnswered = displayValue === "Not answered" || displayValue === "Not provided";

                  return (
                    <div
                      key={q.id}
                      className="p-5 sm:p-6 hover:bg-[#FAFBFD] transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-[#F0F2F6] text-[#5B6579] font-mono text-[11px] font-semibold border border-[#E2E6EE]">
                              {q.id}
                            </span>
                            <span className="text-xs font-bold text-[#172033]">
                              {q.title}
                            </span>
                          </div>
                          <p className="text-xs text-[#5B6579] leading-relaxed">
                            {q.questionText}
                          </p>
                        </div>

                        {/* Finalized Answer Display */}
                        <div className="sm:text-right shrink-0 mt-2 sm:mt-0">
                          <div
                            className={`inline-block px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                              isNotAnswered
                                ? "bg-[#F0F2F6] text-[#738096] border border-[#E2E6EE]"
                                : "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                            }`}
                          >
                            {displayValue}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Read-Only Notice Footer */}
      <div className="rounded-xl border border-[#E2E6EE] bg-white p-5 text-center text-xs text-[#738096] shadow-2xs">
        <p className="font-medium text-[#5B6579]">
          Discovery responses have been recorded and locked for enterprise assessment processing.
        </p>
      </div>
    </div>
  );
};
