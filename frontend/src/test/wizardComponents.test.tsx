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
});

describe("SectionNavigation Component", () => {
  it("renders all 7 sections plus review tab and triggers section selection", () => {
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

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section G")).toBeInTheDocument();
    expect(screen.getByText("Review & Submit")).toBeInTheDocument();

    const secBBtn = screen.getByRole("button", { name: /section b/i });
    fireEvent.click(secBBtn);
    expect(handleSelect).toHaveBeenCalledWith("B");
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
});

describe("ReviewSummary Component", () => {
  it("renders answers and allows calculation trigger", () => {
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
        onSubmitCalculation={handleSubmit}
        isCalculating={false}
      />
    );

    expect(screen.getByText("Ready for Engine Calculation")).toBeInTheDocument();
    expect(screen.getByText("80 hours / quarter")).toBeInTheDocument();
    expect(screen.getByText("About weekly")).toBeInTheDocument();

    const submitBtns = screen.getAllByRole("button", { name: /calculate/i });
    fireEvent.click(submitBtns[0]);
    expect(handleSubmit).toHaveBeenCalled();
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
