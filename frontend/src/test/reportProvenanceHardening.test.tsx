import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { mapSnapshotToExecutiveReport } from "../services/reportDataAdapter";
import { ExecutiveReportView } from "../components/report/ExecutiveReportView";
import { CalculationRunResponse, Customer, Assessment } from "../types/assessment";

describe("E5 — Executive Report & PDF Provenance Hardening", () => {
  const sampleCustomer: Customer = {
    id: "cust-01",
    name: "Acme Global Bank",
    industry: "Financial Services",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };

  const sampleAssessment: Assessment = {
    id: "ass-e5-001",
    customer_id: "cust-01",
    title: "IBM MQ Economic Cost Assessment",
    status: "COMPLETED",
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T12:00:00Z",
  };

  const sampleAnswers = {
    q01_scale: "LARGE",
    q04_dropdown: "MODERATE",
    q06_frequency: "WEEKLY",
    q07_labor_hours: "HIGH",
    q14_disruption_duration: "MODERATE",
    q15_hourly_cost_override: 10000,
    q21_annual_mq_spend: 350000,
  };

  const canonicalSnapshot: CalculationRunResponse = {
    id: "snap-canonical-999",
    assessment_id: "ass-e5-001",
    calculation_engine_version: "2.1.0",
    business_rulebook_version: "2026.2",
    calculated_at: "2026-09-30T10:00:00Z",
    summary: {
      total_quantified_labor_cost: 151615.38,
      annual_admin_labor_cost: 16615.38,
      annual_troubleshooting_labor_cost: 135000.0,
      loaded_hourly_rate: 86.54,
      operational_fte_burden: 0.84,
      potential_financial_exposure: 720000.0,
      illustrative_economic_value: 37903.85,
      total_recovered_hours: 438.0,
      troubleshooting_productivity_opportunity: 13500.0,
      total_operational_annual_hours: 1752.0,
    },
    computed_metrics: {
      // E1 canonical metrics
      total_quantified_labor_cost: {
        label: "Total Quantified Labor Cost",
        value: 151615.38,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "C_LABOR = C_ADMIN + C_TRB",
        rule_version: "2026.2",
      },
      annual_admin_labor_cost: {
        label: "Annual Admin Labor Cost",
        value: 16615.38,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "C_ADMIN = H_ADMIN * R_HR",
      },
      annual_troubleshooting_labor_cost: {
        label: "Annual Troubleshooting Labor Cost",
        value: 135000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "C_TRB = H_TRB * R_HR",
      },
      loaded_hourly_rate: {
        label: "Loaded Hourly Labor Rate",
        value: 86.54,
        unit: "USD_PER_HOUR",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "R_HR = L_ANNUAL / 2080",
      },
      operational_fte_burden: {
        label: "Operational FTE Burden",
        value: 0.84,
        unit: "FTE",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "FTE = (H_ADMIN + H_TRB) / 2080",
      },

      // E2 canonical metrics
      potential_financial_exposure: {
        label: "Potential Financial Exposure",
        value: 720000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
        formula_code: "EXPOSURE = DURATION * FINANCIAL_RATE",
        rule_version: "2026.2",
      },
      representative_duration_hours: {
        label: "Representative Disruption Duration",
        value: 4.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
      },
      applicable_financial_rate: {
        label: "Applicable Financial Rate",
        value: 180000.0,
        unit: "USD_PER_HOUR",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
      },

      // E3 canonical metrics
      recovered_admin_hours: {
        label: "Recovered Admin Hours",
        value: 48.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "ILLUSTRATIVE_SCENARIO",
        formula_code: "H_REC_ADMIN = H_ADMIN * 0.50 * 0.50",
      },
      recovered_investigation_hours: {
        label: "Recovered Investigation Hours",
        value: 390.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "ILLUSTRATIVE_SCENARIO",
        formula_code: "H_REC_TRB = H_TRB * 0.25",
      },
      total_recovered_hours: {
        label: "Total Recovered Hours",
        value: 438.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "ILLUSTRATIVE_SCENARIO",
        formula_code: "H_REC_TOTAL = H_REC_ADMIN + H_REC_TRB",
      },
      illustrative_economic_value: {
        label: "Illustrative Economic Value",
        value: 37903.85,
        unit: "USD",
        state: "VALID",
        provenance: "ILLUSTRATIVE_SCENARIO",
        formula_code: "V_ILLUSTRATIVE = H_REC_TOTAL * R_HR",
      },
      troubleshooting_productivity_opportunity: {
        label: "Troubleshooting Productivity Opportunity",
        value: 13500.0,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "OPP_TRB = C_TRB * 0.10",
      },

      // Hours metrics
      admin_annual_hours: {
        label: "Annual Routine Administration Hours",
        value: 192.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
      troubleshooting_annual_hours: {
        label: "Annual Troubleshooting Hours",
        value: 1560.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
      total_operational_annual_hours: {
        label: "Total Quantified Operational Hours",
        value: 1752.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
    },
  };

  it("1-5. Consumes canonical E1 metric keys directly", () => {
    const report = mapSnapshotToExecutiveReport(canonicalSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);

    expect(report.executiveSummary.totalOperationalLaborCost.value).toBe(151615.38);
    expect(report.operationalEffort.routineAdmin.annualCost.value).toBe(16615.38);
    expect(report.operationalEffort.incidentTroubleshooting.annualCost.value).toBe(135000.0);
    expect(report.operationalEffort.consolidated.loadedHourlyRate.value).toBe(86.54);
    expect(report.operationalEffort.consolidated.fteBurden.value).toBe(0.84);
  });

  it("6-8. Consumes canonical E2 metric keys directly", () => {
    const report = mapSnapshotToExecutiveReport(canonicalSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);

    expect(report.executiveSummary.representativeSingleEventExposure.value).toBe(720000.0);
    expect(report.businessExposure.representativeSingleEventExposure.value).toBe(720000.0);
    expect(report.businessExposure.representativeDurationHours?.value).toBe(4.0);
    expect(report.businessExposure.applicableFinancialRate?.value).toBe(180000.0);
  });

  it("9-13. Consumes canonical E3 metric keys directly", () => {
    const report = mapSnapshotToExecutiveReport(canonicalSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);

    expect(report.improvementScenario.recoveredAdminHours.value).toBe(48.0);
    expect(report.improvementScenario.recoveredInvestigationHours.value).toBe(390.0);
    expect(report.improvementScenario.totalRecoverableHours.value).toBe(438.0);
    expect(report.improvementScenario.illustrativeEconomicValue.value).toBe(37903.85);
    expect(report.troubleshootingOpportunity.opportunityMetric.value).toBe(13500.0);
  });

  it("14. No recovered-hours client multiplication exists", () => {
    // Modify the base hours without changing recovered hours in the snapshot to prove report doesn't calculate hours * 0.25
    const modifiedSnapshot: CalculationRunResponse = {
      ...canonicalSnapshot,
      computed_metrics: {
        ...canonicalSnapshot.computed_metrics,
        admin_annual_hours: {
          label: "Admin Hours",
          value: 1000.0, // 1000 * 0.25 would be 250, but snapshot has 48.0
          unit: "HOURS",
          state: "VALID",
          provenance: "CALCULATED_RESULT",
        },
        troubleshooting_annual_hours: {
          label: "Troubleshooting Hours",
          value: 2000.0, // 2000 * 0.25 would be 500, but snapshot has 390.0
          unit: "HOURS",
          state: "VALID",
          provenance: "CALCULATED_RESULT",
        },
        recovered_admin_hours: {
          label: "Recovered Admin Hours",
          value: 48.0,
          unit: "HOURS",
          state: "VALID",
          provenance: "ILLUSTRATIVE_SCENARIO",
        },
        recovered_investigation_hours: {
          label: "Recovered Investigation Hours",
          value: 390.0,
          unit: "HOURS",
          state: "VALID",
          provenance: "ILLUSTRATIVE_SCENARIO",
        },
      },
    };

    const report = mapSnapshotToExecutiveReport(modifiedSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    expect(report.improvementScenario.recoveredAdminHours.value).toBe(48.0);
    expect(report.improvementScenario.recoveredInvestigationHours.value).toBe(390.0);
  });

  it("15. No category FTE division by 2080 exists in presentation", () => {
    const { container } = render(
      <ExecutiveReportView
        calculation={canonicalSnapshot}
        customer={sampleCustomer}
        assessment={sampleAssessment}
        answers={sampleAnswers}
        userRole="PLATFORM_ADMIN"
      />
    );

    // Operational labor table: Category FTE columns should show dashes ("—"), not (192/2080 = 0.09) or (1560/2080 = 0.75)
    expect(container.textContent).not.toContain("0.09");
    expect(container.textContent).not.toContain("0.75");
    // Authoritative total FTE burden IS displayed
    expect(container.textContent).toContain("0.84 FTE");
  });

  it("16. No total-hours addition fallback exists", () => {
    // If total_operational_annual_hours is absent, it should NOT sum admin + troubleshooting hours
    const snapshotWithoutTotalHours: CalculationRunResponse = {
      ...canonicalSnapshot,
      computed_metrics: {
        ...canonicalSnapshot.computed_metrics,
        admin_annual_hours: { label: "Admin", value: 100.0, unit: "HOURS", state: "VALID", provenance: "CALCULATED_RESULT" },
        troubleshooting_annual_hours: { label: "Trb", value: 200.0, unit: "HOURS", state: "VALID", provenance: "CALCULATED_RESULT" },
        total_operational_annual_hours: undefined as any,
      },
      summary: {
        ...canonicalSnapshot.summary,
        total_operational_annual_hours: undefined,
        total_operational_hours: undefined,
      },
    };

    const report = mapSnapshotToExecutiveReport(snapshotWithoutTotalHours, sampleCustomer, sampleAssessment, sampleAnswers);
    // Value should NOT be 300 (100 + 200)
    expect(report.operationalEffort.consolidated.totalAnnualHours.value).not.toBe(300.0);
  });

  it("17. Legacy keys cannot override populated canonical metrics", () => {
    const conflictingSnapshot: CalculationRunResponse = {
      ...canonicalSnapshot,
      summary: {
        total_operational_labor_cost: 999999.0, // Legacy key with different value
        total_quantified_labor_cost: 151615.38, // Canonical key
      },
      computed_metrics: {
        ...canonicalSnapshot.computed_metrics,
        total_operational_labor_cost: {
          label: "Legacy Total Operational Cost",
          value: 999999.0,
          unit: "USD",
          state: "VALID",
          provenance: "CALCULATED_RESULT",
        },
        total_quantified_labor_cost: {
          label: "Canonical Total Quantified Labor Cost",
          value: 151615.38,
          unit: "USD",
          state: "VALID",
          provenance: "CALCULATED_RESULT",
        },
      },
    };

    const report = mapSnapshotToExecutiveReport(conflictingSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    expect(report.executiveSummary.totalOperationalLaborCost.value).toBe(151615.38);
    expect(report.executiveSummary.totalOperationalLaborCost.formattedValue).toBe("$151,615");
  });

  it("18-19. E4 narrative and boundary governance appear in report", () => {
    render(
      <ExecutiveReportView
        calculation={canonicalSnapshot}
        customer={sampleCustomer}
        assessment={sampleAssessment}
        answers={sampleAnswers}
        userRole="PLATFORM_ADMIN"
      />
    );

    // E4 Boundary Governance Card
    expect(screen.getByTestId("report-boundary-governance")).toBeInTheDocument();
    expect(screen.getByText("Executive Synthesis & Model Boundary Governance")).toBeInTheDocument();
    expect(screen.getByText("What the Assessment Evidence Supports:")).toBeInTheDocument();
    expect(screen.getByText("What Should NOT Be Inferred:")).toBeInTheDocument();
    expect(screen.getByText(/NO GUARANTEED CASH SAVINGS/i)).toBeInTheDocument();
    expect(screen.getByText(/NO ANNUALIZED EXPOSURE/i)).toBeInTheDocument();
    expect(screen.getByText(/NO VENDOR RECOMMENDATION/i)).toBeInTheDocument();
  });

  it("20-23. Correctly handles VALID, VALID_WITH_DEFAULTS, INSUFFICIENT_DATA, NOT_MODELED states", () => {
    // 20. VALID
    const validReport = mapSnapshotToExecutiveReport(canonicalSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    expect(validReport.executiveSummary.totalOperationalLaborCost.state).toBe("VALID");

    // 21. VALID_WITH_DEFAULTS
    const defaultSnapshot: CalculationRunResponse = {
      ...canonicalSnapshot,
      computed_metrics: {
        ...canonicalSnapshot.computed_metrics,
        potential_financial_exposure: {
          label: "Potential Exposure",
          value: 1200000.0,
          unit: "USD",
          state: "VALID_WITH_DEFAULTS",
          provenance: "INDUSTRY_BENCHMARK",
        },
      },
    };
    const defaultReport = mapSnapshotToExecutiveReport(defaultSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    expect(defaultReport.executiveSummary.representativeSingleEventExposure.state).toBe("VALID_WITH_DEFAULTS");

    // 22. INSUFFICIENT_DATA
    const insufficientSnapshot: CalculationRunResponse = {
      ...canonicalSnapshot,
      computed_metrics: {
        ...canonicalSnapshot.computed_metrics,
        potential_financial_exposure: {
          label: "Potential Exposure",
          value: null,
          unit: "USD",
          state: "INSUFFICIENT_DATA",
          provenance: "CUSTOMER_FACT",
        },
      },
    };
    const insufficientReport = mapSnapshotToExecutiveReport(insufficientSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    expect(insufficientReport.executiveSummary.representativeSingleEventExposure.state).toBe("INSUFFICIENT_DATA");
    expect(insufficientReport.executiveSummary.representativeSingleEventExposure.formattedValue).toBe("Insufficient data");

    // 23. NOT_MODELED
    const notModeledSnapshot: CalculationRunResponse = {
      ...canonicalSnapshot,
      computed_metrics: {
        ...canonicalSnapshot.computed_metrics,
        illustrative_economic_value: {
          label: "Illustrative Value",
          value: null,
          unit: "USD",
          state: "NOT_MODELED",
          provenance: "ILLUSTRATIVE_SCENARIO",
        },
      },
    };
    const notModeledReport = mapSnapshotToExecutiveReport(notModeledSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    expect(notModeledReport.executiveSummary.illustrativeAnnualLaborSavings.state).toBe("NOT_MODELED");
    expect(notModeledReport.executiveSummary.illustrativeAnnualLaborSavings.formattedValue).toBe("Not modeled");
  });

  it("24-25. Preserves provenance tiers and snapshot auditability metadata", () => {
    render(
      <ExecutiveReportView
        calculation={canonicalSnapshot}
        customer={sampleCustomer}
        assessment={sampleAssessment}
        answers={sampleAnswers}
        userRole="PLATFORM_ADMIN"
      />
    );

    // Auditability metadata
    expect(screen.getAllByText(/snap-can/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/v2.1.0/i).length).toBeGreaterThanOrEqual(1);

    const report = mapSnapshotToExecutiveReport(canonicalSnapshot, sampleCustomer, sampleAssessment, sampleAnswers);
    // Provenance tiers
    expect(report.executiveSummary.totalOperationalLaborCost.provenance).toBe("CALCULATED_RESULT");
    expect(report.executiveSummary.totalOperationalLaborCost.provenanceLabel).toBe("Calculated Metric");
    expect(report.businessExposure.representativeSingleEventExposure.provenance).toBe("CUSTOMER_FACT");
    expect(report.businessExposure.representativeSingleEventExposure.provenanceLabel).toBe("Customer Fact");
    expect(report.improvementScenario.illustrativeEconomicValue.provenance).toBe("ILLUSTRATIVE_SCENARIO");
    expect(report.improvementScenario.illustrativeEconomicValue.provenanceLabel).toBe("Illustrative Scenario");
  });

  it("26. Customer permissions: consultant-only audit sections remain protected", () => {
    // As CUSTOMER_USER, consultant audit appendix toggle button should NOT be rendered
    const { unmount } = render(
      <ExecutiveReportView
        calculation={canonicalSnapshot}
        customer={sampleCustomer}
        assessment={sampleAssessment}
        answers={sampleAnswers}
        userRole="CUSTOMER_USER"
      />
    );
    expect(screen.queryByText(/Include Consultant Appendix/i)).not.toBeInTheDocument();
    unmount();

    // As PLATFORM_ADMIN, consultant audit appendix toggle button is rendered
    render(
      <ExecutiveReportView
        calculation={canonicalSnapshot}
        customer={sampleCustomer}
        assessment={sampleAssessment}
        answers={sampleAnswers}
        userRole="PLATFORM_ADMIN"
      />
    );
    expect(screen.getByText(/Include Consultant Appendix/i)).toBeInTheDocument();
  });
});
