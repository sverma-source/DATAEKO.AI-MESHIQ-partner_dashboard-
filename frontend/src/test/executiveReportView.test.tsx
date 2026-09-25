import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExecutiveReportView } from "../components/report/ExecutiveReportView";
import { CalculationRunResponse } from "../types/assessment";

describe("Phase 7: ExecutiveReportView Component", () => {
  const sampleCalculation: CalculationRunResponse = {
    id: "snap-react-test-1",
    assessment_id: "ass-react-test-1",
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
      },
      routine_admin_annual_hours: {
        label: "Annual Routine Administration Hours",
        value: 192.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      troubleshooting_annual_frequency: {
        label: "Annual Troubleshooting Incidents",
        value: 52.0,
        unit: "COUNT",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
      },
      troubleshooting_staff_hours_per_investigation: {
        label: "Staff Effort Hours per Incident",
        value: 30.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
      },
      troubleshooting_annual_hours: {
        label: "Annual Incident Troubleshooting Hours",
        value: 1560.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      total_operational_annual_hours: {
        label: "Total Quantified Operational Hours",
        value: 1752.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      quantified_fte_burden: {
        label: "Quantified Operational Staff FTE Burden",
        value: 0.8423076923076923,
        unit: "FTE",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      administrative_labor_cost: {
        label: "Administrative Labor Cost",
        value: 16615.38,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      troubleshooting_labor_cost: {
        label: "Troubleshooting Labor Cost",
        value: 135000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      total_operational_labor_cost: {
        label: "Total Quantified Operational Labor Cost",
        value: 151615.38,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      representative_single_event_exposure: {
        label: "Representative Single-Event Exposure",
        value: 720000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
      },
      customer_reported_mq_spend: {
        label: "Customer-Reported Annual MQ Spend",
        value: 350000.0,
        unit: "USD",
        state: "VALID",
        provenance: "CUSTOMER_FACT",
      },
      troubleshooting_productivity_opportunity_cost: {
        label: "Troubleshooting Productivity Opportunity (10%)",
        value: 13500.0,
        unit: "USD",
        state: "VALID",
        provenance: "CALCULATED_METRIC",
      },
      improvement_scenario_recoverable_admin_hours: {
        label: "Recoverable Routine Administration Hours",
        value: 48.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "MODEL_BASELINE",
      },
      improvement_scenario_recoverable_troubleshooting_hours: {
        label: "Recoverable Troubleshooting Hours",
        value: 390.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "MODEL_BASELINE",
      },
      improvement_scenario_recoverable_total_hours: {
        label: "Total Recoverable Operational Hours",
        value: 438.0,
        unit: "HOURS",
        state: "VALID",
        provenance: "MODEL_BASELINE",
      },
      improvement_scenario_economic_value: {
        label: "Illustrative Economic Value",
        value: 37903.85,
        unit: "USD",
        state: "VALID",
        provenance: "ILLUSTRATIVE_SCENARIO",
      },
    },
  };

  it("renders all key executive report sections and terminology", () => {
    render(
      <ExecutiveReportView
        calculation={sampleCalculation}
        customer={{ id: "c1", name: "Global Wealth Corp", industry: "Banking", created_at: "", updated_at: "" }}
        assessment={{ id: "a1", customer_id: "c1", title: "MQ Enterprise Review", status: "COMPLETED", created_at: "", updated_at: "" }}
      />
    );

    // Cover Page / Header
    expect(screen.getByText("DATAEKO")).toBeInTheDocument();
    expect(screen.getByText("meshIQ")).toBeInTheDocument();
    expect(screen.getByText("Global Wealth Corp")).toBeInTheDocument();

    // Section 1: Executive Summary
    expect(screen.getByText("1. Executive Summary")).toBeInTheDocument();
    expect(screen.getAllByText("$151,615").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$720,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$350,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$37,904").length).toBeGreaterThanOrEqual(1);

    // Section 2: Scope & Environment
    expect(screen.getByText("2. Assessment Scope & Environment")).toBeInTheDocument();

    // Section 3: Operational Effort & Labor Cost
    expect(screen.getByText("3. Operational Effort & Labor Cost Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Routine Administration")).toBeInTheDocument();
    expect(screen.getByText("Incident Troubleshooting")).toBeInTheDocument();

    // Section 4: Improvement Scenarios
    expect(screen.getByText("4. Improvement Scenarios & Productivity Opportunity")).toBeInTheDocument();

    // Section 5: Provenance Classification
    expect(screen.getByText("5. Data Provenance & Trust Classification")).toBeInTheDocument();

    // Section 6: Governance Findings
    expect(screen.getByText("6. Operational & Governance Findings")).toBeInTheDocument();

    // Section 7: Data Gaps
    expect(screen.getByText("7. Data Gaps & Modeling Limitations")).toBeInTheDocument();

    // Section 8: Methodology & Disclaimers
    expect(screen.getByText("8. Assessment Methodology & Financial Safeguards")).toBeInTheDocument();
  });

  it("toggles consultant audit appendix when checkbox is selected", () => {
    render(
      <ExecutiveReportView
        calculation={sampleCalculation}
        customer={{ id: "c1", name: "Global Wealth Corp", industry: "Banking", created_at: "", updated_at: "" }}
      />
    );

    // Appendix initially hidden
    expect(screen.queryByText("Technical Calculation Audit & Metric Provenance Registry")).not.toBeInTheDocument();

    // Click checkbox to show appendix
    const toggle = screen.getByLabelText("Include Consultant Appendix");
    fireEvent.click(toggle);

    // Appendix is now visible
    expect(screen.getByText("Technical Calculation Audit & Metric Provenance Registry")).toBeInTheDocument();
  });
});
