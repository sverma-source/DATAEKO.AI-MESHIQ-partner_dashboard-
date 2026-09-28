"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Info,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  ExecutiveReportModel,
  ReportMetricItem,
  ReportProvenanceTier,
  ReportMetricEvaluationState,
} from "../../types/report";
import { CalculationRunResponse, Customer, Assessment } from "../../types/assessment";
import { mapSnapshotToExecutiveReport } from "../../services/reportDataAdapter";

interface ExecutiveReportViewProps {
  calculation: CalculationRunResponse;
  customer?: Customer | null;
  assessment?: Assessment | null;
  answers?: Record<string, any>;
  onBack?: () => void;
}

export const ExecutiveReportView: React.FC<ExecutiveReportViewProps> = ({
  calculation,
  customer,
  assessment,
  answers = {},
  onBack,
}) => {
  const [showConsultantAppendix, setShowConsultantAppendix] = useState<boolean>(false);

  // Derive Report Model deterministically from Snapshot
  const report: ExecutiveReportModel = React.useMemo(() => {
    return mapSnapshotToExecutiveReport(calculation, customer, assessment, answers);
  }, [calculation, customer, assessment, answers]);

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

  const scopeList = [
    report.scopeAndEnvironment.estateScale,
    report.scopeAndEnvironment.staffingResources,
    report.scopeAndEnvironment.operationalModel,
    report.scopeAndEnvironment.adminTimeOverhead,
    report.scopeAndEnvironment.techDebtInfrastructure,
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:text-black">
      {/* Non-Printable Action Toolbar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Dashboard</span>
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Executive Customer Assessment Report
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic Presentation of Immutable Calculation Snapshot ({report.metadata.snapshotId ? report.metadata.snapshotId.substring(0, 8) : "Active"})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <label className="inline-flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={showConsultantAppendix}
                onChange={(e) => setShowConsultantAppendix(e.target.checked)}
                className="rounded text-[#008638] focus:ring-[#008638] h-3.5 w-3.5 cursor-pointer"
              />
              <span>Include Consultant Appendix</span>
            </label>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 rounded-lg bg-[#008638] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#006B2D] focus:outline-none focus:ring-2 focus:ring-[#008638] transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Document Container (A4 layout styling for print) */}
      <div className="max-w-5xl mx-auto my-6 p-6 sm:p-10 lg:p-12 bg-white shadow-lg rounded-2xl border border-slate-200 print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-none space-y-12">
        
        {/* ========================================================================= */}
        {/* SECTION 1: COVER PAGE / HEADER */}
        {/* ========================================================================= */}
        <section className="border-b-2 border-slate-900 pb-8 space-y-6 break-inside-avoid">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-[#172033]">DATAEKO</span>
                <span className="text-slate-400 font-light">×</span>
                <span className="text-xl font-extrabold tracking-tight text-[#38B449]">meshIQ</span>
              </div>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
                Enterprise Messaging Economic Assessment
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#0D1322] text-white">
                Executive Customer Report
              </span>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Report Version {report.metadata.assessmentVersion}
              </p>
            </div>
          </div>

          <div className="pt-4">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {report.metadata.title}
            </h1>
            <p className="text-lg font-semibold text-[#008638] mt-1">
              {report.metadata.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Customer Organization</span>
              <strong className="text-slate-900 text-sm">{report.metadata.customerName}</strong>
              <span className="text-slate-500 block">{report.metadata.industry}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Assessment Identifier</span>
              <strong className="text-slate-900">{report.metadata.assessmentId}</strong>
              <span className="text-slate-500 block">{report.metadata.reportId}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Assessment Date</span>
              <strong className="text-slate-900">{report.metadata.calculatedAt.substring(0, 10)}</strong>
              <span className="text-slate-500 block">Generated: {report.metadata.generatedAt.substring(0, 10)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Calculation Engine</span>
              <strong className="text-slate-900 font-mono">v{report.metadata.calculationEngineVersion}</strong>
              <span className="text-slate-500 block font-mono text-[10px]">
                Snap: {report.metadata.snapshotId ? report.metadata.snapshotId.substring(0, 8) : "N/A"}
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: EXECUTIVE SUMMARY */}
        {/* ========================================================================= */}
        <section className="space-y-6 break-inside-avoid">
          <div className="border-l-4 border-[#38B449] pl-4">
            <h2 className="text-xl font-bold text-slate-900">1. Executive Summary</h2>
            <p className="text-xs text-slate-500">
              Concise summary of quantified economic findings, baseline burden, and improvement potential.
            </p>
          </div>

          {/* Key Metric Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Operational Labor Cost */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Quantified Operational Labor
              </span>
              <div className="text-2xl font-black text-slate-900">
                {report.executiveSummary.totalOperationalLaborCost.formattedValue}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                <span>{report.operationalEffort.consolidated.totalAnnualHours.formattedValue} hrs/yr</span>
                <span className="font-semibold text-[#008638]">
                  {report.executiveSummary.operationalFteBurden.formattedValue} FTE
                </span>
              </div>
            </div>

            {/* Representative Single-Event Exposure */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Single-Event Exposure
              </span>
              <div className="text-2xl font-black text-amber-900">
                {report.executiveSummary.representativeSingleEventExposure.formattedValue}
              </div>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 flex items-center justify-between">
                <span>Representative Event</span>
                <span className="text-[10px] font-semibold uppercase text-amber-700">
                  {report.executiveSummary.representativeSingleEventExposure.provenanceLabel}
                </span>
              </div>
            </div>

            {/* Customer-Reported Annual MQ Spend */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Customer-Reported MQ Spend
              </span>
              <div className="text-2xl font-black text-slate-900">
                {report.executiveSummary.customerReportedAnnualMqSpend.formattedValue}
              </div>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 flex items-center justify-between">
                <span>Isolated Fact (Q21)</span>
                <span className="text-[10px] font-semibold uppercase text-[#008638]">
                  {report.executiveSummary.customerReportedAnnualMqSpend.provenanceLabel}
                </span>
              </div>
            </div>

            {/* Illustrative Economic Value (Scenario) */}
            <div className="p-4 rounded-xl bg-[#EEF8F0]/70 border border-[#A8E2B5] space-y-1.5">
              <span className="text-[11px] font-semibold text-[#008638] uppercase tracking-wider block">
                Illustrative Economic Value
              </span>
              <div className="text-2xl font-black text-[#0D1322]">
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

          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed space-y-2 text-xs sm:text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            {report.executiveSummary.summaryNarrative.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: ASSESSMENT SCOPE & ENVIRONMENT */}
        {/* ========================================================================= */}
        <section className="space-y-4 break-inside-avoid">
          <div className="border-l-4 border-[#38B449] pl-4">
            <h2 className="text-xl font-bold text-slate-900">2. Assessment Scope & Environment</h2>
            <p className="text-xs text-slate-500">
              Infrastructure profile, team capacity, and architectural context reported during the assessment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scopeList.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 font-mono">{item.questionCode}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold border bg-slate-100 text-slate-800 border-slate-300">
                    Customer Fact
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-1">{item.questionTitle}</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{item.customerResponse}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4 & 5: OPERATIONAL EFFORT & LABOR COST BREAKDOWN */}
        {/* ========================================================================= */}
        <section className="space-y-4 break-inside-avoid">
          <div className="border-l-4 border-[#38B449] pl-4">
            <h2 className="text-xl font-bold text-slate-900">3. Operational Effort & Labor Cost Breakdown</h2>
            <p className="text-xs text-slate-500">
              Decomposition of routine administration versus diagnostic troubleshooting based on the approved standard.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Workload Category</th>
                  <th className="py-2.5 px-3">Calculation Driver / Parameter</th>
                  <th className="py-2.5 px-3 text-right">Annual Hours</th>
                  <th className="py-2.5 px-3 text-right">FTE Equivalent</th>
                  <th className="py-2.5 px-3 text-right">Operational Labor Cost</th>
                  <th className="py-2.5 px-3 text-center">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Routine Administration */}
                <tr className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    Routine Administration
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Quarterly Admin: {report.operationalEffort.routineAdmin.quarterlyHours} hrs × 4
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Q04 Administrative Workload ({report.operationalEffort.routineAdmin.quarterlyDropdownValue})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {report.operationalEffort.routineAdmin.annualHours.formattedValue}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {(Number(report.operationalEffort.routineAdmin.annualHours.value || 0) / 2080).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {report.operationalEffort.routineAdmin.annualCost.formattedValue}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                      Calculated
                    </span>
                  </td>
                </tr>

                {/* Incident Troubleshooting */}
                <tr className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    Incident Troubleshooting
                    <span className="block text-[10px] text-slate-500 font-normal">
                      {report.operationalEffort.incidentTroubleshooting.frequencyAnnualEvents} events/yr × {report.operationalEffort.incidentTroubleshooting.laborHoursPerIncidentValue} staff hrs
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    Q06 Frequency × Q07 Staff Effort
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {report.operationalEffort.incidentTroubleshooting.annualHours.formattedValue}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {(Number(report.operationalEffort.incidentTroubleshooting.annualHours.value || 0) / 2080).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {report.operationalEffort.incidentTroubleshooting.annualCost.formattedValue}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                      Calculated
                    </span>
                  </td>
                </tr>

                {/* Total Operational Labor */}
                <tr className="bg-slate-100 font-bold">
                  <td className="py-2.5 px-3 text-slate-900">
                    Total Quantified Operational Labor
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                    Loaded Rate: {report.operationalEffort.consolidated.loadedHourlyRate.formattedValue}/hr ($180k / 2,080h)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-sm">
                    {report.operationalEffort.consolidated.totalAnnualHours.formattedValue}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-sm">
                    {report.operationalEffort.consolidated.fteBurden.formattedValue}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900 text-sm">
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

          <p className="text-[11px] text-slate-500 italic">
            Note: FTE Burden is calculated using the standard enterprise denominator of 2,080 working hours per full-time equivalent staff member per year.
          </p>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6 & 7: BUSINESS EXPOSURE & ISOLATED ANNUAL MQ SPEND */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
          {/* Representative Single-Event Exposure */}
          <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Representative Single-Event Exposure</span>
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getProvenanceBadgeClass(report.businessExposure.representativeSingleEventExposure.provenance)}`}>
                {report.businessExposure.representativeSingleEventExposure.provenanceLabel}
              </span>
            </div>

            <div className="text-2xl font-black text-amber-900">
              {report.businessExposure.representativeSingleEventExposure.formattedValue}
            </div>

            <div className="space-y-1 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-amber-200/60">
                <span className="text-slate-600">Disruption Duration:</span>
                <span className="font-semibold">{report.businessExposure.disruptionDurationDropdown}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-amber-200/60">
                <span className="text-slate-600">Financial Impact / Hour:</span>
                <span className="font-semibold">{report.businessExposure.hourlyDowntimeRate.formattedValue}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Exposure State:</span>
                <span className="font-mono text-[11px] font-semibold">{report.businessExposure.representativeSingleEventExposure.state}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/80 border border-amber-200 text-[11px] text-amber-900 leading-normal">
              <strong>Interpretation Safeguard:</strong> {report.businessExposure.exposureInterpretationNote}
            </div>
          </div>

          {/* Customer-Reported Annual MQ Spend (Q21) */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>Customer-Reported Annual MQ Spend</span>
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getProvenanceBadgeClass(report.customerAnnualSpend.spendMetric.provenance)}`}>
                {report.customerAnnualSpend.spendMetric.provenanceLabel}
              </span>
            </div>

            <div className="text-2xl font-black text-slate-900">
              {report.customerAnnualSpend.spendMetric.formattedValue}
            </div>

            <div className="space-y-1 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Data Source:</span>
                <span className="font-semibold">Question Q21 Discovery Input</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Semantic Classification:</span>
                <span className="font-semibold">Isolated Customer Fact</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">State:</span>
                <span className="font-mono text-[11px] font-semibold">{report.customerAnnualSpend.spendMetric.state}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 leading-normal">
              <strong>Isolation Rule:</strong> {report.customerAnnualSpend.isolationNote}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 8 & 9: PRODUCTIVITY OPPORTUNITY & CONTROLLED SCENARIO */}
        {/* ========================================================================= */}
        <section className="space-y-6 break-inside-avoid">
          <div className="border-l-4 border-indigo-600 pl-4">
            <h2 className="text-xl font-bold text-slate-900">4. Improvement Scenarios & Productivity Opportunity</h2>
            <p className="text-xs text-slate-500">
              Controlled exploratory models demonstrating potential capacity recovery and economic value.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Troubleshooting Productivity Opportunity (10% Rule) */}
            <div className="p-5 rounded-xl border border-[#A8E2B5] bg-[#EEF8F0]/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Troubleshooting Productivity Opportunity (10%)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#EEF8F0] text-[#008638] border border-[#A8E2B5]">
                  Calculated Metric
                </span>
              </div>

              <div className="text-2xl font-black text-slate-900">
                {report.troubleshootingOpportunity.opportunityMetric.formattedValue}
              </div>

              <p className="text-xs text-slate-600">
                Represents a 10% direct productivity recovery on quantified annual troubleshooting labor cost ({report.operationalEffort.incidentTroubleshooting.annualCost.formattedValue}).
              </p>

              <div className="p-2.5 rounded-lg bg-white/90 border border-[#A8E2B5] text-[11px] text-slate-800">
                <strong>Governance Rule:</strong> {report.troubleshootingOpportunity.interpretationNote}
              </div>
            </div>

            {/* Controlled Improvement Scenario (50% × 50% + 25%) */}
            <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">
                  meshIQ Controlled Improvement Scenario
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                  Illustrative Scenario
                </span>
              </div>

              <div className="text-2xl font-black text-indigo-900">
                {report.improvementScenario.illustrativeEconomicValue.formattedValue}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div className="p-2 rounded bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Recoverable Hours</span>
                  <strong className="text-indigo-900">{report.improvementScenario.totalRecoverableHours.formattedValue} hrs/yr</strong>
                </div>
                <div className="p-2 rounded bg-white border border-indigo-100">
                  <span className="text-[10px] text-slate-500 block">Baseline Admin Target</span>
                  <strong className="text-indigo-900">50% Addressable / 50% Eff.</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/90 border border-indigo-200 text-[11px] text-indigo-950">
                <strong>Disclaimer:</strong> {report.improvementScenario.scenarioDisclaimer}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 10: PROVENANCE TAXONOMY & CLASSIFICATION */}
        {/* ========================================================================= */}
        <section className="space-y-4 break-inside-avoid">
          <div className="border-l-4 border-slate-700 pl-4">
            <h2 className="text-xl font-bold text-slate-900">5. Data Provenance & Trust Classification</h2>
            <p className="text-xs text-slate-500">
              Clear categorization of customer-provided facts, deterministic metrics, external benchmarks, and scenario models.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Classification Tier</th>
                  <th className="py-2 px-3">Definition & Authority</th>
                  <th className="py-2 px-3">Example Metrics in this Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.provenanceTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        row.category === "Customer Fact"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : row.category === "Industry Benchmark"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : row.category === "Calculated Result"
                          ? "bg-[#EEF8F0] text-[#008638] border-[#A8E2B5]"
                          : row.category === "Model Assumption"
                          ? "bg-indigo-50 text-indigo-800 border-indigo-300"
                          : "bg-purple-50 text-purple-800 border-purple-300"
                      }`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-md">
                      {row.definition}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {row.examplesInReport}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 11: OPERATIONAL & GOVERNANCE FINDINGS */}
        {/* ========================================================================= */}
        <section className="space-y-4 break-inside-avoid">
          <div className="border-l-4 border-[#008638] pl-4">
            <h2 className="text-xl font-bold text-slate-900">6. Operational & Governance Findings</h2>
            <p className="text-xs text-slate-500">
              Qualitative assessment observations across architectural complexity, tooling friction, and governance obligations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.governanceFindings.map((f, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {f.domain}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {f.sourceQuestions.join(", ")}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  {f.findingTitle}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {f.findingNarrative}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 12: DATA GAPS & MODELING LIMITATIONS */}
        {/* ========================================================================= */}
        <section className="space-y-4 break-inside-avoid">
          <div className="border-l-4 border-amber-600 pl-4">
            <h2 className="text-xl font-bold text-slate-900">7. Data Gaps & Modeling Limitations</h2>
            <p className="text-xs text-slate-500">
              Explicit disclosure of unprovided inputs, fallback benchmarks, or unmodeled metrics to ensure transparency.
            </p>
          </div>

          {report.dataGaps.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                All standard quantitative parameters were supplied during intake. No default fallback assumptions or data gaps were required for this model.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {report.dataGaps.map((gap, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-amber-200 bg-amber-50/30 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{gap.metricName}</span>
                      <span className="font-mono text-[10px] text-slate-500">({gap.questionCode})</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${getStateBadgeClass(gap.state)}`}>
                        {gap.state}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{gap.modelingImplication}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 13 & 14: METHODOLOGY & FINANCIAL DISCLAIMERS */}
        {/* ========================================================================= */}
        <section className="space-y-6 break-inside-avoid border-t border-slate-200 pt-8">
          <div className="border-l-4 border-slate-800 pl-4">
            <h2 className="text-xl font-bold text-slate-900">8. Assessment Methodology & Financial Safeguards</h2>
            <p className="text-xs text-slate-500">
              Approved calculation formulas and formal interpretive disclaimers.
            </p>
          </div>

          {/* Methodology Formula Documentation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {report.methodology.map((m, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">{m.title}</span>
                <code className="text-[11px] text-slate-800 bg-white px-2 py-1 rounded block border border-slate-200 font-mono">
                  {m.formulaCode}
                </code>
                <p className="text-[10px] text-slate-500 mt-1">{m.description}</p>
              </div>
            ))}
          </div>

          {/* Legal / Financial Safeguards Notice */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-2">
            <div className="font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Important Financial Safeguards & Interpretive Disclaimers</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300">
              {report.disclaimers.map((d, idx) => (
                <li key={idx}>{d}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* OPTIONAL SECTION 15: CONSULTANT AUDIT APPENDIX */}
        {/* ========================================================================= */}
        {showConsultantAppendix && report.auditAppendix && (
          <section className="space-y-4 break-inside-avoid border-t-2 border-indigo-200 pt-8 bg-indigo-50/20 p-6 rounded-2xl">
            <div className="border-l-4 border-indigo-600 pl-4">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded">
                  Consultant Audit View
                </span>
                <h2 className="text-lg font-bold text-indigo-950">
                  Technical Calculation Audit & Metric Provenance Registry
                </h2>
              </div>
              <p className="text-xs text-indigo-700 mt-1">
                Internal metadata, rule identifiers, structured states, and raw precision metrics.
              </p>
            </div>

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
                  {Object.entries(report.auditAppendix.computedMetricsRaw || {}).map(([key, item]: [string, any]) => (
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
              <div>Snapshot ID: {report.metadata.snapshotId || "N/A"}</div>
              <div>Engine Ver: v{report.metadata.calculationEngineVersion}</div>
              <div>Report Ver: v{report.metadata.assessmentVersion}</div>
              <div>Timestamp: {report.metadata.calculatedAt}</div>
            </div>
          </section>
        )}

        {/* Report Footer Attribution */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <span>DATAEKO × meshIQ Enterprise Economic Assessment</span>
          <div className="flex items-center space-x-2 font-medium text-slate-600 tracking-tight">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">Powered by</span>
            <Image
              src="/dataeko-logo.png"
              alt="DATAEKO.AI"
              width={638}
              height={106}
              unoptimized
              className="h-5 sm:h-5.5 w-auto object-contain shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
