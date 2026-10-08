import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubmittedResponsesView } from "../components/SubmittedResponsesView";
import { QUESTIONS, SECTIONS } from "../data/questionCatalog";
import { Assessment, Customer } from "../types/assessment";

describe("SubmittedResponsesView Component", () => {
  const mockCustomer: Customer = {
    id: "cust-1",
    name: "Global Prime Healthcare",
    industry: "Healthcare",
  };

  const mockAssessment: Assessment = {
    id: "ass-submitted-1",
    customer_id: "cust-1",
    title: "Q3 MQ Infrastructure Review",
    status: "SUBMITTED",
    assessment_version: "1.0.0",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-29T12:00:00Z",
  };

  const mockAnswers = {
    q01_scale: "51–100",
    q02_business_criticality: "High",
    q03_staffing_model: "Dedicated team",
    q04_admin_hours: 14,
    q05_environment_growth: "Stable",
    q06_frequency: "Monthly",
    q07_labor_hours: "1–4 hours",
    q07_override: 3.5,
    q08_duration: "1–2 hours",
    q09_tools_count: "2–3 tools",
    q10_manual_tracing: "Frequently",
    q11_productivity_constraint: "Significant",
    q12_business_impact: "Moderate",
    q13_recent_disruptions: "1–2 events",
    q14_disruption_duration: "1–2 hours",
    q15_hourly_cost_override: 65000,
    q16_cost_mandate: "Target 15% reduction",
    q17_opex_reduction: "10%–20%",
    q17_override: 15,
    q18_audit_effort: "1–2 days",
    q19_documentation_effort: "Moderate friction",
    q20_annual_labor_rate: 195000,
    q20_use_default: false,
    q21_annual_mq_spend: 750000,
    q22_migration_plans: "Hybrid AWS expansion",
  };

  it("renders Assessment Submitted status banner, metadata, and notice", () => {
    render(
      <SubmittedResponsesView
        assessment={mockAssessment}
        customer={mockCustomer}
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={mockAnswers}
      />
    );

    expect(screen.getByText("Assessment Submitted")).toBeInTheDocument();
    expect(screen.getByText("ASSESSMENT SUBMITTED & FINALIZED")).toBeInTheDocument();
    expect(
      screen.getByText(/Your submitted responses are shown below. These discovery responses have been formally finalized/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Global Prime Healthcare")).toBeInTheDocument();
    expect(screen.getByText("Q3 MQ Infrastructure Review")).toBeInTheDocument();
    expect(screen.getByText("Read-Only Record")).toBeInTheDocument();
  });

  it("renders all 7 canonical sections and all 22 discovery responses", () => {
    render(
      <SubmittedResponsesView
        assessment={mockAssessment}
        customer={mockCustomer}
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={mockAnswers}
      />
    );

    // Verify all 7 section titles
    SECTIONS.forEach((sec) => {
      expect(screen.getByText(sec.title)).toBeInTheDocument();
    });

    // Verify all question codes Q01 to Q22
    for (let i = 1; i <= 22; i++) {
      const qCode = `Q${String(i).padStart(2, "0")}`;
      expect(screen.getByText(qCode)).toBeInTheDocument();
    }

    // Customer-friendly question titles must be displayed
    expect(screen.getByText("Older or Inactive Queue Managers")).toBeInTheDocument();
    expect(screen.getByText("End-to-End Transaction Tracing")).toBeInTheDocument();
    expect(screen.getByText("Cost Reduction & Modernization Focus")).toBeInTheDocument();
    expect(screen.getByText("Target Cost Reduction Percentage")).toBeInTheDocument();
    expect(screen.getByText("Annual Engineering Labor Cost")).toBeInTheDocument();
    expect(screen.getByText("Target Improvement Timeline")).toBeInTheDocument();

    // Internal audit-style labels must NOT appear
    expect(screen.queryByText("Retired Infrastructure & Technical Debt")).not.toBeInTheDocument();
    expect(screen.queryByText("Cross-Technology Manual Correlation Friction")).not.toBeInTheDocument();
    expect(screen.queryByText("Cost-Reduction Mandate")).not.toBeInTheDocument();
    expect(screen.queryByText("Target OpEx Reduction Percentage")).not.toBeInTheDocument();
    expect(screen.queryByText("Fully Loaded Annual Labor Cost Override")).not.toBeInTheDocument();
    expect(screen.queryByText("Time to Act & Measurable Improvement Target")).not.toBeInTheDocument();
    expect(screen.queryByText("Economic Inputs & Timing")).not.toBeInTheDocument();
  });

  it("is strictly read-only and contains NO edit, input, slider, or submission controls", () => {
    render(
      <SubmittedResponsesView
        assessment={mockAssessment}
        customer={mockCustomer}
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={mockAnswers}
      />
    );

    // No edit buttons
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    // No submit buttons
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
    // No save buttons
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    // No text inputs, number inputs, or textareas
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("does NOT expose internal calculations, snapshots, FTE metrics, or scenario formulas", () => {
    render(
      <SubmittedResponsesView
        assessment={mockAssessment}
        customer={mockCustomer}
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={mockAnswers}
      />
    );

    expect(screen.queryByText(/Total Quantified Labor Cost/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Executive Customer Assessment Report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Scenario Sandbox/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Operational FTE Burden/i)).not.toBeInTheDocument();
  });
});
