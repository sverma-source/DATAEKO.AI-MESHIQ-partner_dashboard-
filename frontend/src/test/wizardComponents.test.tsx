import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardHeader } from "../components/WizardHeader";
import { SectionNavigation } from "../components/SectionNavigation";
import { QuestionCard } from "../components/QuestionCard";
import { ReviewSummary } from "../components/ReviewSummary";
import { CalculationStatusView } from "../components/CalculationStatusView";
import { QUESTIONS, SECTIONS } from "../data/questionCatalog";
import { CalculationRunResponse } from "../types/assessment";

import { CustomerModal } from "../components/CustomerModal";

describe("WizardHeader Component", () => {
  it("renders section info and progress percentage accurately", () => {
    const handleSave = vi.fn();
    render(
      <WizardHeader
        currentSection={SECTIONS[0]}
        currentSectionIndex={1}
        totalSections={7}
        answeredCount={11}
        totalQuestions={22}
        saveStatus="saved"
        onSave={handleSave}
        isSaving={false}
      />
    );

    expect(screen.getByText("Section A of 7")).toBeInTheDocument();
    expect(screen.getByText("11 of 22 Questions Answered")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Progress saved")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /save progress/i });
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it("renders Draft initialized state distinctly on brand new assessments", () => {
    render(
      <WizardHeader
        currentSection={SECTIONS[0]}
        currentSectionIndex={1}
        totalSections={7}
        answeredCount={0}
        totalQuestions={22}
        saveStatus="initialized"
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByText("Draft initialized")).toBeInTheDocument();
  });

  it("renders Unsaved changes state when responses are modified", () => {
    render(
      <WizardHeader
        currentSection={SECTIONS[0]}
        currentSectionIndex={1}
        totalSections={7}
        answeredCount={2}
        totalQuestions={22}
        saveStatus="unsaved"
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("renders Saving... indicator during active persistence", () => {
    render(
      <WizardHeader
        currentSection={SECTIONS[0]}
        currentSectionIndex={1}
        totalSections={7}
        answeredCount={2}
        totalQuestions={22}
        saveStatus="saving"
        onSave={vi.fn()}
        isSaving={true}
      />
    );

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
});

describe("SectionNavigation Component", () => {
  it("renders all 7 canonical section titles plus review tab and triggers section selection", () => {
    const handleSelect = vi.fn();
    render(
      <SectionNavigation
        sections={SECTIONS}
        currentSectionId="A"
        onSelectSection={handleSelect}
        answers={{}}
        questionsMap={QUESTIONS}
      />
    );

    expect(screen.getByText("A. Environment & Cost Baseline")).toBeInTheDocument();
    expect(screen.getByText("B. Troubleshooting Economics")).toBeInTheDocument();
    expect(screen.getByText("C. Operational Complexity & Productivity")).toBeInTheDocument();
    expect(screen.getByText("D. Business Consequence & Financial Exposure")).toBeInTheDocument();
    expect(screen.getByText("E. Cost Reduction & Organizational Pressure")).toBeInTheDocument();
    expect(screen.getByText("F. Cybersecurity & Remediation")).toBeInTheDocument();
    expect(screen.getByText("G. Economic Inputs & Timing")).toBeInTheDocument();
    expect(screen.getByText("Review & Submit")).toBeInTheDocument();

    const secBBtn = screen.getByRole("button", { name: /b\. troubleshooting economics/i });
    fireEvent.click(secBBtn);
    expect(handleSelect).toHaveBeenCalledWith("B");
  });

  it("exposes aria-current='step' and descriptive accessible labels for sections", () => {
    render(
      <SectionNavigation
        sections={SECTIONS}
        currentSectionId="B"
        onSelectSection={vi.fn()}
        answers={{ q01_queue_managers: "51–100", q02_fte_count: "2–4 FTEs" }}
        questionsMap={QUESTIONS}
      />
    );

    const activeSecB = screen.getByRole("button", { name: /b\. troubleshooting economics/i });
    expect(activeSecB).toHaveAttribute("aria-current", "step");

    const secA = screen.getByRole("button", { name: /a\. environment & cost baseline/i });
    expect(secA).not.toHaveAttribute("aria-current");
    expect(secA).toHaveAttribute("aria-label", expect.stringContaining("questions answered"));
  });
});

describe("QuestionCard Component", () => {
  it("renders dropdown and supports selecting options", () => {
    const handleSelect = vi.fn();
    const handleOverride = vi.fn();

    render(
      <QuestionCard
        question={QUESTIONS.Q06}
        selectedValue="About weekly"
        onSelectOption={handleSelect}
        onOverrideChange={handleOverride}
      />
    );

    expect(screen.getByText("Q06")).toBeInTheDocument();
    expect(screen.getByText(QUESTIONS.Q06.title)).toBeInTheDocument();
    expect(screen.getByText("Feeds Calculation")).toBeInTheDocument();

    const selectEl = screen.getByLabelText("Select Approved Response");
    fireEvent.change(selectEl, { target: { value: "Multiple times per month" } });
    expect(handleSelect).toHaveBeenCalledWith("Multiple times per month");
  });

  it("renders numeric override when allowed and toggled", () => {
    const handleSelect = vi.fn();
    const handleOverride = vi.fn();

    render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="40–100 hours"
        overrideValue={80}
        onSelectOption={handleSelect}
        onOverrideChange={handleOverride}
      />
    );

    expect(screen.getByLabelText("Exact Quarterly Administration Hours")).toBeInTheDocument();
    const inputEl = screen.getByLabelText("Exact Quarterly Administration Hours");
    expect(inputEl).toHaveValue(80);

    fireEvent.change(inputEl, { target: { value: "95" } });
    expect(handleOverride).toHaveBeenCalledWith(95);
  });

  it("blurs number input on mouse wheel to prevent accidental scroll changes", () => {
    render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="40–100 hours"
        overrideValue={80}
        onSelectOption={vi.fn()}
        onOverrideChange={vi.fn()}
      />
    );

    const inputEl = screen.getByLabelText("Exact Quarterly Administration Hours");
    const blurSpy = vi.spyOn(inputEl, "blur");

    fireEvent.wheel(inputEl);
    expect(blurSpy).toHaveBeenCalled();
  });

  it("associates validation error with input via aria-invalid and aria-describedby", () => {
    render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="40–100 hours"
        overrideValue={-10}
        error="Hours must be a non-negative number."
        onSelectOption={vi.fn()}
        onOverrideChange={vi.fn()}
      />
    );

    const inputEl = screen.getByLabelText("Exact Quarterly Administration Hours");
    expect(inputEl).toHaveAttribute("aria-invalid", "true");
    expect(inputEl).toHaveAttribute("aria-describedby", "error-Q04");
    expect(screen.getByRole("alert")).toHaveTextContent("Hours must be a non-negative number.");
  });

  it("toggles seller guidance accordion with accessible aria-expanded and aria-controls", () => {
    render(
      <QuestionCard
        question={QUESTIONS.Q01}
        selectedValue="51–100"
        onSelectOption={vi.fn()}
        onOverrideChange={vi.fn()}
      />
    );

    const guidanceBtn = screen.getByRole("button", { name: /consultant probing & seller guidance/i });
    expect(guidanceBtn).toHaveAttribute("aria-expanded", "false");
    expect(guidanceBtn).toHaveAttribute("aria-controls", "guidance-Q01");

    fireEvent.click(guidanceBtn);
    expect(guidanceBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(QUESTIONS.Q01.sellerGuidance!)).toBeInTheDocument();
  });
});

describe("CustomerModal Component", () => {
  const mockCustomers = [
    { id: "cust-1", name: "Apex Financial", industry: "Banking" },
    { id: "cust-2", name: "Beta Corp", industry: "Technology" },
  ];

  it("renders accessible dialog semantics, title, description, and tablist", () => {
    render(
      <CustomerModal
        isOpen={true}
        onClose={vi.fn()}
        customers={mockCustomers}
        onSelectCustomerAndAssessment={vi.fn()}
        onCreateCustomer={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog", { name: /start assessment discovery session/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-describedby", "customer-modal-desc");

    const tabList = screen.getByRole("tablist", { name: /customer configuration mode/i });
    expect(tabList).toBeInTheDocument();

    const existingTab = screen.getByRole("tab", { name: /existing customer/i });
    const createTab = screen.getByRole("tab", { name: /create new customer/i });
    expect(existingTab).toHaveAttribute("aria-selected", "true");
    expect(createTab).toHaveAttribute("aria-selected", "false");
  });

  it("switches to create customer mode and displays registration fields", () => {
    render(
      <CustomerModal
        isOpen={true}
        onClose={vi.fn()}
        customers={mockCustomers}
        onSelectCustomerAndAssessment={vi.fn()}
        onCreateCustomer={vi.fn()}
      />
    );

    const createTab = screen.getByRole("tab", { name: /create new customer/i });
    fireEvent.click(createTab);

    expect(createTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText(/company \/ organization name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/industry sector/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/primary contact email/i)).toBeInTheDocument();
  });

  it("closes dialog when pressing Escape", () => {
    const handleClose = vi.fn();
    render(
      <CustomerModal
        isOpen={true}
        onClose={handleClose}
        customers={mockCustomers}
        onSelectCustomerAndAssessment={vi.fn()}
        onCreateCustomer={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("ReviewSummary Component", () => {
  it("renders all responses and allows editing section", () => {
    const handleEdit = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <ReviewSummary
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={{
          q04_admin_hours: 80,
          q06_frequency: "About weekly",
          q07_labor_hours: "3–5 hours",
          q12_business_impact: "Significant",
          q14_disruption_duration: "1.5–4 hours",
          q20_use_default: true,
        }}
        onEditSection={handleEdit}
        onSubmitAssessment={handleSubmit}
        isSubmitting={false}
      />
    );

    expect(screen.getByText("Ready to Submit Assessment")).toBeInTheDocument();
    expect(screen.getByText("80 hours / quarter")).toBeInTheDocument();
    expect(screen.getByText("About weekly")).toBeInTheDocument();

    const editBtns = screen.getAllByRole("button", { name: /edit section/i });
    expect(editBtns.length).toBe(7);
    fireEvent.click(editBtns[0]);
    expect(handleEdit).toHaveBeenCalledWith("A");
  });

  it("opens accessible confirmation modal on Submit Assessment click and triggers submission on confirm", () => {
    const handleSubmit = vi.fn();

    render(
      <ReviewSummary
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={{}}
        onEditSection={vi.fn()}
        onSubmitAssessment={handleSubmit}
        isSubmitting={false}
      />
    );

    const submitBtns = screen.getAllByRole("button", { name: /submit assessment/i });
    expect(submitBtns.length).toBeGreaterThanOrEqual(1);

    // Click Submit Assessment
    fireEvent.click(submitBtns[0]);

    // Verify confirmation modal appears with correct accessibility semantics
    const dialog = screen.getByRole("dialog", { name: /confirm assessment submission/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-describedby", "confirm-submission-desc");
    expect(screen.getByText(/once submitted, your assessment responses will be finalized/i)).toBeInTheDocument();

    // Click Confirm & Submit in modal
    const confirmBtn = screen.getByRole("button", { name: /confirm & submit/i });
    fireEvent.click(confirmBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it("closes confirmation modal when clicking Go Back", () => {
    render(
      <ReviewSummary
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={{}}
        onEditSection={vi.fn()}
        onSubmitAssessment={vi.fn()}
        isSubmitting={false}
      />
    );

    const submitBtn = screen.getAllByRole("button", { name: /submit assessment/i })[0];
    fireEvent.click(submitBtn);

    expect(screen.getByRole("dialog", { name: /confirm assessment submission/i })).toBeInTheDocument();

    const goBackBtn = screen.getByRole("button", { name: /go back and continue reviewing responses/i });
    fireEvent.click(goBackBtn);

    expect(screen.queryByRole("dialog", { name: /confirm assessment submission/i })).not.toBeInTheDocument();
  });

  it("closes confirmation modal when pressing Escape", () => {
    render(
      <ReviewSummary
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={{}}
        onEditSection={vi.fn()}
        onSubmitAssessment={vi.fn()}
        isSubmitting={false}
      />
    );

    const submitBtn = screen.getAllByRole("button", { name: /submit assessment/i })[0];
    fireEvent.click(submitBtn);

    expect(screen.getByRole("dialog", { name: /confirm assessment submission/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /confirm assessment submission/i })).not.toBeInTheDocument();
  });

  it("renders in-progress status with aria-live and aria-busy when submission is processing", () => {
    const { container } = render(
      <ReviewSummary
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={{}}
        onEditSection={vi.fn()}
        onSubmitAssessment={vi.fn()}
        isSubmitting={true}
      />
    );

    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Submitting your assessment... Finalizing discovery responses.")).toBeInTheDocument();
  });

  it("renders accessible error banner with role='alert' and triggers retry action", () => {
    const handleRetry = vi.fn();
    render(
      <ReviewSummary
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={{}}
        onEditSection={vi.fn()}
        onSubmitAssessment={vi.fn()}
        isSubmitting={false}
        submissionError="Network timeout during assessment submission."
        onRetrySubmission={handleRetry}
      />
    );

    const alertEl = screen.getByRole("alert");
    expect(alertEl).toBeInTheDocument();
    expect(alertEl).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText("Network timeout during assessment submission.")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry submission/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

describe("CalculationStatusView Component", () => {
  it("gracefully renders financial KPIs and structured state tables", () => {
    const handleBack = vi.fn();

    const mockCalc: CalculationRunResponse = {
      snapshot_id: "snap-123",
      assessment_id: "ass-456",
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
        hourly_downtime_rate: {
          value: "300000.00",
          state: "VALID",
          provenance: "INDUSTRY_BENCHMARK",
          formula_code: "ITIC_BENCHMARK",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
        },
      },
      assumptions_used: {},
      benchmarks_used: {},
      provenance_summary: {},
    };

    render(
      <CalculationStatusView
        calculation={mockCalc}
        onBackToWizard={handleBack}
      />
    );

    expect(screen.getByText("Deterministic Calculation Complete")).toBeInTheDocument();
    expect(screen.getByText("$45,692")).toBeInTheDocument();
    expect(screen.getByText("$825,000")).toBeInTheDocument();
    expect(screen.getByText("$11,423")).toBeInTheDocument();
    expect(screen.getByText("$1,800")).toBeInTheDocument();

    const backBtn = screen.getByRole("button", { name: /return to intake wizard/i });
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
