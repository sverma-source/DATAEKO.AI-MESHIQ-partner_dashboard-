import {
  CalculationRunResponse,
  Customer,
  Assessment,
} from "../types/assessment";
import {
  ExecutiveReportModel,
  ReportMetricItem,
  ReportProvenanceTier,
  ReportMetricEvaluationState,
} from "../types/report";

export class ReportDataAdapter {
  /**
   * Adapts an immutable calculation snapshot and assessment context into a clean,
   * presentation-ready ExecutiveReportModel without recalculating any business metrics.
   */
  public static adaptSnapshotToReport(params: {
    calculation: CalculationRunResponse;
    customer?: Customer | null;
    assessment?: Assessment | null;
    answers?: Record<string, any>;
    generatedAt?: string;
  }): ExecutiveReportModel {
    const { calculation, customer, assessment, answers = {}, generatedAt = new Date().toISOString() } = params;
    const summary = calculation.summary;
    const metrics = calculation.computed_metrics || {};

    // Helper: Map metric item safely from snapshot
    const mapMetricItem = (
      keys: string | string[],
      label: string,
      defaultProvenance: ReportProvenanceTier = "CALCULATED_RESULT",
      unit?: string,
      formatAsCurrency = false,
      decimals = 1
    ): ReportMetricItem => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      let metric: any = null;
      let val: any = undefined;

      for (const k of keyList) {
        if (metrics[k]) {
          metric = metrics[k];
          val = metric.value;
          break;
        }
        if ((summary as any)[k] !== undefined && (summary as any)[k] !== null) {
          val = (summary as any)[k];
          break;
        }
      }

      const state = (metric?.state || (val !== undefined && val !== null ? "VALID" : "NOT_MODELED")) as ReportMetricEvaluationState;
      const provenance = (metric?.provenance || defaultProvenance) as ReportProvenanceTier;

      let formattedValue = "—";
      if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
        const numVal = Number(val);
        if (formatAsCurrency) {
          formattedValue = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(numVal);
        } else {
          formattedValue = new Intl.NumberFormat("en-US", {
            maximumFractionDigits: decimals,
          }).format(numVal);
        }
      } else if (state === "NOT_MODELED") {
        formattedValue = "Not modeled";
      } else if (state === "INSUFFICIENT_DATA") {
        formattedValue = "Insufficient data";
      } else if (state === "NOT_APPLICABLE") {
        formattedValue = "Not applicable";
      }

      const getProvenanceLabel = (prov: string) => {
        switch (prov) {
          case "CUSTOMER_FACT":
          case "CUSTOMER_INPUT":
            return "Customer Fact";
          case "INDUSTRY_BENCHMARK":
          case "BENCHMARK_FALLBACK":
            return "Industry Benchmark";
          case "CALCULATED_RESULT":
          case "CALCULATED_METRIC":
          case "DETERMINISTIC_CALCULATION":
            return "Calculated Metric";
          case "SCENARIO_PROJECTION":
          case "ILLUSTRATIVE_SCENARIO":
            return "Illustrative Scenario";
          case "MODEL_ASSUMPTION":
          case "MODEL_BASELINE":
            return "Model Baseline";
          default:
            return "Model Data";
        }
      };

      const primaryKey = keyList[0];

      return {
        key: primaryKey,
        label,
        value: val !== undefined && val !== null ? val : null,
        formattedValue,
        unit,
        state,
        provenance,
        provenanceLabel: getProvenanceLabel(provenance),
        formulaCode: metric?.formula_code,
        interpretationNote: metric?.state_reason,
      };
    };

    // Loaded Hourly Rate (R_hr)
    const loadedRateMetric = mapMetricItem(
      ["loaded_hourly_rate", "internal_loaded_hourly_rate"],
      "Loaded Hourly Labor Rate",
      "MODEL_ASSUMPTION",
      "$/hour",
      true,
      2
    );

    // Q21 Customer-Reported Annual MQ Spend
    const snapshotQ21 = metrics.customer_reported_mq_spend;
    const q21IsSupplied = (snapshotQ21?.value !== null && snapshotQ21?.value !== undefined) ||
      (!answers.q21_is_unknown && answers.q21_annual_mq_spend !== undefined && answers.q21_annual_mq_spend !== null);
    const q21RawValue = snapshotQ21?.value !== undefined && snapshotQ21?.value !== null
      ? snapshotQ21.value
      : (q21IsSupplied ? answers.q21_annual_mq_spend : null);
    const q21State = snapshotQ21?.state || (q21IsSupplied ? "VALID" : "INSUFFICIENT_DATA");

    const q21Metric: ReportMetricItem = {
      key: "customer_reported_mq_spend",
      label: "Customer-Reported Annual MQ Spend",
      value: q21RawValue,
      formattedValue: q21RawValue !== null && !isNaN(Number(q21RawValue))
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(q21RawValue))
        : (q21State === "INSUFFICIENT_DATA" ? "Not provided" : "Not modeled"),
      unit: "$/year",
      state: q21State as ReportMetricEvaluationState,
      provenance: "CUSTOMER_FACT",
      provenanceLabel: "Customer Fact",
      interpretationNote: "Customer-disclosed expenditure preserved as an isolated customer fact; never synthesized or derived from operational labor.",
    };

    // 1. Operational Effort & Cost Metrics (Canonical E1 Keys First)
    const totalLaborCostMetric = mapMetricItem(
      ["total_quantified_labor_cost", "total_operational_labor_cost"],
      "Total Operational Labor Cost",
      "CALCULATED_RESULT",
      "$/year",
      true
    );
    const adminHoursMetric = mapMetricItem(
      ["annual_admin_hours", "routine_admin_annual_hours", "admin_annual_hours"],
      "Annual Administration Hours",
      "CALCULATED_RESULT",
      "hours/year",
      false,
      0
    );
    const adminCostMetric = mapMetricItem(
      ["annual_admin_labor_cost", "administrative_labor_cost", "admin_annual_cost"],
      "Annual Administration Labor Cost",
      "CALCULATED_RESULT",
      "$/year",
      true
    );
    const trbHoursMetric = mapMetricItem(
      ["annual_troubleshooting_hours", "troubleshooting_annual_hours"],
      "Annual Troubleshooting Hours",
      "CALCULATED_RESULT",
      "hours/year",
      false,
      0
    );
    const trbCostMetric = mapMetricItem(
      ["annual_troubleshooting_labor_cost", "troubleshooting_labor_cost", "troubleshooting_annual_cost"],
      "Annual Troubleshooting Labor Cost",
      "CALCULATED_RESULT",
      "$/year",
      true
    );
    const fteBurdenMetric = mapMetricItem(
      ["operational_fte_burden", "quantified_fte_burden"],
      "Operational FTE Burden",
      "CALCULATED_RESULT",
      "FTE",
      false,
      2
    );

    // 2. Business Exposure Metrics (Canonical E2 Keys First)
    const exposureMetric = mapMetricItem(
      ["potential_financial_exposure", "representative_single_event_exposure"],
      "Representative Single-Event Exposure",
      "CALCULATED_RESULT",
      "$/event",
      true
    );
    const durationMetric = mapMetricItem(
      ["representative_duration_hours"],
      "Representative Disruption Duration",
      "MODEL_ASSUMPTION",
      "hours",
      false,
      1
    );
    const rateImpactMetric = mapMetricItem(
      ["applicable_financial_rate", "hourly_downtime_rate"],
      "Applicable Financial Rate",
      "MODEL_ASSUMPTION",
      "$/hour",
      true
    );
    const isExposureBenchmark = exposureMetric.provenance === "BENCHMARK_FALLBACK" || exposureMetric.state === "INDUSTRY_BENCHMARK";

    // 3. Scenario Capacity & Value Metrics (Canonical E3 Keys First)
    const recHoursMetric = mapMetricItem(
      ["total_recovered_hours", "improvement_scenario_recoverable_total_hours", "total_recoverable_labor_hours"],
      "Total Recoverable Labor Hours",
      "SCENARIO_PROJECTION",
      "hours/year",
      false,
      0
    );
    const recAdminMetric = mapMetricItem(
      ["recovered_admin_hours", "improvement_scenario_recoverable_admin_hours"],
      "Recovered Routine Admin Hours",
      "SCENARIO_PROJECTION",
      "hours/year",
      false,
      0
    );
    const recTrbMetric = mapMetricItem(
      ["recovered_investigation_hours", "improvement_scenario_recoverable_troubleshooting_hours"],
      "Recovered Investigation Hours",
      "SCENARIO_PROJECTION",
      "hours/year",
      false,
      0
    );
    const recSavingsMetric = mapMetricItem(
      ["illustrative_economic_value", "improvement_scenario_economic_value", "illustrative_annual_labor_savings"],
      "Illustrative Economic Value",
      "SCENARIO_PROJECTION",
      "$/year",
      true
    );
    const trbOpportunityMetric = mapMetricItem(
      ["troubleshooting_productivity_opportunity", "troubleshooting_productivity_opportunity_cost"],
      "Troubleshooting Productivity Opportunity (10%)",
      "CALCULATED_RESULT",
      "$/year",
      true
    );

    const totalHoursMetric = mapMetricItem(
      ["total_operational_annual_hours", "total_operational_hours"],
      "Total Annual Operational Hours",
      "CALCULATED_RESULT",
      "hours/year",
      false,
      0
    );
    const totalHoursVal = typeof totalHoursMetric.value === "number"
      ? totalHoursMetric.value
      : (!isNaN(Number(totalHoursMetric.value)) && totalHoursMetric.value !== null ? Number(totalHoursMetric.value) : 0);

    // E4 Deterministic Executive Economic Narrative Construction
    const laborState = totalLaborCostMetric.state;
    const laborCostFormatted = totalLaborCostMetric.formattedValue;
    const fteFormatted = fteBurdenMetric.formattedValue;
    const laborStateReason = totalLaborCostMetric.interpretationNote;

    let operationalBurdenNarrative = "";
    if (laborState === "VALID") {
      operationalBurdenNarrative = `Quantified operational labor expenditure is currently modeled at ${laborCostFormatted}/year across routine queue administration and reactive bridge-call triage, representing ${fteFormatted} FTE of dedicated engineering capacity at loaded labor cost.`;
    } else if (laborState === "VALID_WITH_DEFAULTS") {
      operationalBurdenNarrative = `Quantified operational labor cost is modeled at ${laborCostFormatted}/year (${fteFormatted} FTE). This calculation incorporates model standard benchmark defaults ($180,000/yr loaded rate).`;
    } else if (laborState === "INSUFFICIENT_DATA") {
      operationalBurdenNarrative = `Quantified operational labor cost is currently incomplete. ${laborStateReason || "Requires both administration and troubleshooting inputs to finalize total labor expenditure."}`;
    } else {
      operationalBurdenNarrative = `Operational labor cost is not currently modeled. Baseline administration or troubleshooting inputs were unprovided in the assessment.`;
    }

    const exposureState = exposureMetric.state;
    const exposureFormatted = exposureMetric.formattedValue;
    const durationFormatted = durationMetric.formattedValue !== "—" ? `${durationMetric.formattedValue} hour` : "estimated";
    const rateImpactFormatted = rateImpactMetric.formattedValue !== "—" ? `${rateImpactMetric.formattedValue}/hr` : "applicable impact rate";
    const exposureStateReason = exposureMetric.interpretationNote;

    let exposureNarrative = "";
    if (exposureState === "VALID" || exposureState === "VALID_WITH_DEFAULTS") {
      exposureNarrative = `Representative single-event downtime exposure is modeled at ${exposureFormatted} per event based on an estimated ${durationFormatted} disruption at an applicable financial impact rate of ${rateImpactFormatted}. Modeled consequence of a single representative incident; not an annualized loss estimate.`;
    } else if (exposureState === "INSUFFICIENT_DATA") {
      exposureNarrative = `Single-event financial exposure is currently incomplete. ${exposureStateReason || "Requires representative disruption duration and business impact severity."}`;
    } else {
      exposureNarrative = `Single-event financial exposure is not currently modeled. Disruption duration (Q14) or impact severity (Q12) were unprovided.`;
    }

    const oppState = recSavingsMetric.state;
    const oppFormatted = recSavingsMetric.formattedValue;
    const recHoursFormatted = recHoursMetric.formattedValue;
    const oppStateReason = recSavingsMetric.interpretationNote;

    let opportunityNarrative = "";
    if (oppState === "VALID") {
      opportunityNarrative = `The controlled improvement scenario (50%×50% admin, 25% MTTR acceleration) models ${recHoursFormatted} recoverable engineering hours/year, corresponding to an illustrative capacity valuation of ${oppFormatted}/year. Illustrative operational capacity liberation; not guaranteed cash savings or fixed ROI.`;
    } else if (recAdminMetric.state === "VALID" && (recHoursMetric.state === "INSUFFICIENT_DATA" || oppState === "INSUFFICIENT_DATA")) {
      opportunityNarrative = `Scenario modeling captures ${recAdminMetric.formattedValue} recoverable routine admin hours/year. Total recoverable hours and illustrative value remain incomplete awaiting troubleshooting metrics.`;
    } else if (oppState === "INSUFFICIENT_DATA") {
      opportunityNarrative = `Recoverable opportunity is currently incomplete. ${oppStateReason || "Requires completed baseline administration and troubleshooting hours."}`;
    } else {
      opportunityNarrative = `Recoverable scenario opportunity is not currently modeled because baseline effort metrics are unprovided.`;
    }

    const evidenceSupports = [
      "Deterministic quantification of routine middleware maintenance and bridge calls.",
      "Loaded hourly engineering labor rate applied consistently across administrative streams.",
      "Controlled simulation of addressable administrative automation and triage acceleration.",
    ];

    const shouldNotBeInferred = [
      {
        title: "No Guaranteed Cash Savings",
        text: "Scenario valuations model liberated staff capacity, not cash reductions or staff reductions.",
      },
      {
        title: "No Annualized Exposure",
        text: "Single-event downtime figures model potential impact of a single major incident, not cumulative annual loss.",
      },
      {
        title: "No Vendor Recommendation",
        text: "Metrics provide mathematical baseline transparency without commercial endorsement.",
      },
    ];

    let modeledCount = 0;
    let incompleteCount = 0;
    let notModeledCount = 0;
    Object.values(metrics).forEach((m) => {
      if (m && (m.state === "VALID" || m.state === "VALID_WITH_DEFAULTS")) modeledCount++;
      else if (m && m.state === "INSUFFICIENT_DATA") incompleteCount++;
      else if (m && m.state === "NOT_MODELED") notModeledCount++;
    });

    const snapId = calculation.snapshot_id || (calculation as any).id || "IMMUTABLE";
    return {
      metadata: {
        reportId: `REP-${snapId.substring(0, 8).toUpperCase()}`,
        assessmentId: calculation.assessment_id || assessment?.id || "ass-current",
        snapshotId: snapId,
        calculationEngineVersion: calculation.calculation_engine_version || "1.0.0",
        assessmentVersion: calculation.assessment_version || "1.0.0",
        generatedAt,
        calculatedAt: calculation.calculated_at || generatedAt,
        title: "IBM MQ Economic Cost & Efficiency Assessment",
        subtitle: "Executive Customer Deliverable & Scenario Analysis",
        customerName: customer?.name || "Enterprise Customer",
        industry: customer?.industry || "Enterprise Infrastructure",
        confidentialityNotice: "CONFIDENTIAL • PREPARED EXCLUSIVELY FOR CLIENT EXECUTIVE LEADERSHIP • DATAEKO × MESHIQ",
      },

      executiveSummary: {
        totalOperationalLaborCost: totalLaborCostMetric,
        operationalFteBurden: fteBurdenMetric,
        representativeSingleEventExposure: exposureMetric,
        totalRecoverableLaborHours: recHoursMetric,
        illustrativeAnnualLaborSavings: recSavingsMetric,
        troubleshootingProductivityOpportunity: trbOpportunityMetric,
        customerReportedAnnualMqSpend: q21Metric,
        summaryNarrative: [
          operationalBurdenNarrative,
          exposureNarrative,
          opportunityNarrative,
        ],
        executiveNarrative: {
          operationalBurdenNarrative,
          exposureNarrative,
          opportunityNarrative,
          evidenceSupports,
          shouldNotBeInferred,
          completenessCounts: {
            modeledCount,
            incompleteCount,
            notModeledCount,
          },
        },
      },

      scopeAndEnvironment: {
        estateScale: {
          category: "Estate Scale",
          questionCode: "Q01",
          questionTitle: "Queue Manager Estate Scale",
          customerResponse: answers.q01_scale || "51–100 queue managers",
          interpretation: "Establishes physical environment footprint and estate complexity baseline.",
        },
        staffingResources: {
          category: "Staffing Resources",
          questionCode: "Q02",
          questionTitle: "Staffing & Administration Resources",
          customerResponse: answers.q02_staffing || "3–5 dedicated engineers",
          interpretation: "Primary engineering headcount allocated to middleware infrastructure operations.",
        },
        operationalModel: {
          category: "Operational Model",
          questionCode: "Q03",
          questionTitle: "Staffing & Operational Model",
          customerResponse: answers.q03_staffing_model || "Centralized middleware team",
          interpretation: "Organizational structure governing queue manager provisioning and bridge-call triage.",
        },
        adminTimeOverhead: {
          category: "Admin Overhead",
          questionCode: "Q04",
          questionTitle: "Quarterly Administration Time Overhead",
          customerResponse: answers.q04_admin_hours !== undefined && answers.q04_admin_hours !== null
            ? `${answers.q04_admin_hours} hours / quarter`
            : answers.q04_dropdown === "UNKNOWN" || answers.q04_dropdown === "Not sure"
            ? "Not sure"
            : answers.q04_dropdown || "Not provided",
          interpretation: "Direct quantitative input driving annual routine maintenance and queue configuration hours.",
        },
        techDebtInfrastructure: {
          category: "Technical Debt",
          questionCode: "Q05",
          questionTitle: "Older or Inactive Queue Managers",
          customerResponse: answers.q05_tech_debt || "Multiple legacy and unsupported versions in production",
          interpretation: "Qualitative indicator of maintenance friction and migration backlogs.",
        },
      },

      operationalEffort: {
        routineAdmin: {
          quarterlyHours: summary.admin_annual_hours !== undefined && summary.admin_annual_hours !== null
            ? summary.admin_annual_hours / 4
            : answers.q04_admin_hours !== undefined && answers.q04_admin_hours !== null
            ? answers.q04_admin_hours
            : null,
          annualHours: adminHoursMetric,
          annualCost: adminCostMetric,
          quarterlyDropdownValue: answers.q04_admin_hours !== undefined && answers.q04_admin_hours !== null
            ? `${answers.q04_admin_hours} hours / quarter`
            : answers.q04_dropdown === "UNKNOWN" || answers.q04_dropdown === "Not sure"
            ? "Not sure"
            : answers.q04_dropdown || "Not provided",
        },
        incidentTroubleshooting: {
          frequencyDropdown: answers.q06_frequency || "About weekly (52/yr)",
          frequencyAnnualEvents: 52,
          laborHoursPerIncidentDropdown: answers.q07_labor_hours || "3–5 hours (4.0 hrs)",
          laborHoursPerIncidentValue: 4.0,
          clockDurationDropdown: answers.q08_duration || "1–4 hours (Clock duration context only)",
          annualHours: trbHoursMetric,
          annualCost: trbCostMetric,
        },
        consolidated: {
          totalAnnualHours: totalHoursMetric,
          totalAnnualCost: totalLaborCostMetric,
          fteBurden: fteBurdenMetric,
          loadedHourlyRate: loadedRateMetric,
        },
      },

      businessExposure: {
        outageSeverityDropdown: answers.q12_business_impact || "Critical / Significant",
        recentExperienceDropdown: answers.q13_recent_disruptions || "1–2 major disruptions in past 12 months",
        disruptionDurationDropdown: answers.q14_disruption_duration || "46–90 minutes (1.13 hrs)",
        durationDecimalHours: 1.133,
        hourlyDowntimeRate: rateImpactMetric,
        representativeDurationHours: durationMetric,
        applicableFinancialRate: rateImpactMetric,
        isBenchmarkApplied: isExposureBenchmark,
        representativeSingleEventExposure: exposureMetric,
        exposureInterpretationNote: "Representative Single-Event Exposure represents the modeled downstream consequence of one single major outage event. It must not be interpreted or multiplied as an annualized loss estimate.",
      },

      customerAnnualSpend: {
        isSupplied: q21IsSupplied,
        spendMetric: q21Metric,
        isolationNote: "Customer-Reported Annual MQ Spend is preserved as an isolated customer fact. It is never synthesized from operational labor or used to calculate ROI.",
      },

      troubleshootingOpportunity: {
        troubleshootingCostBase: summary.troubleshooting_annual_cost || 0,
        opportunityPercentage: 10,
        opportunityMetric: trbOpportunityMetric,
        interpretationNote: "Troubleshooting Productivity Opportunity is computed strictly as 10% of annual troubleshooting labor cost (C_trb × 10%). It remains distinct from the 25% investigation improvement scenario.",
      },

      improvementScenario: {
        baselineTotalHours: totalHoursVal,
        addressableAdminSharePct: 50,
        adminEfficiencyImprovementPct: 50,
        investigationImprovementPct: 25,
        recoveredAdminHours: recAdminMetric,
        recoveredInvestigationHours: recTrbMetric,
        totalRecoverableHours: recHoursMetric,
        illustrativeEconomicValue: recSavingsMetric,
        retainedOperationalHours: 0,
        retainedOperationalCost: 0,
        scenarioDisclaimer: "The controlled improvement scenario models illustrative operational capacity liberation under standard meshIQ automation assumptions (50%×50% admin reduction, 25% investigation acceleration). It does not represent a guarantee of cash savings, commercial ROI, or contractual commitment.",
      },

      provenanceTable: [
        {
          category: "Customer Fact",
          definition: "Direct quantitative or categorical input verified by client during discovery interview.",
          examplesInReport: "Quarterly admin overhead (Q04), incident frequency (Q06), reported spend (Q21).",
        },
        {
          category: "Industry Benchmark",
          definition: "Authoritative external research figure applied under approved fallback business rules.",
          examplesInReport: "ITIC $300,000/hour downtime cost benchmark applied when Q15 is unsupplied and Q12 is Critical/Significant.",
        },
        {
          category: "Calculated Metric",
          definition: "Pure deterministic mathematical computation executed by the Phase 3 calculation engine.",
          examplesInReport: "Operational Labor Cost (C_total), FTE Burden, Single-Event Exposure.",
        },
        {
          category: "Model Baseline",
          definition: "Standard operational constants established by the economic assessment methodology.",
          examplesInReport: "Loaded hourly labor rate ($180,000/yr salary ÷ 2,080 hrs/yr = $86.54/hr), 10% troubleshooting opportunity rule.",
        },
        {
          category: "Illustrative Scenario",
          definition: "Hypothetical capacity liberation projected under approved improvement scenario parameters.",
          examplesInReport: "Total Recoverable Labor Hours (132 hrs), Illustrative Economic Value ($11,423/yr).",
        },
      ],

      governanceFindings: [
        {
          domain: "Estate Scale & Technical Debt",
          sourceQuestions: ["Q01", "Q05"],
          findingTitle: "Legacy Version Fragmentation",
          findingNarrative: `The queue manager estate (${answers.q01_scale || "51–100 QMGRs"}) exhibits technical debt (${answers.q05_tech_debt || "multiple legacy versions"}), driving repetitive manual configuration cycles.`,
          impactLevel: "Significant",
        },
        {
          domain: "Observability & Diagnostic Swivel-Chair",
          sourceQuestions: ["Q09", "Q10"],
          findingTitle: "Multi-Tool Diagnostic Blind Spots",
          findingNarrative: `Engineering teams utilize ${answers.q09_tools_count || "2–3 disparate monitoring tools"} with ${answers.q10_manual_tracing || "mostly manual cross-team log tracing"}, extending root-cause triage duration on bridge calls.`,
          impactLevel: "High",
        },
        {
          domain: "Governance & Remediation Friction",
          sourceQuestions: ["Q18", "Q19"],
          findingTitle: "Compliance & Patching Overhead",
          findingNarrative: `Active audit oversight (${answers.q18_audit_effort || "moderate pressure"}) paired with ${answers.q19_documentation_effort || "manual configuration friction"} restricts operational velocity during security patching.`,
          impactLevel: "Moderate",
        },
        {
          domain: "Modernization Mandate & Horizon",
          sourceQuestions: ["Q16", "Q17", "Q22"],
          findingTitle: "Near-Term Efficiency Mandate",
          findingNarrative: `Leadership maintains an active mandate (${answers.q16_cost_mandate || "OpEx reduction"}) targeting measurable demonstration of efficiency within ${answers.q22_migration_plans || "90–180 days"}.`,
          impactLevel: "Significant",
        },
      ],

      dataGaps: [
        {
          questionCode: "Q15",
          metricName: "Hourly Financial Cost of Downtime",
          state: isExposureBenchmark ? "INDUSTRY_BENCHMARK" : "VALID",
          gapReason: isExposureBenchmark ? "Customer specific hourly downtime impact not disclosed during intake discovery." : "Customer provided exact value.",
          modelingImplication: isExposureBenchmark ? "Applied ITIC $300,000/hour industry benchmark due to Critical/Significant disruption severity." : "Used customer fact.",
        },
        {
          questionCode: "Q21",
          metricName: "Customer-Reported Annual MQ Spend",
          state: q21IsSupplied ? "VALID" : "NOT_MODELED",
          gapReason: q21IsSupplied ? "Provided by customer." : "Customer elected not to disclose total MQ licensing and maintenance spend.",
          modelingImplication: q21IsSupplied ? "Preserved as isolated reference fact." : "Spend metric left unpopulated; zero assumption or labor derivation applied.",
        },
      ],

      methodology: [
        {
          title: "Annual Routine Administration",
          formulaCode: "H_admin = Q04 × 4",
          description: "Quarterly administration hours multiplied across four calendar quarters.",
          engineRuleVersion: "calc-rules-v1.0.0",
        },
        {
          title: "Annual Incident Troubleshooting Labor",
          formulaCode: "H_trb = F_annual × H_inv",
          description: "Annualized incident frequency multiplied by representative staff labor hours per investigation (Q07).",
          engineRuleVersion: "calc-rules-v1.0.0",
        },
        {
          title: "Internal Loaded Hourly Labor Rate",
          formulaCode: "R_hr = Q20 ÷ 2,080",
          description: "Fully loaded annual employee salary divided by 2,080 working hours per standard year.",
          engineRuleVersion: "calc-rules-v1.0.0",
        },
        {
          title: "Total Quantified Operational Labor Cost",
          formulaCode: "C_total = C_admin + C_trb",
          description: "Sum of administrative labor expenditure (H_admin × R_hr) and troubleshooting labor expenditure (H_trb × R_hr).",
          engineRuleVersion: "calc-rules-v1.0.0",
        },
        {
          title: "Representative Single-Event Exposure",
          formulaCode: "Exposure = D_hours × R_impact",
          description: "Modeled single disruption consequence: representative duration hours (Q14) multiplied by hourly downtime rate (Q15 or ITIC benchmark).",
          engineRuleVersion: "calc-rules-v1.0.0",
        },
        {
          title: "meshIQ Controlled Improvement Scenario",
          formulaCode: "H_rec = (H_admin × 50% × 50%) + (H_trb × 25%)",
          description: "Decomposed capacity recovery applying 50% addressability × 50% efficiency to admin and 25% MTTR acceleration to troubleshooting.",
          engineRuleVersion: "calc-rules-v1.0.0",
        },
      ],

      disclaimers: [
        "Representative Single-Event Exposure represents a single modeled outage consequence and must not be interpreted as an annualized loss estimate.",
        "Illustrative Economic Value represents the theoretical capacity value of liberated engineering hours and is not a guarantee of cash savings, commercial ROI, or contractual realization.",
        "Industry benchmarks (e.g. ITIC $300,000/hour downtime rate) are applied under strict business fallback rules when customer-specific figures are unavailable.",
        "Scenario projections are exploratory simulations and do not modify the official assessment baseline or historical calculation snapshots.",
        "All calculations are deterministically computed by the Phase 3 Headless Calculation Engine (v1.0.0) from immutable snapshot inputs.",
      ],

      auditAppendix: {
        computedMetricsRaw: calculation.computed_metrics,
        normalizedInputs: calculation.assumptions_used || {},
        assumptionsUsed: calculation.assumptions_used || {},
        benchmarksUsed: calculation.benchmarks_used || {},
      },
    };
  }
}

export function mapSnapshotToExecutiveReport(
  calculation: CalculationRunResponse,
  customer?: Customer | null,
  assessment?: Assessment | null,
  answers: Record<string, any> = {},
  generatedAt?: string
): ExecutiveReportModel {
  return ReportDataAdapter.adaptSnapshotToReport({
    calculation,
    customer,
    assessment,
    answers,
    generatedAt,
  });
}
