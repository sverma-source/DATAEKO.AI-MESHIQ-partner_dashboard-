"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck,
  FolderOpen,
  Plus,
  Save,
  Sparkles,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { WizardHeader } from "../components/WizardHeader";
import { SectionNavigation } from "../components/SectionNavigation";
import { QuestionCard } from "../components/QuestionCard";
import { ReviewSummary } from "../components/ReviewSummary";
import { CalculationStatusView } from "../components/CalculationStatusView";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { CustomerModal } from "../components/CustomerModal";
import { QUESTIONS, SECTIONS } from "../data/questionCatalog";
import { api } from "../services/api";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import {
  Assessment,
  AssessmentResponseState,
  CalculationRunResponse,
  Customer,
} from "../types/assessment";

export default function AssessmentWizardPage() {
  const { user, hasPermission } = useAuth();
  // Session / Entity State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);

  // Wizard Navigation State
  const [currentSectionId, setCurrentSectionId] = useState<string>("A"); // "A".."G" or "REVIEW" or "CALCULATED"

  // Response State (Q01–Q22)
  const [answers, setAnswers] = useState<AssessmentResponseState>({
    q20_use_default: true,
  });

  // Save / Calculation State
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<CalculationRunResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch initial customer list on mount
  useEffect(() => {
    api.listCustomers()
      .then((data) => {
        setCustomers(data);
        if (data.length > 0 && !currentCustomer) {
          // Preselect first customer
          setCurrentCustomer(data[0]);
        }
      })
      .catch(() => {
        // Fallback for offline or fresh DB
      });
  }, []);

  // Calculate overall answered count
  const getAnsweredCount = useCallback(() => {
    let count = 0;
    Object.keys(QUESTIONS).forEach((qCode) => {
      const prefix = qCode.toLowerCase();
      const hasAnswer = Object.entries(answers).some(([k, v]) => {
        return k.startsWith(prefix) && v !== undefined && v !== null && v !== "";
      });
      if (hasAnswer) count++;
    });
    return count;
  }, [answers]);

  // Handle Response Update
  const updateAnswerField = (field: keyof AssessmentResponseState, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveStatus("unsaved");
  };

  // Save Responses to Backend
  const handleSaveProgress = async () => {
    if (!currentAssessment) {
      // Auto-create assessment if not exists
      if (!currentCustomer) {
        setIsCustomerModalOpen(true);
        return;
      }
      try {
        setIsSaving(true);
        setSaveStatus("saving");
        const ass = await api.createAssessment({
          customer_id: currentCustomer.id,
          title: "IBM MQ Economic Assessment",
        });
        setCurrentAssessment(ass);
        await api.saveResponses(ass.id, answers);
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus("saving");
      await api.saveResponses(currentAssessment.id, answers);
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  // Section Navigation Handlers
  const currentSectionIndex = SECTIONS.findIndex((s) => s.id === currentSectionId);
  const currentSection = SECTIONS[currentSectionIndex] || SECTIONS[0];

  const handleNextSection = () => {
    if (currentSectionIndex < SECTIONS.length - 1) {
      const nextSec = SECTIONS[currentSectionIndex + 1];
      setCurrentSectionId(nextSec.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setCurrentSectionId("REVIEW");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevSection = () => {
    if (currentSectionId === "REVIEW") {
      setCurrentSectionId(SECTIONS[SECTIONS.length - 1].id);
    } else if (currentSectionIndex > 0) {
      const prevSec = SECTIONS[currentSectionIndex - 1];
      setCurrentSectionId(prevSec.id);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Execute Calculation Engine
  const handleSubmitCalculation = async () => {
    setIsCalculating(true);
    try {
      // Ensure assessment exists
      let assessmentId = currentAssessment?.id;
      if (!assessmentId) {
        let custId = currentCustomer?.id;
        if (!custId) {
          const cust = await api.createCustomer({
            name: "Assessment Client",
            industry: "Financial Services",
          });
          setCurrentCustomer(cust);
          custId = cust.id;
        }
        const ass = await api.createAssessment({
          customer_id: custId,
          title: "Assessment Intake Session",
        });
        setCurrentAssessment(ass);
        assessmentId = ass.id;
      }

      // 1. Save responses
      await api.saveResponses(assessmentId, answers);

      // 2. Execute calculation engine
      const calcRes = await api.calculateAssessment(assessmentId);
      setCalculationResult(calcRes);
      setCurrentSectionId("CALCULATED");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      alert(`Calculation error: ${err.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  // Customer / Assessment Setup
  const handleSelectCustomerAndAssessment = async (customerId: string, title: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) setCurrentCustomer(cust);

    const ass = await api.createAssessment({
      customer_id: customerId,
      title: title,
    });
    setCurrentAssessment(ass);
    setCurrentSectionId("A");
  };

  const handleCreateCustomer = async (data: { name: string; industry: string; primary_contact_email?: string }) => {
    const cust = await api.createCustomer(data);
    setCustomers((prev) => [cust, ...prev]);
    setCurrentCustomer(cust);
    return cust;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
        {/* Top Navigation */}
        <Navbar
          customerName={currentCustomer?.name}
          assessmentTitle={currentAssessment?.title}
        />

      {/* Main Wizard Header */}
      {currentSectionId !== "CALCULATED" && (
        <>
          <WizardHeader
            currentSection={currentSection}
            currentSectionIndex={currentSectionIndex + 1}
            totalSections={SECTIONS.length}
            answeredCount={getAnsweredCount()}
            totalQuestions={22}
            saveStatus={saveStatus}
            onSave={handleSaveProgress}
            isSaving={isSaving}
          />

          {/* Section Step Switcher */}
          <SectionNavigation
            sections={SECTIONS}
            currentSectionId={currentSectionId}
            onSelectSection={(secId) => {
              setCurrentSectionId(secId);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            answers={answers}
            questionsMap={QUESTIONS}
          />
        </>
      )}

      {/* Wizard Content Body */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* State A: Section Questions Form (Sections A through G) */}
        {currentSectionId !== "REVIEW" && currentSectionId !== "CALCULATED" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Session Actions Banner */}
            {!currentAssessment && (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4 border border-blue-200/80 text-xs">
                <div className="flex items-center space-x-2 text-blue-900">
                  <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    Working in draft mode. Click{" "}
                    <strong>Select/Create Customer</strong> to link this session to a verified enterprise account.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shrink-0"
                >
                  Select Customer
                </button>
              </div>
            )}

            {/* Render Questions for Current Section */}
            <div className="space-y-6">
              {currentSection.questionIds.map((qId) => {
                const q = QUESTIONS[qId];
                if (!q) return null;

                // Map state to question component props
                const qCode = q.code.toLowerCase();
                let selectedVal = (answers as any)[`${qCode}_frequency`] ||
                  (answers as any)[`${qCode}_labor_hours`] ||
                  (answers as any)[`${qCode}_duration`] ||
                  (answers as any)[`${qCode}_tools_count`] ||
                  (answers as any)[`${qCode}_manual_tracing`] ||
                  (answers as any)[`${qCode}_productivity_constraint`] ||
                  (answers as any)[`${qCode}_business_impact`] ||
                  (answers as any)[`${qCode}_recent_disruptions`] ||
                  (answers as any)[`${qCode}_disruption_duration`] ||
                  (answers as any)[`${qCode}_cost_mandate`] ||
                  (answers as any)[`${qCode}_opex_reduction`] ||
                  (answers as any)[`${qCode}_audit_effort`] ||
                  (answers as any)[`${qCode}_documentation_effort`] ||
                  (answers as any)[`${qCode}_migration_plans`] ||
                  (answers as any)[`${qCode}_scale`] ||
                  (answers as any)[`${qCode}_staffing`] ||
                  (answers as any)[`${qCode}_staffing_model`] ||
                  (answers as any)[`${qCode}_tech_debt`] ||
                  (answers as any)[`${qCode}_dropdown`];

                if (q.code === "Q15") {
                  selectedVal = answers.q15_is_unknown
                    ? "UNKNOWN"
                    : answers.q15_hourly_cost_override !== undefined
                    ? "OVERRIDE"
                    : "";
                } else if (q.code === "Q20") {
                  selectedVal = answers.q20_use_default ? "DEFAULT" : "OVERRIDE";
                } else if (q.code === "Q21") {
                  selectedVal = answers.q21_is_unknown
                    ? "UNKNOWN"
                    : answers.q21_annual_mq_spend !== undefined
                    ? "OVERRIDE"
                    : "";
                }

                const overrideVal = (answers as any)[`${qCode}_override`] !== undefined
                  ? (answers as any)[`${qCode}_override`]
                  : (answers as any)[`${qCode}_admin_hours`] !== undefined
                  ? (answers as any)[`${qCode}_admin_hours`]
                  : (answers as any)[`${qCode}_hourly_cost_override`] !== undefined
                  ? (answers as any)[`${qCode}_hourly_cost_override`]
                  : (answers as any)[`${qCode}_annual_labor_rate`] !== undefined
                  ? (answers as any)[`${qCode}_annual_labor_rate`]
                  : (answers as any)[`${qCode}_annual_mq_spend`];

                return (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    selectedValue={selectedVal}
                    overrideValue={overrideVal}
                    useDefault={answers.q20_use_default}
                    isUnknown={(answers as any)[`${qCode}_is_unknown`]}
                    onSelectOption={(val) => {
                      if (q.code === "Q01") updateAnswerField("q01_scale", val);
                      else if (q.code === "Q02") updateAnswerField("q02_staffing", val);
                      else if (q.code === "Q03") updateAnswerField("q03_staffing_model", val);
                      else if (q.code === "Q04") updateAnswerField("q04_dropdown", val);
                      else if (q.code === "Q05") updateAnswerField("q05_tech_debt", val);
                      else if (q.code === "Q06") updateAnswerField("q06_frequency", val);
                      else if (q.code === "Q07") updateAnswerField("q07_labor_hours", val);
                      else if (q.code === "Q08") updateAnswerField("q08_duration", val);
                      else if (q.code === "Q09") updateAnswerField("q09_tools_count", val);
                      else if (q.code === "Q10") updateAnswerField("q10_manual_tracing", val);
                      else if (q.code === "Q11") updateAnswerField("q11_productivity_constraint", val);
                      else if (q.code === "Q12") updateAnswerField("q12_business_impact", val);
                      else if (q.code === "Q13") updateAnswerField("q13_recent_disruptions", val);
                      else if (q.code === "Q14") updateAnswerField("q14_disruption_duration", val);
                      else if (q.code === "Q15") {
                        if (val === "UNKNOWN") updateAnswerField("q15_is_unknown", true);
                        else updateAnswerField("q15_is_unknown", false);
                      } else if (q.code === "Q16") updateAnswerField("q16_cost_mandate", val);
                      else if (q.code === "Q17") updateAnswerField("q17_opex_reduction", val);
                      else if (q.code === "Q18") updateAnswerField("q18_audit_effort", val);
                      else if (q.code === "Q19") updateAnswerField("q19_documentation_effort", val);
                      else if (q.code === "Q20") {
                        if (val === "DEFAULT") updateAnswerField("q20_use_default", true);
                        else updateAnswerField("q20_use_default", false);
                      } else if (q.code === "Q21") {
                        if (val === "UNKNOWN") updateAnswerField("q21_is_unknown", true);
                        else updateAnswerField("q21_is_unknown", false);
                      } else if (q.code === "Q22") updateAnswerField("q22_migration_plans", val);
                    }}
                    onOverrideChange={(num) => {
                      if (q.code === "Q01") updateAnswerField("q01_override", num);
                      else if (q.code === "Q02") updateAnswerField("q02_override", num);
                      else if (q.code === "Q04") updateAnswerField("q04_admin_hours", num);
                      else if (q.code === "Q07") updateAnswerField("q07_override", num);
                      else if (q.code === "Q15") updateAnswerField("q15_hourly_cost_override", num);
                      else if (q.code === "Q17") updateAnswerField("q17_override", num);
                      else if (q.code === "Q20") updateAnswerField("q20_annual_labor_rate", num);
                      else if (q.code === "Q21") updateAnswerField("q21_annual_mq_spend", num);
                    }}
                    onDefaultToggle={(def) => updateAnswerField("q20_use_default", def)}
                    error={validationErrors[q.code]}
                  />
                );
              })}
            </div>

            {/* Bottom Section Step Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={currentSectionIndex === 0}
                className="inline-flex items-center space-x-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous Section</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  className="hidden sm:inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5 text-slate-500" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextSection}
                  className="inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <span>
                    {currentSectionIndex === SECTIONS.length - 1
                      ? "Proceed to Review"
                      : `Next: Section ${SECTIONS[currentSectionIndex + 1]?.id}`}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State B: Review & Submit Step */}
        {currentSectionId === "REVIEW" && (
          <ReviewSummary
            sections={SECTIONS}
            questionsMap={QUESTIONS}
            answers={answers}
            onEditSection={(secId) => {
              setCurrentSectionId(secId);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSubmitCalculation={handleSubmitCalculation}
            isCalculating={isCalculating}
          />
        )}

        {/* State C: Executive KPI Dashboard & Calculation Result View */}
        {currentSectionId === "CALCULATED" && calculationResult && (
          <ExecutiveDashboard
            calculation={calculationResult}
            customer={currentCustomer}
            assessment={currentAssessment}
            answers={answers}
            onReturnToWizard={() => {
              setCurrentSectionId("REVIEW");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </main>

      {/* Customer / Assessment Initialization Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={customers}
        onSelectCustomerAndAssessment={handleSelectCustomerAndAssessment}
        onCreateCustomer={handleCreateCustomer}
      />
    </div>
    </ProtectedRoute>
  );
}
