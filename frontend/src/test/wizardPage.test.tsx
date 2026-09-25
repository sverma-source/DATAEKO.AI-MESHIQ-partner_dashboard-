import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AssessmentWizardPage from "../app/page";
import { api } from "../services/api";

// Mock API
vi.mock("../services/api", () => ({
  api: {
    checkHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      calculation_engine_version: "1.0.0",
      database: "ok",
    }),
    listCustomers: vi.fn().mockResolvedValue([
      { id: "cust-1", name: "Apex Financial", industry: "Banking" },
    ]),
    createCustomer: vi.fn().mockResolvedValue({
      id: "cust-new",
      name: "New Corp",
      industry: "Healthcare",
    }),
    createAssessment: vi.fn().mockResolvedValue({
      id: "ass-1",
      customer_id: "cust-1",
      title: "IBM MQ Assessment",
      status: "DRAFT",
      assessment_version: "1.0.0",
    }),
    saveResponses: vi.fn().mockResolvedValue({ id: "resp-1", assessment_id: "ass-1" }),
    calculateAssessment: vi.fn().mockResolvedValue({
      snapshot_id: "snap-1",
      assessment_id: "ass-1",
      calculation_engine_version: "1.0.0",
      assessment_version: "1.0.0",
      calculated_at: new Date().toISOString(),
      summary: {
        admin_annual_hours: 320,
        admin_annual_cost: 27692.31,
        troubleshooting_annual_hours: 208,
        troubleshooting_annual_cost: 18000,
        total_operational_labor_cost: 45692.31,
        operational_fte_burden: 0.25,
        representative_single_event_exposure: 825000,
        total_recoverable_labor_hours: 132,
        illustrative_annual_labor_savings: 11423.08,
        troubleshooting_productivity_opportunity: 1800,
      },
      computed_metrics: {
        total_quantified_labor_cost: {
          value: "45692.31",
          state: "VALID",
          provenance: "CALCULATED_RESULT",
          formula_code: "C_TOTAL = C_ADMIN + C_TRB",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
        },
      },
      assumptions_used: {},
      benchmarks_used: {},
      provenance_summary: {},
    }),
    getLatestSnapshot: vi.fn().mockResolvedValue(null),
  },
}));

describe("AssessmentWizardPage Full Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  it("renders the wizard page with section A questions", async () => {
    render(<AssessmentWizardPage />);

    // Header & Section info
    expect(screen.getByText("DATAEKO")).toBeInTheDocument();
    expect(screen.getByText("meshIQ")).toBeInTheDocument();
    expect(screen.getByText("A. Environment & Cost Baseline")).toBeInTheDocument();

    // Section A questions rendered
    expect(screen.getByText("Queue Manager Estate Scale")).toBeInTheDocument();
    expect(screen.getByText("Staffing & Administration Resources")).toBeInTheDocument();
    expect(screen.getByText("Staffing & Operational Model")).toBeInTheDocument();
    expect(screen.getByText("Quarterly Administration Time Overhead")).toBeInTheDocument();
    expect(screen.getByText("Retired Infrastructure & Technical Debt")).toBeInTheDocument();
  });

  it("allows answering questions, navigating sections, saving draft, and calculating", async () => {
    render(<AssessmentWizardPage />);

    // Wait for customer data to be resolved from API
    await waitFor(() => {
      expect(screen.getByText("Apex Financial")).toBeInTheDocument();
    });

    // 1. Answer Q01
    const q01Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q01" });
    fireEvent.change(q01Select, { target: { value: "51–100" } });

    // 2. Click Save Draft
    const saveDraftBtns = screen.getAllByRole("button", { name: /save/i });
    fireEvent.click(saveDraftBtns[0]);

    await waitFor(() => {
      expect(api.saveResponses).toHaveBeenCalled();
    });

    // 3. Navigate to Section B
    const nextBtn = screen.getByRole("button", { name: /next: section b/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText("B. Troubleshooting Economics")).toBeInTheDocument();
    });
    expect(screen.getByText("Troubleshooting & Incident Frequency")).toBeInTheDocument();

    // 4. Answer Q06
    const q06Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q06" });
    fireEvent.change(q06Select, { target: { value: "About weekly" } });

    // 5. Jump to Review Section
    const reviewTab = screen.getByRole("button", { name: /review & submit/i });
    fireEvent.click(reviewTab);

    await waitFor(() => {
      expect(screen.getByText("Ready for Engine Calculation")).toBeInTheDocument();
    });

    // 6. Submit for calculation
    const calcSubmitBtn = screen.getByRole("button", { name: /submit for calculation/i });
    fireEvent.click(calcSubmitBtn);

    await waitFor(() => {
      expect(api.calculateAssessment).toHaveBeenCalled();
      expect(screen.getByText("Assessment Economic Baseline & Scenario Results")).toBeInTheDocument();
      expect(screen.getByText("$45,692")).toBeInTheDocument();
    });
  });
});
