export type ReportProvenanceTier =
  | "CUSTOMER_FACT"
  | "INDUSTRY_BENCHMARK"
  | "CALCULATED_RESULT"
  | "SCENARIO_PROJECTION"
  | "MODEL_ASSUMPTION"
  | "BENCHMARK_FALLBACK";

export type ReportMetricEvaluationState =
  | "VALID"
  | "VALID_WITH_DEFAULTS"
  | "INDUSTRY_BENCHMARK"
  | "INSUFFICIENT_DATA"
  | "NOT_MODELED"
  | "NOT_APPLICABLE";

export interface ReportMetricItem {
  key: string;
  label: string;
  value: number | string | null;
  formattedValue: string;
  unit?: string;
  state: ReportMetricEvaluationState;
  provenance: ReportProvenanceTier;
  provenanceLabel: string;
  formulaCode?: string;
  interpretationNote?: string;
}

export interface ReportScopeItem {
  category: string;
  questionCode: string;
  questionTitle: string;
  customerResponse: string;
  interpretation: string;
}

export interface ReportGovernanceFinding {
  domain: string;
  sourceQuestions: string[];
  findingTitle: string;
  findingNarrative: string;
  impactLevel: "Low" | "Moderate" | "Significant" | "High";
}

export interface ReportDataGapItem {
  questionCode: string;
  metricName: string;
  state: ReportMetricEvaluationState;
  gapReason: string;
  modelingImplication: string;
}

export interface ExecutiveReportModel {
  // 1. Report Metadata & Context
  metadata: {
    reportId: string;
    assessmentId: string;
    snapshotId: string;
    calculationEngineVersion: string;
    assessmentVersion: string;
    generatedAt: string;
    calculatedAt: string;
    title: string;
    subtitle: string;
    customerName: string;
    industry: string;
    confidentialityNotice: string;
  };

  // 2. Executive Summary Metrics
  executiveSummary: {
    totalOperationalLaborCost: ReportMetricItem;
    operationalFteBurden: ReportMetricItem;
    representativeSingleEventExposure: ReportMetricItem;
    totalRecoverableLaborHours: ReportMetricItem;
    illustrativeAnnualLaborSavings: ReportMetricItem;
    troubleshootingProductivityOpportunity: ReportMetricItem;
    customerReportedAnnualMqSpend: ReportMetricItem;
    summaryNarrative: string[];
    executiveNarrative?: {
      operationalBurdenNarrative: string;
      exposureNarrative: string;
      opportunityNarrative: string;
      evidenceSupports: string[];
      shouldNotBeInferred: Array<{ title: string; text: string }>;
      completenessCounts?: {
        modeledCount: number;
        incompleteCount: number;
        notModeledCount: number;
      };
    };
  };

  // 3. Assessment Scope & Environment (Q01–Q05)
  scopeAndEnvironment: {
    estateScale: ReportScopeItem;
    staffingResources: ReportScopeItem;
    operationalModel: ReportScopeItem;
    adminTimeOverhead: ReportScopeItem;
    techDebtInfrastructure: ReportScopeItem;
  };

  // 4. Operational Effort Breakdown
  operationalEffort: {
    routineAdmin: {
      quarterlyHours: number | null;
      annualHours: ReportMetricItem;
      annualCost: ReportMetricItem;
      quarterlyDropdownValue: string;
    };
    incidentTroubleshooting: {
      frequencyDropdown: string;
      frequencyAnnualEvents: number;
      laborHoursPerIncidentDropdown: string;
      laborHoursPerIncidentValue: number;
      clockDurationDropdown: string; // Q08 preserved as clock context only
      annualHours: ReportMetricItem;
      annualCost: ReportMetricItem;
    };
    consolidated: {
      totalAnnualHours: ReportMetricItem;
      totalAnnualCost: ReportMetricItem;
      fteBurden: ReportMetricItem;
      loadedHourlyRate: ReportMetricItem;
    };
  };

  // 5. Business Exposure (Q12–Q15)
  businessExposure: {
    outageSeverityDropdown: string;
    recentExperienceDropdown: string;
    disruptionDurationDropdown: string;
    durationDecimalHours: number;
    hourlyDowntimeRate: ReportMetricItem;
    representativeDurationHours?: ReportMetricItem;
    applicableFinancialRate?: ReportMetricItem;
    isBenchmarkApplied: boolean;
    representativeSingleEventExposure: ReportMetricItem;
    exposureInterpretationNote: string;
  };

  // 6. Customer-Reported Annual MQ Spend (Q21)
  customerAnnualSpend: {
    isSupplied: boolean;
    spendMetric: ReportMetricItem;
    isolationNote: string;
  };

  // 7. Troubleshooting Productivity Opportunity (10% Rule)
  troubleshootingOpportunity: {
    troubleshootingCostBase: number;
    opportunityPercentage: number; // 10%
    opportunityMetric: ReportMetricItem;
    interpretationNote: string;
  };

  // 8. Controlled Improvement Scenario (50% × 50% Admin, 25% MTTR)
  improvementScenario: {
    baselineTotalHours: number;
    addressableAdminSharePct: number; // 50%
    adminEfficiencyImprovementPct: number; // 50%
    investigationImprovementPct: number; // 25%
    recoveredAdminHours: ReportMetricItem;
    recoveredInvestigationHours: ReportMetricItem;
    totalRecoverableHours: ReportMetricItem;
    illustrativeEconomicValue: ReportMetricItem;
    retainedOperationalHours: number;
    retainedOperationalCost: number;
    scenarioDisclaimer: string;
  };

  // 9. Provenance Classification Reference Table
  provenanceTable: Array<{
    category: string;
    definition: string;
    examplesInReport: string;
  }>;

  // 10. Operational & Governance Findings (Q01–Q03, Q05, Q08–Q11, Q13, Q16–Q19, Q22)
  governanceFindings: ReportGovernanceFinding[];

  // 11. Data Gaps & Modeling Uncertainty Register
  dataGaps: ReportDataGapItem[];

  // 12. Methodology Documentation
  methodology: Array<{
    title: string;
    formulaCode: string;
    description: string;
    engineRuleVersion: string;
  }>;

  // 13. Disclaimers & Governance Notice
  disclaimers: string[];

  // 14. Optional Consultant / Audit Appendix Data
  auditAppendix?: {
    computedMetricsRaw: Record<string, any>;
    normalizedInputs: Record<string, any>;
    assumptionsUsed: Record<string, any>;
    benchmarksUsed: Record<string, any>;
  };
}
