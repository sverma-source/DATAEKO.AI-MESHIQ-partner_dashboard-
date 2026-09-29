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
      { id: "cust-2", name: "Beta Corp", industry: "Technology" },
    ]),
    listAssessments: vi.fn().mockResolvedValue([]),
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
    submitAssessment: vi.fn().mockResolvedValue({ id: "ass-1", status: "SUBMITTED" }),
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
    expect(screen.getAllByAltText("DATAEKO.AI")[0]).toBeInTheDocument();
    expect(screen.getByAltText("meshIQ")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A. Environment & Cost Baseline" })).toBeInTheDocument();

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
      expect(screen.getByRole("heading", { name: "B. Troubleshooting Economics" })).toBeInTheDocument();
    });
    expect(screen.getByText("Troubleshooting & Incident Frequency")).toBeInTheDocument();

    // 4. Answer Q06
    const q06Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q06" });
    fireEvent.change(q06Select, { target: { value: "About weekly" } });

    // 5. Jump to Review Section
    const reviewTab = screen.getByRole("button", { name: /review & submit/i });
    fireEvent.click(reviewTab);

    await waitFor(() => {
      expect(screen.getByText("Ready to Submit Assessment")).toBeInTheDocument();
    });

    // 6. Submit assessment with confirmation modal
    const submitBtn = screen.getAllByRole("button", { name: /submit assessment/i })[0];
    fireEvent.click(submitBtn);

    // Verify confirmation modal appears
    expect(screen.getByRole("dialog", { name: /confirm assessment submission/i })).toBeInTheDocument();

    // Confirm submission in modal
    const confirmSubmitBtn = screen.getByRole("button", { name: /confirm & submit/i });
    fireEvent.click(confirmSubmitBtn);

    await waitFor(() => {
      expect(api.saveResponses).toHaveBeenCalled();
      expect(api.submitAssessment).toHaveBeenCalled();
      expect(screen.getByText("Assessment Submitted")).toBeInTheDocument();
      expect(screen.getByText("ASSESSMENT SUBMITTED & FINALIZED")).toBeInTheDocument();
    });
  });

  it("handles submission failure with accessible in-page alert, preserving responses and supporting retry", async () => {
    // Make save responses fail on first attempt
    (api.saveResponses as any).mockRejectedValueOnce(new Error("Submission network timeout"));

    render(<AssessmentWizardPage />);

    // Wait for customer data
    await waitFor(() => {
      expect(screen.getByText("Apex Financial")).toBeInTheDocument();
    });

    // 1. Answer Q01
    const q01Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q01" });
    fireEvent.change(q01Select, { target: { value: "51–100" } });

    // 2. Go to Review Section
    const reviewTab = screen.getByRole("button", { name: /review & submit/i });
    fireEvent.click(reviewTab);

    await waitFor(() => {
      expect(screen.getByText("Ready to Submit Assessment")).toBeInTheDocument();
    });

    // 3. Click Submit Assessment
    const submitBtn = screen.getAllByRole("button", { name: /submit assessment/i })[0];
    fireEvent.click(submitBtn);

    const confirmSubmitBtn = screen.getByRole("button", { name: /confirm & submit/i });
    fireEvent.click(confirmSubmitBtn);

    // 4. Verify submission error is rendered with role="alert" and aria-live="assertive"
    const alertElement = await screen.findByRole("alert");
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText(/Submission network timeout/i)).toBeInTheDocument();

    // 5. Verify responses were NOT destroyed
    expect(q01Select).toHaveValue("51–100");

    // 6. Verify Retry button is present and functional
    const retryBtn = screen.getByRole("button", { name: /retry submission/i });
    expect(retryBtn).toBeInTheDocument();

    // 7. Click Retry Submission
    fireEvent.click(retryBtn);

    // 8. Submission succeeds on retry
    await waitFor(() => {
      expect(api.saveResponses).toHaveBeenCalled();
    });
  });

  it("preserves responses when associating an anonymous draft with a customer", async () => {
    render(<AssessmentWizardPage />);

    // Wait for customer data to load
    await waitFor(() => {
      expect(screen.getByText("Apex Financial")).toBeInTheDocument();
    });

    // 1. Answer Q01 in anonymous draft mode (before any assessment is active)
    const q01Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q01" });
    fireEvent.change(q01Select, { target: { value: "51–100" } });
    expect(q01Select).toHaveValue("51–100");

    // 2. Open Customer modal and select customer
    const selectCustBtn = screen.getByRole("button", { name: /select customer/i });
    fireEvent.click(selectCustBtn);

    // Modal is open
    expect(screen.getByRole("dialog", { name: /start assessment discovery session/i })).toBeInTheDocument();

    // Confirm selection
    const confirmBtn = screen.getByRole("button", { name: /launch intake wizard/i });
    fireEvent.click(confirmBtn);

    // Assessment is created and Q01 value remains preserved
    await waitFor(() => {
      expect(api.createAssessment).toHaveBeenCalledWith({
        customer_id: "cust-1",
        title: expect.stringContaining("Assessment"),
      });
    });
    expect(screen.getByLabelText("Select Approved Response", { selector: "#select-Q01" })).toHaveValue("51–100");
  });

  it("prompts confirmation and resets responses when switching customer from an active assessment", async () => {
    (api.listCustomers as any).mockResolvedValue([
      { id: "cust-1", name: "Apex Financial", industry: "Banking" },
      { id: "cust-2", name: "Beta Corp", industry: "Technology" },
    ]);

    render(<AssessmentWizardPage />);

    // Wait for customer data to load
    await waitFor(() => {
      expect(screen.getByText("Apex Financial")).toBeInTheDocument();
    });

    // 1. Associate first customer
    const selectCustBtn = screen.getByRole("button", { name: /select customer/i });
    fireEvent.click(selectCustBtn);
    const confirmBtn = screen.getByRole("button", { name: /launch intake wizard/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /switch customer \/ assessment/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Active Customer:/i)).toBeInTheDocument();

    // 2. Enter response for Q01 under Active Customer A
    const q01Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q01" });
    fireEvent.change(q01Select, { target: { value: "101–250" } });
    expect(q01Select).toHaveValue("101–250");

    // 3. Click Switch Customer / Assessment
    const switchBtn = screen.getByRole("button", { name: /switch customer \/ assessment/i });
    fireEvent.click(switchBtn);

    // 4. Select Customer B in modal
    const custSelect = screen.getByLabelText(/select customer account/i);
    fireEvent.change(custSelect, { target: { value: "cust-2" } });
    const modalConfirmBtn = screen.getByRole("button", { name: /launch intake wizard/i });
    fireEvent.click(modalConfirmBtn);

    // 5. Verify confirmation dialog appears with accessible title and explanation
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /switch customer context & reset workspace\?/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/will isolate the new session and discard all current in-memory assessment responses/i)).toBeInTheDocument();

    // 6. Test Cancel button retains current assessment
    const cancelBtn = screen.getByRole("button", { name: /cancel customer switch/i });
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /switch customer context & reset workspace\?/i })).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Select Approved Response", { selector: "#select-Q01" })).toHaveValue("101–250");

    // 7. Open switch dialog again and confirm switch
    const switchBtnAgain = screen.getByRole("button", { name: /switch customer \/ assessment/i });
    fireEvent.click(switchBtnAgain);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /start assessment discovery session/i })).toBeInTheDocument();
    });
    const custSelectAgain = screen.getByLabelText(/select customer account/i);
    fireEvent.change(custSelectAgain, { target: { value: "cust-2" } });

    const modalConfirmBtnAgain = screen.getByRole("button", { name: /launch intake wizard/i });
    fireEvent.click(modalConfirmBtnAgain);

    const confirmSwitchBtn = await screen.findByRole("button", { name: /switch customer & start fresh/i });
    fireEvent.click(confirmSwitchBtn);

    // 8. Verify answers were reset for the fresh session
    await waitFor(() => {
      expect(api.createAssessment).toHaveBeenCalledWith({
        customer_id: "cust-2",
        title: expect.stringContaining("Assessment"),
      });
    });
    expect(screen.getByLabelText("Select Approved Response", { selector: "#select-Q01" })).toHaveValue("");
  });
});
