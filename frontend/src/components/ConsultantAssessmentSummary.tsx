"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Hash,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  Lock,
  Printer,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Assessment,
  CalculationRunResponse,
  CalculationSnapshot,
  Customer,
} from "../types/assessment";
import {
  ExecutiveReportModel,
  ReportMetricEvaluationState,
  ReportProvenanceTier,
} from "../types/report";
import { mapSnapshotToExecutiveReport } from "../services/reportDataAdapter";
import { api } from "../services/api";

interface ConsultantAssessmentSummaryProps {
  assessment: Assessment;
  snapshot: CalculationSnapshot | null;
  customer?: Customer | null;
  answers?: Record<string, any>;
  isLoadingSnapshot: boolean;
  snapshotError: string | null;
  onBackToPortfolio: () => void;
  onViewDiscoveryAnswers: () => void;
}

export const ConsultantAssessmentSummary: React.FC<ConsultantAssessmentSummaryProps> = ({
  assessment,
  snapshot,
  customer,
  answers = {},
  isLoadingSnapshot,
  snapshotError,
  onBackToPortfolio,
  onViewDiscoveryAnswers,
}) => {
  const [showAuditAppendix, setShowAuditAppendix] = useState<boolean>(false);

  const isSubmitted =
    assessment.status === "SUBMITTED" ||
    assessment.status === "CALCULATED" ||
    assessment.status === "COMPLETED";

  // Convert snapshot into CalculationRunResponse format for ReportDataAdapter
  const calculationRun: CalculationRunResponse | null = useMemo(() => {
    if (!snapshot) return null;
    return {
      snapshot_id: snapshot.id,
      assessment_id: snapshot.assessment_id,
      calculation_engine_version: snapshot.calculation_engine_version,
      assessment_version: snapshot.assessment_version,
      calculated_at: snapshot.calculated_at,
      summary: snapshot.summary_metrics || {},
      computed_metrics: snapshot.computed_metrics || {},
      assumptions_used: snapshot.assumptions_used || {},
      benchmarks_used: snapshot.benchmarks_used || {},
      provenance_summary: snapshot.provenance_summary || {},
    };
  }, [snapshot]);

  // Derive Report Model deterministically from Snapshot without performing any client-side calculations
  const report: ExecutiveReportModel | null = useMemo(() => {
    if (!calculationRun) return null;
    return mapSnapshotToExecutiveReport(calculationRun, customer, assessment, answers);
  }, [calculationRun, customer, assessment, answers]);

  const handlePrint = () => {
    window.print();
  };

  const getProvenanceBadgeClass = (provenance: ReportProvenanceTier) => {
    switch (provenance) {
      case "CUSTOMER_FACT":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "CALCULATED_RESULT":
        return "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]";
      case "INDUSTRY_BENCHMARK":
      case "BENCHMARK_FALLBACK":
        return "bg-[#FAF5FF] text-[#722F8A] border-[#E9D5FF]";
      case "MODEL_ASSUMPTION":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "SCENARIO_PROJECTION":
        return "bg-amber-50 text-amber-800 border-amber-300";
      default:
        return "bg-slate-50 text-slate-700 border-slate-300";
    }
  };

  const getStateBadgeClass = (state: ReportMetricEvaluationState) => {
    switch (state) {
      case "VALID":
      case "VALID_WITH_DEFAULTS":
        return "text-[#008638] bg-[#EEF8F0] border-[#A8E2B5]";
      case "INDUSTRY_BENCHMARK":
        return "text-[#722F8A] bg-[#FAF5FF] border-[#E9D5FF]";
      case "INSUFFICIENT_DATA":
      case "NOT_MODELED":
      case "NOT_APPLICABLE":
        return "text-slate-600 bg-slate-100 border-slate-200";
      default:
        return "text-slate-700 bg-slate-50 border-slate-200";
    }
  };

  const formattedDate = assessment.updated_at
    ? new Date(assessment.updated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recent";

  // PDF & CSV Deliverable links
  const pdfUrl = api.getAssessmentPdfUrl(assessment.id);
  const csvUrl = api.getAssessmentCsvUrl(assessment.id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2" data-testid="consultant-economic-summary">
      {/* Action Toolbar */}
      {isSubmitted && snapshot && (
        <div className="flex items-center justify-end space-x-2 print:hidden">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-[#CBD2DE] text-xs font-semibold text-[#172033] hover:bg-[#F7F8FA] transition-colors shadow-2xs"
            title="Download Executive PDF Deliverable"
          >
            <FileText className="h-3.5 w-3.5 text-rose-600" />
            <span>PDF Report</span>
          </a>

          <a
            href={csvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white border border-[#CBD2DE] text-xs font-semibold text-[#172033] hover:bg-[#F7F8FA] transition-colors shadow-2xs"
            title="Export Calculation Metrics as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>CSV Export</span>
          </a>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#008638] text-white text-xs font-bold hover:bg-[#006B2D] transition-colors shadow-2xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
        </div>
      )}

      {/* Assessment Header Card */}
      <div className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E6EE] pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-bold text-[#008638] uppercase tracking-wider">
                12-Section Economic Summary
              </span>
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isSubmitted
                    ? "bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Submitted &amp; Finalized</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>Draft / In Progress</span>
                  </>
                )}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#172033] tracking-tight">
              {assessment.title || "Enterprise IBM MQ Economic Assessment"}
            </h1>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <div className="rounded-xl bg-[#F7F8FA] border border-[#E2E6EE] px-3.5 py-2 text-right">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#667085] block">
                Calculation Snapshot
              </span>
              <span className="text-xs font-bold font-mono text-[#172033]">
                {snapshot ? `Snap: ${snapshot.id.substring(0, 8)}...` : "Unfinalized"}
              </span>
            </div>
          </div>
        </div>

        {/* Assessment Context Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE]">
            <Building2 className="h-4 w-4 text-[#008638] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-[#667085] block uppercase font-semibold">Customer</span>
              <span className="font-bold text-[#172033] truncate block">
                {customer?.name || assessment.customer?.name || "Enterprise Customer"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE]">
            <Calendar className="h-4 w-4 text-[#008638] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-[#667085] block uppercase font-semibold">Calculated / Updated</span>
              <span className="font-bold text-[#172033] truncate block">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE]">
            <Calculator className="h-4 w-4 text-[#008638] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-[#667085] block uppercase font-semibold">Engine Version</span>
              <span className="font-mono text-xs font-bold text-[#172033] truncate block">
                v{snapshot?.calculation_engine_version || assessment.assessment_version || "1.0.0"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE]">
            <Hash className="h-4 w-4 text-[#008638] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-[#667085] block uppercase font-semibold">Assessment ID</span>
              <span className="font-mono text-[11px] text-[#172033] font-semibold truncate block">
                {assessment.id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingSnapshot && (
        <div className="rounded-2xl bg-white border border-[#E2E6EE] p-12 text-center space-y-3 shadow-xs">
          <Loader2 className="h-6 w-6 animate-spin text-[#008638] mx-auto" />
          <p className="text-xs font-semibold text-[#667085]">
            Loading authoritative calculation snapshot...
          </p>
        </div>
      )}

      {/* Snapshot Error State */}
      {snapshotError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-center space-x-3"
        >
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{snapshotError}</span>
        </div>
      )}

      {/* No Snapshot / Draft Assessment State */}
      {!isLoadingSnapshot && !snapshotError && (!snapshot || !isSubmitted) && (
        <div className="rounded-2xl bg-white border border-[#E2E6EE] p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-[#172033]">
              Finalized Economic Results Unavailable
            </h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              This assessment is currently in <strong>Draft / In Progress</strong> status. Authoritative economic calculations and the structured 12-section summary are deterministically generated and snapshotted when the client formally submits their assessment.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onViewDiscoveryAnswers}
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#008638] hover:text-[#006B2D] bg-[#EEF8F0] border border-[#A8E2B5] px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Review Current Q01–Q22 Discovery Intake Responses</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* STRUCTURED 12-SECTION AUTHORITATIVE SUMMARY (SUBMITTED ASSESSMENTS)      */}
      {/* ------------------------------------------------------------------------- */}
      {!isLoadingSnapshot && isSubmitted && snapshot && report && (
        <div className="space-y-8">
          {/* Section 1: Executive Summary & Core Economic Baseline */}
          <section className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E6EE] pb-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                    Executive Summary &amp; Core Economic Baseline
                  </h2>
                </div>
                <p className="text-xs text-[#667085]">
                  Authoritative snapshot outputs: quantified labor expenditure, single-event consequence, and recoverable capacity.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[#008638] bg-[#EEF8F0] border border-[#A8E2B5] px-2.5 py-0.5 rounded-full">
                Authoritative Snapshot
              </span>
            </div>

            {/* Core KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Operational Labor Cost */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E6EE] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  Total Operational Labor
                </span>
                <div className="text-2xl font-black text-[#172033]">
                  {report.executiveSummary.totalOperationalLaborCost.formattedValue}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#667085] pt-1 border-t border-[#E2E6EE]">
                  <span>{report.operationalEffort.consolidated.totalAnnualHours.formattedValue} hrs/yr</span>
                  <span className="font-semibold text-[#008638]">
                    {report.executiveSummary.operationalFteBurden.formattedValue} FTE
                  </span>
                </div>
              </div>

              {/* Representative Single-Event Exposure */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E6EE] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  Single-Event Exposure
                </span>
                <div className="text-2xl font-black text-amber-900">
                  {report.executiveSummary.representativeSingleEventExposure.formattedValue}
                </div>
                <div className="text-[11px] text-[#667085] pt-1 border-t border-[#E2E6EE] flex items-center justify-between">
                  <span>Representative Outage</span>
                  <span className="text-[10px] font-semibold uppercase text-amber-700">
                    {report.executiveSummary.representativeSingleEventExposure.provenanceLabel}
                  </span>
                </div>
              </div>

              {/* Customer-Reported Annual MQ Spend */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E2E6EE] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  Customer Reported Spend
                </span>
                <div className="text-2xl font-black text-[#172033]">
                  {report.executiveSummary.customerReportedAnnualMqSpend.formattedValue}
                </div>
                <div className="text-[11px] text-[#667085] pt-1 border-t border-[#E2E6EE] flex items-center justify-between">
                  <span>Isolated Fact (Q21)</span>
                  <span className="text-[10px] font-semibold uppercase text-[#008638]">
                    Customer Fact
                  </span>
                </div>
              </div>

              {/* Illustrative Economic Value (Scenario) */}
              <div className="p-4 rounded-xl bg-[#EEF8F0]/70 border border-[#A8E2B5] space-y-1.5">
                <span className="text-[11px] font-semibold text-[#008638] uppercase tracking-wider block">
                  Illustrative Economic Value
                </span>
                <div className="text-2xl font-black text-[#172033]">
                  {report.executiveSummary.illustrativeAnnualLaborSavings.formattedValue}
                </div>
                <div className="text-[11px] text-[#008638] pt-1 border-t border-[#A8E2B5] flex items-center justify-between">
                  <span>{report.improvementScenario.totalRecoverableHours.formattedValue} hrs recovered</span>
                  <span className="text-[10px] font-semibold uppercase text-[#008638]">
                    Scenario
                  </span>
                </div>
              </div>
            </div>

            {/* Narrative Summary */}
            <div className="text-xs text-[#4A5568] leading-relaxed space-y-2 bg-[#F7F8FA] p-4 rounded-xl border border-[#E2E6EE]">
              {report.executiveSummary.summaryNarrative.map((narrative, idx) => (
                <p key={idx}>{narrative}</p>
              ))}
            </div>
          </section>

          {/* Section 2: Assessment Scope & Environment Baseline (Q01–Q05) */}
          <section className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#E2E6EE] pb-3.5">
              <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Assessment Scope &amp; Environment Baseline
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                report.scopeAndEnvironment.estateScale,
                report.scopeAndEnvironment.staffingResources,
                report.scopeAndEnvironment.operationalModel,
                report.scopeAndEnvironment.adminTimeOverhead,
                report.scopeAndEnvironment.techDebtInfrastructure,
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[#E2E6EE] bg-[#FAFBFD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-[#667085] bg-white px-1.5 py-0.5 rounded border border-[#E2E6EE]">
                      {item.questionCode}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-slate-100 text-slate-800 border-slate-300">
                      Customer Fact
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#4A5568]">{item.questionTitle}</div>
                  <div className="text-xs font-bold text-[#172033]">{item.customerResponse}</div>
                  <p className="text-[11px] text-[#8A94A6] leading-snug">{item.interpretation}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3, 4, & 5: Operational Effort & Labor Cost Breakdown */}
          <section className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#E2E6EE] pb-3.5">
              <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Operational Effort &amp; Labor Cost Breakdown
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#E2E6EE] rounded-xl overflow-hidden">
                <thead className="bg-[#F7F8FA] text-[#667085] font-bold border-b border-[#E2E6EE]">
                  <tr>
                    <th className="py-2.5 px-3">Workload Category</th>
                    <th className="py-2.5 px-3">Calculation Driver / Parameter</th>
                    <th className="py-2.5 px-3 text-right">Annual Hours</th>
                    <th className="py-2.5 px-3 text-right">FTE Equivalent</th>
                    <th className="py-2.5 px-3 text-right">Operational Labor Cost</th>
                    <th className="py-2.5 px-3 text-center">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6EE]">
                  {/* Routine Administration */}
                  <tr className="hover:bg-[#FAFBFD]">
                    <td className="py-2.5 px-3 font-semibold text-[#172033]">
                      Routine Administration
                      <span className="block text-[10px] text-[#667085] font-normal">
                        Quarterly Admin: {report.operationalEffort.routineAdmin.quarterlyHours !== null ? `${report.operationalEffort.routineAdmin.quarterlyHours} hrs × 4` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#667085]">
                      Q04 ({report.operationalEffort.routineAdmin.quarterlyDropdownValue})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#172033]">
                      {report.operationalEffort.routineAdmin.annualHours.formattedValue}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#667085]">
                      —
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#172033]">
                      {report.operationalEffort.routineAdmin.annualCost.formattedValue}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                        Calculated
                      </span>
                    </td>
                  </tr>

                  {/* Incident Troubleshooting */}
                  <tr className="hover:bg-[#FAFBFD]">
                    <td className="py-2.5 px-3 font-semibold text-[#172033]">
                      Incident Troubleshooting
                      <span className="block text-[10px] text-[#667085] font-normal">
                        {report.operationalEffort.incidentTroubleshooting.frequencyAnnualEvents} events/yr × {report.operationalEffort.incidentTroubleshooting.laborHoursPerIncidentValue} staff hrs
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#667085]">
                      Q06 Frequency × Q07 Staff Effort
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#172033]">
                      {report.operationalEffort.incidentTroubleshooting.annualHours.formattedValue}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#667085]">
                      —
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#172033]">
                      {report.operationalEffort.incidentTroubleshooting.annualCost.formattedValue}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                        Calculated
                      </span>
                    </td>
                  </tr>

                  {/* Total Operational Labor */}
                  <tr className="bg-[#F7F8FA] font-bold">
                    <td className="py-2.5 px-3 text-[#172033]">
                      Total Operational Labor Burden
                    </td>
                    <td className="py-2.5 px-3 text-[#667085] text-[11px]">
                      Loaded Rate: {report.operationalEffort.consolidated.loadedHourlyRate.formattedValue}/hr ($180k ÷ 2,080h)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#172033] text-sm">
                      {report.operationalEffort.consolidated.totalAnnualHours.formattedValue}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#172033] text-sm">
                      {report.operationalEffort.consolidated.fteBurden.formattedValue}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#172033] text-sm">
                      {report.operationalEffort.consolidated.totalAnnualCost.formattedValue}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                        Calculated
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#667085] italic">
              Note: Total Operational FTE Burden is provided directly by the authoritative calculation engine (operational_fte_burden). Category-level FTEs are not independently modeled in the snapshot.
            </p>
          </section>

          {/* Section 6 & 7: Business Exposure & Isolated Annual MQ Spend */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Representative Single-Event Exposure */}
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center">
                    6
                  </span>
                  <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Single-Event Business Exposure
                  </h3>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getProvenanceBadgeClass(
                    report.businessExposure.representativeSingleEventExposure.provenance
                  )}`}
                >
                  {report.businessExposure.representativeSingleEventExposure.provenanceLabel}
                </span>
              </div>

              <div className="text-2xl font-black text-amber-900">
                {report.businessExposure.representativeSingleEventExposure.formattedValue}
              </div>

              <div className="space-y-1 text-xs text-[#4A5568]">
                <div className="flex justify-between py-1 border-b border-amber-200/60">
                  <span className="text-[#667085]">Disruption Duration:</span>
                  <span className="font-semibold">{report.businessExposure.disruptionDurationDropdown}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-amber-200/60">
                  <span className="text-[#667085]">Financial Impact / Hour:</span>
                  <span className="font-semibold">{report.businessExposure.hourlyDowntimeRate.formattedValue}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#667085]">Exposure State:</span>
                  <span className="font-mono text-[11px] font-semibold">
                    {report.businessExposure.representativeSingleEventExposure.state}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 border border-amber-200 text-[11px] text-amber-900 leading-normal">
                <strong>Non-Annualization Safeguard:</strong> {report.businessExposure.exposureInterpretationNote}
              </div>
            </div>

            {/* Customer-Reported Annual MQ Spend (Q21) */}
            <div className="p-5 rounded-2xl border border-[#E2E6EE] bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                    7
                  </span>
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                    Customer-Reported MQ Spend
                  </h3>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getProvenanceBadgeClass(
                    report.customerAnnualSpend.spendMetric.provenance
                  )}`}
                >
                  {report.customerAnnualSpend.spendMetric.provenanceLabel}
                </span>
              </div>

              <div className="text-2xl font-black text-[#172033]">
                {report.customerAnnualSpend.spendMetric.formattedValue}
              </div>

              <div className="space-y-1 text-xs text-[#4A5568]">
                <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                  <span className="text-[#667085]">Data Source:</span>
                  <span className="font-semibold">Question Q21 Discovery Input</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6EE]">
                  <span className="text-[#667085]">Classification:</span>
                  <span className="font-semibold">Isolated Customer Fact</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#667085]">Evaluation State:</span>
                  <span className="font-mono text-[11px] font-semibold">
                    {report.customerAnnualSpend.spendMetric.state}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E2E6EE] text-[11px] text-[#667085] leading-normal">
                <strong>Isolation Safeguard:</strong> {report.customerAnnualSpend.isolationNote}
              </div>
            </div>
          </section>

          {/* Section 8 & 9: Troubleshooting Productivity Opportunity & meshIQ Scenario */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Troubleshooting Productivity Opportunity (10% Rule) */}
            <div className="p-5 rounded-2xl border border-[#A8E2B5] bg-[#EEF8F0]/30 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                    8
                  </span>
                  <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                    Troubleshooting Opportunity (10%)
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                  Calculated Metric
                </span>
              </div>

              <div className="text-2xl font-black text-[#172033]">
                {report.troubleshootingOpportunity.opportunityMetric.formattedValue}
              </div>

              <p className="text-xs text-[#667085]">
                Represents a 10% direct productivity recovery on annual troubleshooting labor cost ({report.operationalEffort.incidentTroubleshooting.annualCost.formattedValue}).
              </p>

              <div className="p-2.5 rounded-lg bg-white/90 border border-[#A8E2B5] text-[11px] text-[#4A5568]">
                <strong>Governance Rule:</strong> {report.troubleshootingOpportunity.interpretationNote}
              </div>
            </div>

            {/* Controlled Improvement Scenario (50% × 50% + 25%) */}
            <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded bg-indigo-700 text-white text-[11px] font-bold flex items-center justify-center">
                    9
                  </span>
                  <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    meshIQ Improvement Scenario
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                  Illustrative Scenario
                </span>
              </div>

              <div className="text-2xl font-black text-indigo-900">
                {report.improvementScenario.illustrativeEconomicValue.formattedValue}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#4A5568]">
                <div className="p-2 rounded bg-white border border-indigo-100">
                  <span className="text-[10px] text-[#667085] block">Recoverable Hours</span>
                  <strong className="text-indigo-900 font-mono">
                    {report.improvementScenario.totalRecoverableHours.formattedValue} hrs/yr
                  </strong>
                </div>
                <div className="p-2 rounded bg-white border border-indigo-100">
                  <span className="text-[10px] text-[#667085] block">Automation Lever</span>
                  <strong className="text-indigo-900">50%×50% Admin / 25% MTTR</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/90 border border-indigo-200 text-[11px] text-indigo-950">
                <strong>Disclaimer:</strong> {report.improvementScenario.scenarioDisclaimer}
              </div>
            </div>
          </section>

          {/* Section 10: Data Provenance & Trust Classification */}
          <section className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#E2E6EE] pb-3.5">
              <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                10
              </span>
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Data Provenance &amp; Trust Hierarchy
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#E2E6EE] rounded-xl overflow-hidden">
                <thead className="bg-[#F7F8FA] text-[#667085] font-bold border-b border-[#E2E6EE]">
                  <tr>
                    <th className="py-2.5 px-3">Classification Tier</th>
                    <th className="py-2.5 px-3">Definition &amp; Authority</th>
                    <th className="py-2.5 px-3">Examples in this Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6EE]">
                  {report.provenanceTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFBFD]">
                      <td className="py-2.5 px-3 font-semibold text-[#172033] whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            row.category === "Customer Fact"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : row.category === "Industry Benchmark"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : row.category === "Calculated Result"
                              ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]"
                              : row.category === "Model Assumption"
                              ? "bg-indigo-50 text-indigo-800 border-indigo-300"
                              : "bg-purple-50 text-purple-800 border-purple-300"
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#4A5568] max-w-md">{row.definition}</td>
                      <td className="py-2.5 px-3 text-[#667085] font-mono text-[11px]">
                        {row.examplesInReport}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 11: Operational & Governance Findings */}
          <section className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-[#E2E6EE] pb-3.5">
              <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                11
              </span>
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Operational &amp; Governance Findings
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.governanceFindings.map((f, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[#E2E6EE] bg-[#FAFBFD] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172033] uppercase tracking-wider">
                      {f.domain}
                    </span>
                    <span className="text-[10px] font-mono text-[#667085] bg-white px-2 py-0.5 rounded border border-[#E2E6EE]">
                      {f.sourceQuestions.join(", ")}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#008638]">{f.findingTitle}</div>
                  <p className="text-xs text-[#667085] leading-relaxed">{f.findingNarrative}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 12: Assessment Methodology & Financial Safeguards */}
          <section className="rounded-2xl bg-white border border-[#E2E6EE] p-6 shadow-xs space-y-6">
            <div className="flex items-center space-x-2 border-b border-[#E2E6EE] pb-3.5">
              <span className="h-5 w-5 rounded bg-[#008638] text-white text-[11px] font-bold flex items-center justify-center">
                12
              </span>
              <h2 className="text-sm font-bold text-[#172033] uppercase tracking-wider">
                Assessment Methodology &amp; Financial Safeguards
              </h2>
            </div>

            {/* Methodology Formulas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {report.methodology.map((m, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E2E6EE] space-y-1">
                  <span className="font-bold text-[#172033] block">{m.title}</span>
                  <code className="text-[11px] text-[#172033] bg-white px-2 py-1 rounded block border border-[#E2E6EE] font-mono">
                    {m.formulaCode}
                  </code>
                  <p className="text-[10px] text-[#667085] mt-1">{m.description}</p>
                </div>
              ))}
            </div>

            {/* Financial Disclaimers Notice */}
            <div className="p-4 rounded-xl bg-[#0D1322] text-slate-200 text-xs space-y-2">
              <div className="font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-[#38B449]" />
                <span>Authoritative Financial Safeguards &amp; Disclaimers</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                {report.disclaimers.map((d, idx) => (
                  <li key={idx}>{d}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Collapsible Consultant Audit Appendix */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded">
                  Consultant Registry
                </span>
                <h3 className="text-xs font-bold text-indigo-950">
                  Technical Calculation Audit &amp; Provenance Registry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditAppendix(!showAuditAppendix)}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
              >
                {showAuditAppendix ? "Hide Technical Registry" : "Show Technical Registry"}
              </button>
            </div>

            {showAuditAppendix && (
              <div className="space-y-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-indigo-200 rounded-lg bg-white">
                    <thead className="bg-indigo-100/70 text-indigo-950 font-bold border-b border-indigo-200">
                      <tr>
                        <th className="py-2 px-3">Metric Code</th>
                        <th className="py-2 px-3">Metric Label</th>
                        <th className="py-2 px-3 text-right">Raw Unrounded Value</th>
                        <th className="py-2 px-3 text-center">State</th>
                        <th className="py-2 px-3 text-center">Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-100 font-mono">
                      {Object.entries(report.auditAppendix?.computedMetricsRaw || {}).map(([key, item]: [string, any]) => (
                        <tr key={key} className="hover:bg-indigo-50/40">
                          <td className="py-1.5 px-3 text-indigo-900 font-semibold">{key}</td>
                          <td className="py-1.5 px-3 text-slate-700 font-sans">{item.label}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                            {item.value !== null && item.value !== undefined ? String(item.value) : "null"}
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] border ${getStateBadgeClass(item.state)}`}>
                              {item.state}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] border ${getProvenanceBadgeClass(item.provenance)}`}>
                              {item.provenance}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-indigo-900 pt-2">
                  <div>Snapshot ID: {snapshot.id}</div>
                  <div>Engine: v{snapshot.calculation_engine_version}</div>
                  <div>Assessment Ver: v{snapshot.assessment_version}</div>
                  <div>Calculated: {snapshot.calculated_at}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
