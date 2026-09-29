"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  AlertTriangle,
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
import { SubmittedResponsesView } from "../components/SubmittedResponsesView";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { ConsultantWorkspace } from "../components/ConsultantWorkspace";
import { AdminWorkspace } from "../components/AdminWorkspace";
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
  const [pendingCustomerSwitch, setPendingCustomerSwitch] = useState<{
    customerId: string;
    title: string;
    targetCustomerName: string;
  } | null>(null);

  // Wizard Navigation State
  const [currentSectionId, setCurrentSectionId] = useState<string>("A"); // "A".."G" or "REVIEW" or "CALCULATED"

  // Response State (Q01–Q22)
  const [answers, setAnswers] = useState<AssessmentResponseState>({
    q20_use_default: true,
  });

  // Save / Calculation State
  const [saveStatus, setSaveStatus] = useState<"initialized" | "saved" | "saving" | "unsaved" | "error">("initialized");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<CalculationRunResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState<boolean>(false);

  // Load assessment by ID from backend persistence
  const loadAssessmentById = useCallback(async (id: string) => {
    try {
      setIsLoadingAssessment(true);
      setResumeError(null);
      const ass = await api.getAssessment(id);
      setCurrentAssessment(ass);
      if (ass.customer) {
        setCurrentCustomer(ass.customer);
      }
      if (ass.response?.raw_responses) {
        setAnswers(ass.response.raw_responses);
      } else if (ass.response) {
        const mapped: AssessmentResponseState = {
          q01_scale: ass.response.q03_environment_scale,
          q03_staffing_model: ass.response.q05_mq_role_split,
          q04_admin_hours: ass.response.q04_weekly_admin_hours,
          q06_frequency: ass.response.q06_frequency_text,
          q07_labor_hours: ass.response.q07_labor_hours_text,
          q07_override: ass.response.q07_labor_hours_override,
          q08_duration: ass.response.q08_duration_text,
          q09_tools_count: ass.response.q09_root_cause_categories,
          q10_manual_tracing: ass.response.q10_problem_types,
          q11_productivity_constraint: ass.response.q11_monitoring_status,
          q12_business_impact: ass.response.q12_business_impact,
          q14_disruption_duration: ass.response.q14_duration_text,
          q15_hourly_cost_override: ass.response.q15_hourly_cost_override,
          q16_cost_mandate: ass.response.q16_config_management_method,
          q18_audit_effort: ass.response.q18_audit_effort,
          q19_documentation_effort: ass.response.q19_documentation_effort,
          q20_annual_labor_rate: ass.response.q20_annual_labor_rate,
          q20_use_default: ass.response.q20_annual_labor_rate === null || ass.response.q20_annual_labor_rate === undefined,
          q21_annual_mq_spend: ass.response.q21_annual_mq_spend,
          q22_migration_plans: ass.response.q22_migration_plans,
        };
        setAnswers(mapped);
      }
      if (ass.status === "SUBMITTED") {
        setCurrentSectionId("SUBMITTED");
      }
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("assessment_id", id);
        window.history.replaceState({}, "", url.toString());
      }
      setSaveStatus("saved");
    } catch (err: any) {
      setResumeError(err.message || "Failed to load assessment. Cross-tenant access denied or assessment not found.");
      setCurrentAssessment(null);
    } finally {
      setIsLoadingAssessment(false);
    }
  }, []);

  // Check URL query parameters for assessment_id on mount or load client's own assessment
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlAssessmentId = params.get("assessment_id");
      if (urlAssessmentId) {
        loadAssessmentById(urlAssessmentId);
      } else if (user?.role === "CUSTOMER_USER" && typeof api.listAssessments === "function") {
        api.listAssessments()
          .then((assList) => {
            if (assList && assList.length > 0) {
              loadAssessmentById(assList[0].id);
            }
          })
          .catch(() => {});
      }
    }
  }, [loadAssessmentById, user]);

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
    let targetAssessment = currentAssessment;
    if (!targetAssessment) {
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
          title: `${currentCustomer.name} - IBM MQ Economic Assessment`,
        });
        targetAssessment = ass;
        setCurrentAssessment(ass);
      } catch (err) {
        setSaveStatus("error");
        setIsSaving(false);
        return;
      }
    }

    try {
      setIsSaving(true);
      setSaveStatus("saving");
      await api.saveResponses(targetAssessment.id, answers);
      setSaveStatus("saved");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("assessment_id", targetAssessment.id);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (err) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Assessment Contract (Batch A: Persists responses; Batch B connects to backend submission)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const handleSubmitAssessment = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      let targetAssessment = currentAssessment;
      if (!targetAssessment) {
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
        targetAssessment = ass;
        setCurrentAssessment(ass);
      }

      await api.saveResponses(targetAssessment.id, answers);
      const finalizedAssessment = await api.submitAssessment(targetAssessment.id);
      setCurrentAssessment(finalizedAssessment);
      setCurrentSectionId("SUBMITTED");
      setSaveStatus("saved");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("assessment_id", targetAssessment.id);
        window.history.replaceState({}, "", url.toString());
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setSubmissionError(err.message || "Failed to submit assessment.");
    } finally {
      setIsSubmitting(false);
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

  // Execute Calculation Engine (Preserved for Consultant / Engine Workflows)
  const handleSubmitCalculation = async () => {
    setIsCalculating(true);
    setCalculationError(null);
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
      setCalculationError(err.message || "Failed to execute calculation engine.");
    } finally {
      setIsCalculating(false);
    }
  };

  // Close confirmation modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pendingCustomerSwitch) {
        setPendingCustomerSwitch(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingCustomerSwitch]);

  // Customer / Assessment Setup
  const handleSelectCustomerAndAssessment = async (customerId: string, title: string) => {
    const targetCust = customers.find((c) => c.id === customerId);
    const targetCustomerName = targetCust?.name || "Selected Customer";

    // Business Rule: If an active assessment already exists, require explicit confirmation
    // before switching customer context to prevent responses from carrying over.
    if (currentAssessment !== null) {
      setPendingCustomerSwitch({
        customerId,
        title,
        targetCustomerName,
      });
      return;
    }

    // Anonymous Draft flow: Link current draft responses to the newly selected/created customer
    if (targetCust) setCurrentCustomer(targetCust);

    const ass = await api.createAssessment({
      customer_id: customerId,
      title: title,
    });
    setCurrentAssessment(ass);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("assessment_id", ass.id);
      window.history.replaceState({}, "", url.toString());
    }
    setCurrentSectionId("A");
    setSaveStatus("initialized");
  };

  const handleConfirmCustomerSwitch = async () => {
    if (!pendingCustomerSwitch) return;
    const { customerId, title } = pendingCustomerSwitch;

    // 1. Reset in-memory response state to initial baseline
    setAnswers({
      q20_use_default: true,
    });

    // 2. Reset session status indicators
    setSaveStatus("initialized");
    setCalculationResult(null);
    setValidationErrors({});
    setResumeError(null);

    // 3. Bind new customer and create fresh assessment
    const targetCust = customers.find((c) => c.id === customerId);
    if (targetCust) setCurrentCustomer(targetCust);

    const ass = await api.createAssessment({
      customer_id: customerId,
      title: title,
    });
    setCurrentAssessment(ass);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("assessment_id", ass.id);
      window.history.replaceState({}, "", url.toString());
    }
    setCurrentSectionId("A");
    setPendingCustomerSwitch(null);
  };

  const handleCreateCustomer = async (data: { name: string; industry: string; primary_contact_email?: string }) => {
    const cust = await api.createCustomer(data);
    setCustomers((prev) => [cust, ...prev]);
    setCurrentCustomer(cust);
    return cust;
  };

  const isConsultant = user?.role === "CONSULTANT";
  const isAdmin = user?.role === "PLATFORM_ADMIN" || user?.role === "PARTNER_ADMIN" || user?.role === "CUSTOMER_ADMIN";

  if (isConsultant) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans antialiased text-[#172033]">
          <Navbar />
          <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            <ConsultantWorkspace />
          </main>
          <footer className="py-5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#E2E6EE] flex flex-col sm:flex-row items-center justify-between text-xs text-[#667085] gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <span>meshIQ Enterprise Economic Cost &amp; Efficiency Assessment</span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-medium text-[#667085] tracking-tight">
              <span className="text-[11px] uppercase tracking-wider text-[#8A94A6]">Powered by</span>
              <Image
                src="/dataeko-logo.png"
                alt="DATAEKO.AI"
                width={638}
                height={106}
                unoptimized
                className="h-5 sm:h-6 w-auto object-contain shrink-0"
              />
            </div>
          </footer>
        </div>
      </ProtectedRoute>
    );
  }

  if (isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans antialiased text-[#172033]">
          <Navbar />
          <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            <AdminWorkspace />
          </main>
          <footer className="py-5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#E2E6EE] flex flex-col sm:flex-row items-center justify-between text-xs text-[#667085] gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <span>meshIQ Enterprise Economic Cost &amp; Efficiency Assessment</span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-medium text-[#667085] tracking-tight">
              <span className="text-[11px] uppercase tracking-wider text-[#8A94A6]">Powered by</span>
              <Image
                src="/dataeko-logo.png"
                alt="DATAEKO.AI"
                width={638}
                height={106}
                unoptimized
                className="h-5 sm:h-6 w-auto object-contain shrink-0"
              />
            </div>
          </footer>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans antialiased text-[#172033]">
        {/* Top Navigation */}
        <Navbar
          customerName={currentCustomer?.name}
          assessmentTitle={currentAssessment?.title}
        />

      {/* Main Wizard Header */}
      {currentSectionId !== "CALCULATED" && currentSectionId !== "SUBMITTED" && (
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
        {/* Error Banner for Cross-Tenant / Failed Resume */}
        {resumeError && (
          <div data-testid="resume-error-banner" className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-800 flex items-center justify-between">
            <span className="font-medium">{resumeError}</span>
            <button
              onClick={() => setResumeError(null)}
              className="text-xs text-red-600 font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Persisted Assessment Identifier */}
        {currentAssessment && (
          <div data-testid="active-assessment-id" className="hidden">
            {currentAssessment.id}
          </div>
        )}

        {/* State A: Section Questions Form (Sections A through G) */}
        {currentSectionId !== "REVIEW" && currentSectionId !== "CALCULATED" && currentSectionId !== "SUBMITTED" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Session Actions Banner */}
            {!currentAssessment ? (
              <div className="flex items-center justify-between rounded-xl bg-[#EEF8F0] p-4 border border-[#A8E2B5] text-xs">
                <div className="flex items-center space-x-2 text-[#172033]">
                  <Building2 className="h-4 w-4 text-[#38B449] shrink-0" />
                  <span>
                    Enterprise Assessment Intake — Answer the discovery questions below or select your customer account.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-[#008638] text-white font-semibold hover:bg-[#006B2D] transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  Select Customer
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-[#E2E6EE] text-xs shadow-xs">
                <div className="flex items-center space-x-2 text-[#172033]">
                  <Building2 className="h-4 w-4 text-[#008638] shrink-0" />
                  <span>
                    Active Customer: <strong className="text-[#172033]">{currentCustomer?.name || "Enterprise Customer"}</strong>
                    {currentAssessment?.title && (
                      <span className="text-[#667085] ml-1.5 font-normal">
                        ({currentAssessment.title})
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-3 py-1.5 rounded-md border border-[#CBD2DE] text-[#172033] font-medium hover:bg-[#F1F3F7] transition-colors shrink-0 text-xs cursor-pointer"
                >
                  Switch Customer / Assessment
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
            <div className="flex items-center justify-between pt-6 border-t border-[#E2E6EE]">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={currentSectionIndex === 0}
                className="inline-flex items-center space-x-2 rounded-lg border border-[#CBD2DE] bg-white px-4 py-2.5 text-xs font-semibold text-[#172033] shadow-xs hover:bg-[#F1F3F7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1 disabled:opacity-40 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous Section</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  className="hidden sm:inline-flex items-center space-x-1.5 rounded-lg border border-[#CBD2DE] bg-white px-3.5 py-2.5 text-xs font-medium text-[#172033] hover:bg-[#F1F3F7] shadow-xs transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638]"
                >
                  <Save className="h-3.5 w-3.5 text-[#5B6579]" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextSection}
                  className="inline-flex items-center space-x-2 rounded-lg bg-[#008638] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#006B2D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1 transition-colors duration-150 cursor-pointer"
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
            onSubmitAssessment={handleSubmitAssessment}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
            onRetrySubmission={handleSubmitAssessment}
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

        {/* State D: Customer Finalized & Read-Only Submitted Responses View */}
        {currentSectionId === "SUBMITTED" && currentAssessment && (
          <SubmittedResponsesView
            assessment={currentAssessment}
            customer={currentCustomer}
            sections={SECTIONS}
            questionsMap={QUESTIONS}
            answers={answers}
          />
        )}
      </main>

      {/* Attribution Footer */}
      <footer className="py-5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#E2E6EE] flex flex-col sm:flex-row items-center justify-between text-xs text-[#667085] gap-3">
        <div className="flex items-center space-x-2 text-xs">
          <span>meshIQ Enterprise Economic Cost &amp; Efficiency Assessment</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-medium text-[#667085] tracking-tight">
          <span className="text-[11px] uppercase tracking-wider text-[#8A94A6]">Powered by</span>
          <Image
            src="/dataeko-logo.png"
            alt="DATAEKO.AI"
            width={638}
            height={106}
            unoptimized
            className="h-5 sm:h-6 w-auto object-contain shrink-0"
          />
        </div>
      </footer>

      {/* Customer / Assessment Initialization Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={customers}
        onSelectCustomerAndAssessment={handleSelectCustomerAndAssessment}
        onCreateCustomer={handleCreateCustomer}
      />

      {/* Session Isolation Switch Confirmation Modal */}
      {pendingCustomerSwitch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-switch-title"
          aria-describedby="session-switch-desc"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E2E6EE] space-y-5">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-200 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 id="session-switch-title" className="text-base font-bold text-[#172033]">
                  Switch Customer Context &amp; Reset Workspace?
                </h3>
                <p id="session-switch-desc" className="text-xs text-[#667085] leading-relaxed">
                  You are currently working on an assessment for{" "}
                  <strong className="text-[#172033] font-semibold">
                    {currentCustomer?.name || "the active customer"}
                  </strong>
                  . Switching to{" "}
                  <strong className="text-[#172033] font-semibold">
                    {pendingCustomerSwitch.targetCustomerName}
                  </strong>{" "}
                  will isolate the new session and discard all current in-memory assessment responses unless already saved.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F7F8FA] rounded-xl border border-[#E2E6EE] text-xs text-[#475467] space-y-1">
              <div className="font-semibold text-[#172033]">Target Assessment:</div>
              <div>Customer: <span className="font-medium text-[#172033]">{pendingCustomerSwitch.targetCustomerName}</span></div>
              <div>Assessment: <span className="font-medium text-[#172033]">{pendingCustomerSwitch.title}</span></div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingCustomerSwitch(null)}
                className="px-4 py-2 text-xs font-semibold text-[#475467] hover:bg-[#F1F3F7] rounded-lg transition-colors"
                aria-label="Cancel customer switch and keep current assessment"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomerSwitch}
                className="px-4 py-2 text-xs font-bold text-white bg-[#008638] hover:bg-[#006b2d] rounded-lg transition-colors shadow-xs"
                aria-label="Switch Customer & Start Fresh"
                autoFocus
              >
                Switch Customer &amp; Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
