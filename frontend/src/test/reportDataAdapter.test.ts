import { describe, it, expect } from "vitest";
import { mapSnapshotToExecutiveReport } from "../services/reportDataAdapter";
import { CalculationRunResponse, Customer, Assessment } from "../types/assessment";
import fs from "fs";
import path from "path";

describe("Phase 7: Report Data Adapter & Financial Interpretation Safeguards", () => {
  const sampleSnapshot: CalculationRunResponse = {
    id: "snap-test-1234",
    assessment_id: "ass-test-5678",
    calculation_engine_version: "1.0.0",
    business_rulebook_version: "2026.1",
    calculated_at: "2026-09-25T12:00:00Z",
    summary: {
      administrative_labor_cost: 16615.38,
      troubleshooting_labor_cost: 135000.0,
      total_operational_labor_cost: 151615.38,
      representative_single_event_exposure: 720000.0,
      customer_reported_mq_spend: 350000.0,
      troubleshooting_productivity_opportunity_cost: 13500.0,
      improvement_scenario_cost: 37903.85,
    },
    computed_metrics: {
      routine_admin_quarterly_hours: {
        label: "Quarterly Routine Administration Hours",
        value: 48.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
        formula_code: "F01_ADMIN_QUARTERLY_HOURS",
      },
      routine_admin_annual_hours: {
        label: "Annual Routine Administration Hours",
        value: 192.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F02_ADMIN_ANNUAL_HOURS",
      },
      troubleshooting_annual_frequency: {
        label: "Annual Troubleshooting Incidents",
        value: 52.0,
        unit: "COUNT",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
        formula_code: "F04_TRB_ANNUAL_FREQUENCY",
      },
      troubleshooting_staff_hours_per_investigation: {
        label: "Staff Effort Hours per Incident",
        value: 30.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
        formula_code: "F05_TRB_STAFF_HOURS_PER_INCIDENT",
      },
      troubleshooting_annual_hours: {
        label: "Annual Incident Troubleshooting Hours",
        value: 1560.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F06_TRB_ANNUAL_HOURS",
      },
      total_operational_annual_hours: {
        label: "Total Quantified Operational Hours",
        value: 1752.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F07_TOTAL_OPERATIONAL_HOURS",
      },
      internal_loaded_hourly_rate: {
        label: "Internal Loaded Hourly Labor Rate",
        value: 86.53846153846154,
        unit: "USD_PER_HOUR",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F08_LOADED_HOURLY_RATE",
      },
      quantified_fte_burden: {
        label: "Quantified Operational Staff FTE Burden",
        value: 0.8423076923076923,
        unit: "FTE",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F09_FTE_BURDEN",
      },
      administrative_labor_cost: {
        label: "Administrative Labor Cost",
        value: 16615.384615384617,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F10_ADMIN_LABOR_COST",
      },
      troubleshooting_labor_cost: {
        label: "Troubleshooting Labor Cost",
        value: 135000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F11_TRB_LABOR_COST",
      },
      total_operational_labor_cost: {
        label: "Total Quantified Operational Labor Cost",
        value: 151615.3846153846,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F12_TOTAL_OPERATIONAL_LABOR_COST",
      },
      representative_single_event_exposure: {
        label: "Representative Single-Event Exposure",
        value: 720000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
        formula_code: "F13_REPRESENTATIVE_EXPOSURE",
      },
      customer_reported_mq_spend: {
        label: "Customer-Reported Annual MQ Spend",
        value: 350000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
        formula_code: "F14_CUSTOMER_REPORTED_MQ_SPEND",
      },
      troubleshooting_productivity_opportunity_cost: {
        label: "Troubleshooting Productivity Opportunity (10%)",
        value: 13500.0,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
        formula_code: "F15_TRB_PRODUCTIVITY_OPPORTUNITY",
      },
      improvement_scenario_recoverable_admin_hours: {
        label: "Recoverable Routine Administration Hours",
        value: 48.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "MODEL_BASELINE",
        formula_code: "F16_SCENARIO_ADMIN_HOURS",
      },
      improvement_scenario_recoverable_troubleshooting_hours: {
        label: "Recoverable Troubleshooting Hours",
        value: 390.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "MODEL_BASELINE",
        formula_code: "F17_SCENARIO_TRB_HOURS",
      },
      improvement_scenario_recoverable_total_hours: {
        label: "Total Recoverable Operational Hours",
        value: 438.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "MODEL_BASELINE",
        formula_code: "F18_SCENARIO_TOTAL_HOURS",
      },
      improvement_scenario_economic_value: {
        label: "Illustrative Economic Value",
        value: 37903.84615384615,
        unit: "USD",
        state: "VALID",
        provenance: "ILLUSTRATIVE_SCENARIO",
        formula_code: "F19_SCENARIO_ECONOMIC_VALUE",
      },
    },
  };

  const sampleCustomer: Customer = {
    id: "cust-01",
    name: "Acme Financial Corp",
    industry: "Banking",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };

  const sampleAssessment: Assessment = {
    id: "ass-test-5678",
    customer_id: "cust-01",
    title: "IBM MQ Economic Cost & Efficiency Assessment",
    status: "COMPLETED",
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T12:00:00Z",
  };

  const sampleAnswers = {
    q01_scale: "LARGE",
    q02_staffing: "LARGE",
    q03_staffing_model: "CENTRALIZED",
    q04_dropdown: "MODERATE",
    q06_frequency: "WEEKLY",
    q07_labor_hours: "HIGH",
    q14_disruption_duration: "MODERATE",
    q15_is_unknown: false,
    q15_hourly_cost_override: 10000,
    q21_is_unknown: false,
    q21_annual_mq_spend: 350000,
  };

  it("1. Determinism: produces identical report models given the same calculation snapshot", () => {
    const report1 = mapSnapshotToExecutiveReport(sampleSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    const report2 = mapSnapshotToExecutiveReport(sampleSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);

    expect(report1.executiveSummary.totalOperationalLaborCost.formattedValue).toEqual(
      report2.executiveSummary.totalOperationalLaborCost.formattedValue
    );
    expect(report1.executiveSummary.representativeSingleEventExposure.formattedValue).toEqual(
      report2.executiveSummary.representativeSingleEventExposure.formattedValue
    );
    expect(report1.executiveSummary.illustrativeAnnualLaborSavings.formattedValue).toEqual(
      report2.executiveSummary.illustrativeAnnualLaborSavings.formattedValue
    );
  });

  it("2. No recalculation: consumes snapshot values without independent recalculation", () => {
    const report = mapSnapshotToExecutiveReport(sampleSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);

    // Operational labor cost matches snapshot value ($151,615)
    expect(report.executiveSummary.totalOperationalLaborCost.value).toBe(151615.3846153846);
    expect(report.executiveSummary.totalOperationalLaborCost.formattedValue).toBe("$151,615");

    // Routine admin hours match snapshot value (192 hrs)
    expect(report.operationalEffort.routineAdmin.annualHours.value).toBe(192.0);
    expect(report.operationalEffort.routineAdmin.annualHours.formattedValue).toBe("192");
  });

  it("3. Terminology Safeguards: forbids 'Annual Loss' and 'Guaranteed Savings'", () => {
    const report = mapSnapshotToExecutiveReport(sampleSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    const jsonString = JSON.stringify(report);

    expect(jsonString).not.toContain("Annual Loss");
    expect(jsonString).not.toContain("Annual Financial Loss");
    expect(jsonString).not.toContain("Guaranteed Savings");
    expect(jsonString).not.toContain("Guaranteed ROI");

    // Correct terminology present
    expect(report.businessExposure.representativeSingleEventExposure.label).toBe("Representative Single-Event Exposure");
    expect(report.improvementScenario.illustrativeEconomicValue.label).toBe("Illustrative Economic Value");
    expect(report.customerAnnualSpend.spendMetric.label).toBe("Customer-Reported Annual MQ Spend");
  });

  it("4. Structured state preservation: renders unavailable states cleanly and never as misleading $0", () => {
    const unmodeledSnapshot: CalculationRunResponse = {
      ...sampleSnapshot,
      computed_metrics: {
        ...sampleSnapshot.computed_metrics,
        representative_single_event_exposure: {
          label: "Representative Single-Event Exposure",
          value: null,
          unit: "USD",
          state: "NOT_MODELED",
          provenance: "BENCHMARK_FALLBACK",
        },
        customer_reported_mq_spend: {
          label: "Customer-Reported Annual MQ Spend",
          value: null,
          unit: "USD",
          state: "INSUFFICIENT_DATA",
          provenance: "CUSTOMER_FACT",
        },
      },
    };

    const report = mapSnapshotToExecutiveReport(unmodeledSnapshot, sampleCustomer, sampleAssessment, {
      ...sampleAnswers,
      q15_is_unknown: true,
      q21_is_unknown: true,
      q21_annual_mq_spend: undefined,
    });

    expect(report.businessExposure.representativeSingleEventExposure.state).toBe("NOT_MODELED");
    expect(report.businessExposure.representativeSingleEventExposure.formattedValue).toBe("Not modeled");
    expect(report.businessExposure.representativeSingleEventExposure.formattedValue).not.toBe("$0");

    expect(report.customerAnnualSpend.spendMetric.state).toBe("INSUFFICIENT_DATA");
    expect(report.customerAnnualSpend.spendMetric.formattedValue).toBe("Not provided");
    expect(report.customerAnnualSpend.spendMetric.formattedValue).not.toBe("$0");
  });

  it("5. Q21 Spend Isolation: remains separate and is not added to operational labor or scenario benefits", () => {
    const report = mapSnapshotToExecutiveReport(sampleSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);

    expect(report.customerAnnualSpend.spendMetric.value).toBe(350000);
    expect(report.customerAnnualSpend.spendMetric.provenance).toBe("CUSTOMER_FACT");
    expect(report.customerAnnualSpend.spendMetric.provenanceLabel).toBe("Customer Fact");

    // Total labor cost remains $151,615 (does NOT add $350k)
    expect(report.executiveSummary.totalOperationalLaborCost.formattedValue).toBe("$151,615");
  });

  it("6. Scenario vs Baseline Separation: separates 10% Troubleshooting Productivity from 25% meshIQ Scenario", () => {
    const report = mapSnapshotToExecutiveReport(sampleSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);

    // 10% Productivity Opportunity
    expect(report.troubleshootingOpportunity.opportunityMetric.value).toBe(13500.0);
    expect(report.troubleshootingOpportunity.opportunityMetric.formattedValue).toBe("$13,500");
    expect(report.troubleshootingOpportunity.opportunityMetric.provenanceLabel).toBe("Calculated Metric");

    // meshIQ Scenario (50% x 50% admin + 25% trb)
    expect(report.improvementScenario.illustrativeEconomicValue.value).toBe(37903.84615384615);
    expect(report.improvementScenario.illustrativeEconomicValue.formattedValue).toBe("$37,904");
    expect(report.improvementScenario.illustrativeEconomicValue.provenanceLabel).toBe("Illustrative Scenario");
  });

  it("7. PDF smoke test: verifies generated PDF artifact exists and has non-zero size", () => {
    const pdfPath = path.resolve(__dirname, "../../../docs/artifacts/DATAEKO_meshIQ_Executive_Assessment_Report.pdf");
    expect(fs.existsSync(pdfPath)).toBe(true);
    const stats = fs.statSync(pdfPath);
    expect(stats.size).toBeGreaterThan(50000); // Greater than 50 KB
  });
});
