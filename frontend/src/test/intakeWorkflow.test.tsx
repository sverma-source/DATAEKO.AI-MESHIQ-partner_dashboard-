import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AssessmentWizardPage from "../app/page";
import { api } from "../services/api";
import { QUESTIONS, SECTIONS } from "../data/questionCatalog";

vi.mock("../services/api", () => ({
  api: {
    checkHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      calculation_engine_version: "1.0.0",
      database: "ok",
    }),
    listCustomers: vi.fn().mockResolvedValue([
      { id: "cust-1", name: "Global Logistics Inc", industry: "Supply Chain" },
    ]),
    createCustomer: vi.fn().mockResolvedValue({
      id: "cust-2",
      name: "Acme Corp",
      industry: "Financial Services",
    }),
    createAssessment: vi.fn().mockResolvedValue({
      id: "ass-101",
      customer_id: "cust-1",
      title: "IBM MQ Assessment",
      status: "DRAFT",
      assessment_version: "1.0.0",
    }),
    saveResponses: vi.fn().mockResolvedValue({ id: "resp-101", assessment_id: "ass-101" }),
    calculateAssessment: vi.fn().mockResolvedValue({
      snapshot_id: "snap-101",
      assessment_id: "ass-101",
      calculation_engine_version: "1.0.0",
      assessment_version: "1.0.0",
      calculated_at: new Date().toISOString(),
      summary: {
        admin_annual_hours: 500,
        admin_annual_cost: 43269.23,
        troubleshooting_annual_hours: 312,
        troubleshooting_annual_cost: 27000.0,
        total_operational_labor_cost: 70269.23,
        operational_fte_burden: 0.39,
        representative_single_event_exposure: 1500000,
        total_recoverable_labor_hours: 200,
        illustrative_annual_labor_savings: 17567.31,
        troubleshooting_productivity_opportunity: 2700,
      },
      computed_metrics: {
        total_quantified_labor_cost: {
          value: "70269.23",
          state: "VALID",
          provenance: "CALCULATED_RESULT",
          formula_code: "C_TOTAL = C_ADMIN + C_TRB",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
        },
        single_event_exposure: {
          value: "1500000",
          state: "INDUSTRY_BENCHMARK",
          provenance: "BENCHMARK_FALLBACK",
          formula_code: "Q15_FALLBACK",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
        },
        cyber_downtime_exposure: {
          value: null,
          state: "NOT_MODELED",
          provenance: "EXCLUDED_FROM_BASELINE",
          formula_code: "N/A",
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

describe("Comprehensive Assessment Intake Workflow (Q01–Q22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  it("verifies all 22 questions exist across the 7 authoritative sections", () => {
    expect(Object.keys(QUESTIONS)).toHaveLength(22);
    expect(SECTIONS).toHaveLength(7);

    // Verify Section breakdown
    const sectionQuestionCounts: Record<string, number> = {};
    Object.values(QUESTIONS).forEach((q) => {
      sectionQuestionCounts[q.sectionId] = (sectionQuestionCounts[q.sectionId] || 0) + 1;
    });

    expect(sectionQuestionCounts["A"]).toBe(5); // Q01–Q05
    expect(sectionQuestionCounts["B"]).toBe(3); // Q06–Q08
    expect(sectionQuestionCounts["C"]).toBe(3); // Q09–Q11
    expect(sectionQuestionCounts["D"]).toBe(4); // Q12–Q15
    expect(sectionQuestionCounts["E"]).toBe(2); // Q16–Q17
    expect(sectionQuestionCounts["F"]).toBe(2); // Q18–Q19
    expect(sectionQuestionCounts["G"]).toBe(3); // Q20–Q22
  });

  it("navigates through all 7 sections (A through G) sequentially and renders questions", async () => {
    render(<AssessmentWizardPage />);

    await waitFor(() => {
      expect(screen.getByText("Global Logistics Inc")).toBeInTheDocument();
    });

    // Section A
    expect(screen.getByRole("heading", { name: "A. Environment & Cost Baseline" })).toBeInTheDocument();
    expect(screen.getByText("Queue Manager Estate Scale")).toBeInTheDocument();

    // Move to Section B
    fireEvent.click(screen.getByRole("button", { name: /next: section b/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "B. Troubleshooting Economics" })).toBeInTheDocument();
    });
    expect(screen.getByText("Troubleshooting & Incident Frequency")).toBeInTheDocument();

    // Move to Section C
    fireEvent.click(screen.getByRole("button", { name: /next: section c/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "C. Operational Complexity & Productivity" })).toBeInTheDocument();
    });
    expect(screen.getByText("Monitoring Tools & Management Consoles")).toBeInTheDocument();
    expect(screen.getByText("Cross-Technology Manual Correlation Friction")).toBeInTheDocument();
    expect(screen.getByText("Operational Productivity Constraint")).toBeInTheDocument();

    // Move to Section D
    fireEvent.click(screen.getByRole("button", { name: /next: section d/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "D. Business Consequence & Financial Exposure" })).toBeInTheDocument();
    });
    expect(screen.getByText("Severity of Business Impact")).toBeInTheDocument();
    expect(screen.getByText("Recent Disruption Experience")).toBeInTheDocument();

    // Move to Section E
    fireEvent.click(screen.getByRole("button", { name: /next: section e/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "E. Cost Reduction & Organizational Pressure" })).toBeInTheDocument();
    });
    expect(screen.getByText("Cost-Reduction Mandate")).toBeInTheDocument();
    expect(screen.getByText("Target OpEx Reduction Percentage")).toBeInTheDocument();

    // Move to Section F
    fireEvent.click(screen.getByRole("button", { name: /next: section f/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "F. Cybersecurity & Remediation" })).toBeInTheDocument();
    });
    expect(screen.getByText("Cybersecurity & Audit Pressure")).toBeInTheDocument();
    expect(screen.getByText("Vulnerability Remediation & Configuration Friction")).toBeInTheDocument();

    // Move to Section G
    fireEvent.click(screen.getByRole("button", { name: /next: section g/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "G. Economic Inputs & Timing" })).toBeInTheDocument();
    });
    expect(screen.getByText("Fully Loaded Annual Labor Cost Override")).toBeInTheDocument();
    expect(screen.getByText("Customer-Reported Total Annual IBM MQ Spend")).toBeInTheDocument();
    expect(screen.getByText("Time to Act & Measurable Improvement Target")).toBeInTheDocument();

    // Move to Review
    fireEvent.click(screen.getByRole("button", { name: /proceed to review/i }));
    await waitFor(() => {
      expect(screen.getByText("Ready for Engine Calculation")).toBeInTheDocument();
    });
  });

  it("handles unknown and not-sure states legitimately for Q07 and Q15", async () => {
    render(<AssessmentWizardPage />);

    await waitFor(() => {
      expect(screen.getByText("Global Logistics Inc")).toBeInTheDocument();
    });

    // Navigate to Section B (Q07)
    fireEvent.click(screen.getByRole("button", { name: /next: section b/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "B. Troubleshooting Economics" })).toBeInTheDocument();
    });

    // Select "Not sure" for Q07
    const q07Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q07" });
    fireEvent.change(q07Select, { target: { value: "Not sure" } });
    expect((q07Select as HTMLSelectElement).value).toBe("Not sure");

    // Navigate to Section D (Q15)
    fireEvent.click(screen.getByRole("button", { name: /next: section c/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "C. Operational Complexity & Productivity" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /next: section d/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "D. Business Consequence & Financial Exposure" })).toBeInTheDocument();
    });

    // Select "Unknown / Use Industry Benchmark if applicable" for Q15
    const q15Select = screen.getByLabelText("Select Approved Response", { selector: "#select-Q15" });
    fireEvent.change(q15Select, { target: { value: "UNKNOWN" } });
    expect((q15Select as HTMLSelectElement).value).toBe("UNKNOWN");
  });

  it("handles numeric and currency input overrides without crashing or calculating in UI", async () => {
    render(<AssessmentWizardPage />);

    await waitFor(() => {
      expect(screen.getByText("Global Logistics Inc")).toBeInTheDocument();
    });

    // Navigate to Section G (Q20 Labor Rate & Q21 Spend)
    fireEvent.click(screen.getByRole("button", { name: /next: section b/i }));
    fireEvent.click(screen.getByRole("button", { name: /next: section c/i }));
    fireEvent.click(screen.getByRole("button", { name: /next: section d/i }));
    fireEvent.click(screen.getByRole("button", { name: /next: section e/i }));
    fireEvent.click(screen.getByRole("button", { name: /next: section f/i }));
    fireEvent.click(screen.getByRole("button", { name: /next: section g/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "G. Economic Inputs & Timing" })).toBeInTheDocument();
    });

    // Expand override for Q20
    const q20OverrideToggle = screen.getByRole("button", {
      name: /provide exact customer fact \(custom annual loaded salary/i,
    });
    fireEvent.click(q20OverrideToggle);

    const customRateInput = screen.getByPlaceholderText("180000");
    fireEvent.change(customRateInput, { target: { value: "220000" } });
    expect((customRateInput as HTMLInputElement).value).toBe("220000");

    // Expand override for Q21
    const q21OverrideToggle = screen.getByRole("button", {
      name: /provide exact customer fact \(total annual mq spend/i,
    });
    fireEvent.click(q21OverrideToggle);

    const q21Input = screen.getByPlaceholderText("e.g. 500000");
    fireEvent.change(q21Input, { target: { value: "450000" } });
    expect((q21Input as HTMLInputElement).value).toBe("450000");
  });

  it("handles calculation states (VALID, INDUSTRY_BENCHMARK, NOT_MODELED) gracefully", async () => {
    render(<AssessmentWizardPage />);

    await waitFor(() => {
      expect(screen.getByText("Global Logistics Inc")).toBeInTheDocument();
    });

    // Jump to review
    const reviewTab = screen.getByRole("button", { name: /review & submit/i });
    fireEvent.click(reviewTab);

    await waitFor(() => {
      expect(screen.getByText("Ready for Engine Calculation")).toBeInTheDocument();
    });

    // Submit calculation
    const calcBtn = screen.getByRole("button", { name: /submit for calculation/i });
    fireEvent.click(calcBtn);

    await waitFor(() => {
      expect(api.calculateAssessment).toHaveBeenCalled();
      expect(screen.getByText("Assessment Economic Baseline & Scenario Results")).toBeInTheDocument();
      // Displays formatted currency from engine response
      expect(screen.getByText("$70,269")).toBeInTheDocument();
      expect(screen.getByText("$1,500,000")).toBeInTheDocument();
      // Provenance badge
      expect(screen.getByText("Deterministic Calculation Complete")).toBeInTheDocument();
    });
  });
});
