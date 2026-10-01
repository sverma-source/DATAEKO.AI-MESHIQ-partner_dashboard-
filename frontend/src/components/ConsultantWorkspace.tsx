"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Calculator,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  Filter,
  FolderOpen,
  Hash,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { QUESTIONS, SECTIONS, normalizeResponseState } from "../data/questionCatalog";
import {
  Assessment,
  AssessmentResponseState,
  CalculationRunResponse,
  CalculationSnapshot,
  Customer,
  QuestionDefinition,
  SectionDefinition,
} from "../types/assessment";
import { ConsultantAssessmentSummary } from "./ConsultantAssessmentSummary";
import { ExecutiveDashboard } from "./ExecutiveDashboard";

export const ConsultantWorkspace: React.FC = () => {
  const { user } = useAuth();

  // Portfolio State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUBMITTED" | "DRAFT">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selected Assessment View State
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<CalculationSnapshot | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  // Detail View Sub-Tab ("summary" = 12-Section Economic Summary, "responses" = Q01–Q22 answers, "dashboard" = Executive Dashboard)
  const [activeDetailTab, setActiveDetailTab] = useState<"summary" | "responses" | "dashboard">("summary");

  // Fetch Portfolio Assessments & Customers
  const fetchPortfolioData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [assList, custList] = await Promise.all([
        api.listAssessments(),
        api.listCustomers().catch(() => [] as Customer[]),
      ]);
      setAssessments(assList || []);
      setCustomers(custList || []);
    } catch (err: any) {
      setError(err.message || "Failed to load assessment portfolio.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  // Load Selected Assessment Details and its Authoritative Calculation Snapshot
  const handleOpenAssessment = async (assessmentId: string, initialTab: "summary" | "responses" = "summary") => {
    try {
      setIsLoadingDetail(true);
      setIsLoadingSnapshot(true);
      setDetailError(null);
      setSnapshotError(null);
      setSelectedAssessmentId(assessmentId);
      setActiveDetailTab(initialTab);

      const detail = await api.getAssessment(assessmentId);
      setSelectedAssessment(detail);

      const isSub =
        detail.status === "SUBMITTED" ||
        detail.status === "CALCULATED" ||
        detail.status === "COMPLETED";

      if (isSub) {
        try {
          const snap = await api.getLatestSnapshot(assessmentId);
          setSelectedSnapshot(snap);
        } catch (snapErr: any) {
          if (detail.latest_snapshot) {
            setSelectedSnapshot(detail.latest_snapshot);
          } else {
            setSelectedSnapshot(null);
            setSnapshotError("Authoritative calculation snapshot is not currently available for this submitted assessment.");
          }
        }
      } else {
        setSelectedSnapshot(null);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setDetailError(err.message || "Failed to open assessment. Access denied or assessment not found.");
      setSelectedAssessment(null);
      setSelectedSnapshot(null);
    } finally {
      setIsLoadingDetail(false);
      setIsLoadingSnapshot(false);
    }
  };

  const handleBackToPortfolio = () => {
    setSelectedAssessmentId(null);
    setSelectedAssessment(null);
    setSelectedSnapshot(null);
    setDetailError(null);
    setSnapshotError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keyboard Escape listener to return from detail view to portfolio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedAssessmentId) {
        handleBackToPortfolio();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAssessmentId]);

  // Helper to map customer name by ID
  const getCustomerName = (customerId: string, assessmentCustomer?: Customer) => {
    if (assessmentCustomer?.name) return assessmentCustomer.name;
    const found = customers.find((c) => c.id === customerId);
    return found?.name || "Enterprise Customer";
  };

  // Filtered Assessments
  const filteredAssessments = assessments.filter((ass) => {
    const custName = getCustomerName(ass.customer_id, ass.customer).toLowerCase();
    const title = (ass.title || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      query === "" ||
      custName.includes(query) ||
      title.includes(query) ||
      ass.id.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === "SUBMITTED") {
      return (
        ass.status === "SUBMITTED" ||
        ass.status === "CALCULATED" ||
        ass.status === "COMPLETED"
      );
    }
    if (statusFilter === "DRAFT") {
      return ass.status === "DRAFT" || ass.status === "IN_PROGRESS";
    }
    return true;
  });

  // Extract Response State from assessment details
  const getAnswersState = (ass: Assessment | null): AssessmentResponseState => {
    if (!ass || !ass.response) return { q20_use_default: true };
    return normalizeResponseState(ass.response, QUESTIONS);
  };

  // Helper to format human-readable response representation
  const formatAnswerDisplay = (q: QuestionDefinition, answers: AssessmentResponseState) => {
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

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const isSubmitted =
      status === "SUBMITTED" || status === "CALCULATED" || status === "COMPLETED";
    if (isSubmitted) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
          <CheckCircle2 className="h-3 w-3" />
          <span>Submitted</span>
        </span>
      );
    }
    if (status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="h-3 w-3" />
          <span>In Progress</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <span>Draft</span>
      </span>
    );
  };

  // ----------------------------------------------------
  // VIEW: SELECTED ASSESSMENT DETAIL VIEW
  // ----------------------------------------------------
  if (selectedAssessmentId) {
    const answers = getAnswersState(selectedAssessment);
    const isSubmitted =
      selectedAssessment?.status === "SUBMITTED" ||
      selectedAssessment?.status === "CALCULATED" ||
      selectedAssessment?.status === "COMPLETED";

    const customerObj =
      selectedAssessment?.customer ||
      customers.find((c) => c.id === selectedAssessment?.customer_id) ||
      null;

    // Build CalculationRunResponse for ExecutiveDashboard if snapshot is present
    const calculationRun: CalculationRunResponse | null = selectedSnapshot
      ? {
          snapshot_id: selectedSnapshot.id,
          assessment_id: selectedSnapshot.assessment_id,
          calculation_engine_version: selectedSnapshot.calculation_engine_version,
          assessment_version: selectedSnapshot.assessment_version,
          calculated_at: selectedSnapshot.calculated_at,
          summary: selectedSnapshot.summary_metrics || {},
          computed_metrics: selectedSnapshot.computed_metrics || {},
          assumptions_used: selectedSnapshot.assumptions_used || {},
          benchmarks_used: selectedSnapshot.benchmarks_used || {},
          provenance_summary: selectedSnapshot.provenance_summary || {},
        }
      : null;

    return (
      <div className="space-y-6 max-w-5xl mx-auto py-2" data-testid="consultant-assessment-view">
        {/* Navigation Breadcrumb & Back CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleBackToPortfolio}
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#172033] hover:text-[#008638] bg-white border border-[#CBD2DE] hover:border-[#008638] hover:bg-[#EEF8F0]/30 px-3.5 py-2 rounded-lg transition-colors duration-150 shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1"
              aria-label="Back to Assessment Portfolio"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Portfolio</span>
            </button>

            {/* Sub-View Navigation Tabs */}
            <div className="inline-flex rounded-lg border border-[#CBD2DE] p-0.5 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveDetailTab("summary")}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                  activeDetailTab === "summary"
                    ? "bg-[#008638] text-white"
                    : "text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7]"
                }`}
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>12-Section Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab("responses")}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                  activeDetailTab === "responses"
                    ? "bg-[#008638] text-white"
                    : "text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7]"
                }`}
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>Q01–Q22 Discovery Answers</span>
              </button>

              {calculationRun && (
                <button
                  type="button"
                  onClick={() => setActiveDetailTab("dashboard")}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                    activeDetailTab === "dashboard"
                      ? "bg-[#008638] text-white"
                      : "text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7]"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Executive Dashboard</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#667085]">
            <Lock className="h-3.5 w-3.5 text-[#008638]" />
            <span className="font-semibold text-[#172033]">Consultant Read-Only Review</span>
          </div>
        </div>

        {/* Error Alert */}
        {detailError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-center space-x-3"
          >
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{detailError}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoadingDetail && (
          <div className="rounded-2xl bg-white border border-[#E2E6EE] p-12 text-center space-y-3 shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-[#008638] mx-auto" />
            <p className="text-xs font-semibold text-[#667085]">Loading assessment details...</p>
          </div>
        )}

        {/* SUB-VIEW 1: 12-SECTION ECONOMIC SUMMARY */}
        {selectedAssessment && !isLoadingDetail && activeDetailTab === "summary" && (
          <ConsultantAssessmentSummary
            assessment={selectedAssessment}
            snapshot={selectedSnapshot}
            customer={customerObj}
            answers={answers}
            isLoadingSnapshot={isLoadingSnapshot}
            snapshotError={snapshotError}
            onBackToPortfolio={handleBackToPortfolio}
            onViewDiscoveryAnswers={() => setActiveDetailTab("responses")}
          />
        )}

        {/* SUB-VIEW 2: Q01–Q22 DISCOVERY INTAKE RESPONSES */}
        {selectedAssessment && !isLoadingDetail && activeDetailTab === "responses" && (
          <div className="space-y-6">
            {/* Assessment Header Card */}
            <div className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E6EE] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-[#008638] uppercase tracking-wider">
                      Discovery Intake Review
                    </span>
                    {renderStatusBadge(selectedAssessment.status)}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#172033] tracking-tight">
                    {selectedAssessment.title || "Enterprise IBM MQ Economic Assessment"}
                  </h1>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <div className="rounded-xl bg-[#F7F8FA] border border-[#E2E6EE] px-3.5 py-2 text-right">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#667085] block">
                      Status State
                    </span>
                    <span className="text-xs font-bold text-[#172033]">
                      {isSubmitted ? "Finalized / Submitted" : "Discovery Intake (In-Progress)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Read-Only Notice */}
              <div className="rounded-xl bg-[#EEF8F0] border border-[#A8E2B5] p-3.5 text-xs text-[#008638] flex items-center space-x-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Consultant Portfolio Review:</strong> All 22 respondent discovery answers are displayed below in read-only form. Client submissions are immutable.
                </span>
              </div>
            </div>

            {/* Grouped Canonical 7 Sections */}
            <div className="space-y-6">
              {SECTIONS.map((section) => {
                const sectionQuestions = (section.questionIds || [])
                  .map((qId) => QUESTIONS[qId])
                  .filter(Boolean);

                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-[#E2E6EE] bg-white overflow-hidden shadow-xs"
                  >
                    {/* Section Header */}
                    <div className="px-5 py-3.5 bg-[#F7F8FA] border-b border-[#E2E6EE] flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="h-6 w-6 rounded-md bg-[#008638] text-white font-bold text-xs flex items-center justify-center">
                          {section.id}
                        </span>
                        <div>
                          <h2 className="text-xs font-bold text-[#172033]">{section.title}</h2>
                          <p className="text-[11px] text-[#667085]">{section.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#667085]">
                        {sectionQuestions.length} Questions
                      </span>
                    </div>

                    {/* Questions in Section */}
                    <div className="divide-y divide-[#E2E6EE]">
                      {sectionQuestions.map((q) => {
                        const answerText = formatAnswerDisplay(q, answers);
                        const isUnanswered =
                          answerText === "Not answered" || answerText === "Not provided";
                        const isUnknown =
                          answerText.includes("Unknown") || answerText.includes("Not sure");
                        const isExactOverride =
                          answerText.includes("Exact Override") ||
                          answerText.includes("Exact Target");

                        return (
                          <div key={q.id} className="p-4 sm:p-5 hover:bg-[#FAFBFD] transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-1 max-w-xl">
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-0.5 rounded bg-[#F0F2F6] text-[#5B6579] font-mono text-[11px] font-bold border border-[#E2E6EE]">
                                    {q.code}
                                  </span>
                                  <h3 className="text-xs font-bold text-[#172033]">{q.title}</h3>
                                </div>
                                <p className="text-xs text-[#667085] leading-relaxed">
                                  {q.questionText}
                                </p>
                              </div>

                              {/* Formatted Answer */}
                              <div className="sm:text-right shrink-0 mt-1 sm:mt-0">
                                <div
                                  className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${
                                    isUnanswered
                                      ? "bg-[#F0F2F6] text-[#738096] border border-[#E2E6EE]"
                                      : isExactOverride
                                      ? "bg-slate-100 text-slate-800 border border-slate-300"
                                      : isUnknown
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                                  }`}
                                >
                                  {answerText}
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
          </div>
        )}

        {/* SUB-VIEW 3: EXECUTIVE DASHBOARD & SCENARIO SANDBOX */}
        {selectedAssessment &&
          !isLoadingDetail &&
          activeDetailTab === "dashboard" &&
          calculationRun && (
            <div className="space-y-6">
              <ExecutiveDashboard
                calculation={calculationRun}
                customer={customerObj}
                assessment={selectedAssessment}
                answers={answers}
                onReturnToWizard={() => setActiveDetailTab("summary")}
              />
            </div>
          )}
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: CONSULTANT PORTFOLIO TABLE / LIST
  // ----------------------------------------------------
  const submittedCount = assessments.filter(
    (a) => a.status === "SUBMITTED" || a.status === "CALCULATED" || a.status === "COMPLETED"
  ).length;
  const draftCount = assessments.length - submittedCount;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-3" data-testid="consultant-portfolio-workspace">
      {/* Enterprise Page Header */}
      <div className="rounded-2xl bg-[#0D1322] p-6 sm:p-7 border border-[#1E293B] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden text-white">
        {/* meshIQ Brand Accent Hairline */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#008638] via-[#38B449] via-[#8CC63E] to-[#C026D3] pointer-events-none"
        />

        {/* Large Asymmetrical meshIQ Contour / Radial Background Geometry */}
        <div aria-hidden="true" className="hidden sm:block absolute -right-16 -top-14 w-80 h-64 md:w-[420px] md:h-[260px] pointer-events-none opacity-40">
          <svg viewBox="0 0 420 260" className="w-full h-full" fill="none">
            {/* Concentric arcs */}
            <circle cx="340" cy="50" r="140" stroke="#38B449" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
            <circle cx="340" cy="50" r="210" stroke="#8CC63E" strokeWidth="1" strokeDasharray="3 5" opacity="0.35" />
            <circle cx="340" cy="50" r="280" stroke="#CBD5E1" strokeWidth="0.75" strokeDasharray="2 4" opacity="0.25" />
            {/* Radiating technical rays */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = 120 + (i * 120) / 24;
              const rad = (angle * Math.PI) / 180;
              const x1 = Number((340 + 80 * Math.cos(rad)).toFixed(2));
              const y1 = Number((50 + 80 * Math.sin(rad)).toFixed(2));
              const x2 = Number((340 + 260 * Math.cos(rad)).toFixed(2));
              const y2 = Number((50 + 260 * Math.sin(rad)).toFixed(2));
              return (
                <line
                  key={`c-ray-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={i % 6 === 0 ? "#C026D3" : i % 2 === 0 ? "#38B449" : "#8CC63E"}
                  strokeWidth={i % 4 === 0 ? 1.5 : 0.85}
                  opacity={0.5}
                />
              );
            })}
            {/* Flowing contour sweeps */}
            <path d="M 20 260 C 120 180, 240 220, 380 90" stroke="#38B449" strokeWidth="1.5" />
            <path d="M 60 260 C 150 195, 270 235, 410 110" stroke="#8CC63E" strokeWidth="1" />
            <path d="M 100 260 C 180 210, 300 250, 440 130" stroke="#C026D3" strokeWidth="0.85" opacity="0.6" />
          </svg>
        </div>

        <div className="space-y-1.5 max-w-3xl relative z-10">
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#38B449]/15 text-[#8CC63E] border border-[#38B449]/40">
              <Shield className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Advisory &amp; Review Workspace
            </span>
            <span className="text-xs text-slate-400 font-medium">Consultant Persona</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Customer &amp; Assessment Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Welcome to the Consultant Engagement Workspace. Review client-submitted Q01–Q22 discovery responses, inspect authoritative 12-section economic summaries, and access scenario models across your authorized customer tenant scope.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <div className="rounded-xl bg-[#1E293B]/80 px-4 py-3 border border-[#334155] text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Tenant Scope
            </div>
            <div className="text-xs font-bold text-white font-mono mt-0.5">
              {user?.tenant_id ? `${user.tenant_id.slice(0, 13)}...` : "Partner Scope"}
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Metric Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6579]">
            Total Assessments
          </span>
          <div className="text-2xl font-extrabold text-[#172033]">{assessments.length}</div>
          <div className="text-[11px] text-[#8A94A6]">Across tenant scope</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#008638]">
            Submitted &amp; Finalized
          </span>
          <div className="text-2xl font-extrabold text-[#008638]">{submittedCount}</div>
          <div className="text-[11px] text-[#008638]/80 font-medium">Ready for advisory review</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Draft / In Progress
          </span>
          <div className="text-2xl font-extrabold text-amber-700">{draftCount}</div>
          <div className="text-[11px] text-amber-600 font-medium">In client discovery</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-[#E2E6EE] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6579]">
            Active Customers
          </span>
          <div className="text-2xl font-extrabold text-[#172033]">{customers.length}</div>
          <div className="text-[11px] text-[#8A94A6]">Client organizations</div>
        </div>
      </div>

      {/* Portfolio Table Card */}
      <div className="rounded-2xl bg-white border border-[#E2E6EE] shadow-xs overflow-hidden space-y-0">
        {/* Table Filter & Search Controls */}
        <div className="p-4 sm:p-5 border-b border-[#E2E6EE] bg-[#FAFAFA] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6579]" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search customer or assessment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#CBD2DE] rounded-lg text-xs font-medium text-[#172033] placeholder-[#8A94A6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] transition-colors duration-150"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search input"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A94A6] hover:text-[#172033] p-0.5 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
            <div className="inline-flex rounded-lg border border-[#CBD2DE] p-0.5 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                  statusFilter === "ALL"
                    ? "bg-[#008638] text-white"
                    : "text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7]"
                }`}
              >
                All ({assessments.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("SUBMITTED")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                  statusFilter === "SUBMITTED"
                    ? "bg-[#008638] text-white"
                    : "text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7]"
                }`}
              >
                Submitted ({submittedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] ${
                  statusFilter === "DRAFT"
                    ? "bg-[#008638] text-white"
                    : "text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7]"
                }`}
              >
                Draft ({draftCount})
              </button>
            </div>

            <button
              type="button"
              onClick={fetchPortfolioData}
              disabled={isLoading}
              title="Refresh Portfolio"
              aria-label="Refresh Portfolio"
              className="p-2 rounded-lg border border-[#CBD2DE] bg-white text-[#5B6579] hover:text-[#172033] hover:bg-[#F1F3F7] transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638]"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchPortfolioData}
              className="text-xs font-bold text-rose-700 underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#008638] mx-auto" />
            <p className="text-xs font-semibold text-[#5B6579]">Loading assessment portfolio...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredAssessments.length === 0 && (
          <div className="p-12 sm:p-16 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#EEF8F0] text-[#008638] flex items-center justify-center border border-[#A8E2B5]">
              <FolderOpen className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm font-bold text-[#172033]">
                {searchQuery
                  ? `No assessments found matching "${searchQuery}"`
                  : "No assessments are currently available in your authorized workspace."}
              </h3>
              <p className="text-xs text-[#5B6579] leading-relaxed">
                {searchQuery
                  ? "Try adjusting your search terms or filter selection."
                  : "When client assessments are created or submitted within your partner tenant scope, they will appear here for advisory review."}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg border border-[#CBD2DE] bg-white text-xs font-semibold text-[#172033] hover:bg-[#F1F3F7] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] transition-colors duration-150"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Table */}
        {!isLoading && filteredAssessments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E6EE] bg-[#F7F8FA] text-[#5B6579] uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3.5 px-4 sm:px-6">Customer Organization</th>
                  <th className="py-3.5 px-4">Assessment Title &amp; ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EE]">
                {filteredAssessments.map((ass) => {
                  const custName = getCustomerName(ass.customer_id, ass.customer);
                  const formattedDate = ass.updated_at
                    ? new Date(ass.updated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—";

                  return (
                    <tr key={ass.id} className="interactive-row group">
                      {/* Customer */}
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-[#172033]">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-lg bg-[#F0F2F6] flex items-center justify-center text-[#5B6579] shrink-0 border border-[#E2E6EE]">
                            <Building2 className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <span className="truncate max-w-xs">{custName}</span>
                        </div>
                      </td>

                      {/* Title & Reference */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-[#172033] truncate max-w-xs">
                            {ass.title || "Enterprise IBM MQ Assessment"}
                          </div>
                          <div className="font-mono text-[10px] text-[#8A94A6] truncate">
                            ID: {ass.id}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{renderStatusBadge(ass.status)}</td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#5B6579] font-medium">{formattedDate}</td>

                      {/* Action */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAssessment(ass.id, "summary")}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#008638] text-white font-bold text-xs hover:bg-[#006B2D] hover:shadow-sm transition-all duration-150 shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008638] focus-visible:ring-offset-1"
                          aria-label={`Open Assessment for ${custName}`}
                        >
                          <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Open Assessment</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
