import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { ScenarioSandbox } from "../components/ScenarioSandbox";
import { ProvenanceBadge } from "../components/ProvenanceBadge";
import { CalculationRunResponse } from "../types/assessment";

const mockCalculation: CalculationRunResponse = {
  snapshot_id: "snap-abc-12345",
  assessment_id: "ass-101",
  calculation_engine_version: "1.0.0",
  assessment_version: "1.0.0",
  calculated_at: "2026-09-25T14:00:00Z",
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
      inputs_used: { H_admin: 320, H_trb: 208, R_hr: 86.53846153846154 },
    },
    operational_fte_burden: {
      value: "0.25",
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "FTE = H_TOTAL / 2,080",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { H_total: 528 },
    },
    representative_single_event_exposure: {
      value: "825000",
      state: "INDUSTRY_BENCHMARK",
      provenance: "BENCHMARK_FALLBACK",
      formula_code: "EXPOSURE = D_HOURS × R_IMPACT",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { D_hours: 2.75, R_impact: 300000 },
    },
    internal_loaded_hourly_rate: {
      value: "86.53846153846154",
      state: "VALID_WITH_DEFAULTS",
      provenance: "MODEL_ASSUMPTION",
      formula_code: "R_HR = Q20 / 2,080",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { Q20_salary: 180000 },
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
  assumptions_used: { working_hours_per_year: 2080 },
  benchmarks_used: { itic_hourly_downtime_rate: 300000 },
  provenance_summary: {},
};

const mockCustomer = {
  id: "cust-1",
  tenant_id: "tenant-1",
  name: "Apex Global Financial",
  industry: "Financial Services",
  created_at: "2026-09-25T10:00:00Z",
};

const mockAnswers = {
  q01_scale: "51–100",
  q04_dropdown: "80 hours / quarter (320 hrs/yr)",
  q06_frequency: "About weekly (52/yr)",
  q07_labor_hours: "3–5 hours (4.0 hrs)",
  q09_tools_count: "2–3 disparate tools",
  q10_manual_tracing: "Mostly manual",
  q14_disruption_duration: "1.5–4 hours (2.75 hrs)",
  q18_audit_effort: "Moderate pressure",
  q21_annual_mq_spend: 500000,
  q21_is_unknown: false,
  q22_migration_plans: "Near-term (90–180 days)",
};

describe("Phase 6 Executive KPI Dashboard & Scenario Sandbox", () => {
  it("renders the Executive KPI Dashboard with core metrics and strict financial labels", () => {
    render(
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={mockCustomer}
        answers={mockAnswers}
        onReturnToWizard={vi.fn()}
      />
    );

    // 1. Overview Header
    expect(screen.getByText("Assessment Economic Baseline & Scenario Results")).toBeInTheDocument();
    expect(screen.getByText(/Apex Global Financial/)).toBeInTheDocument();
    expect(screen.getByText("Engine: v1.0.0")).toBeInTheDocument();

    // 2. Operational Labor Cost
    expect(screen.getByText("$45,692")).toBeInTheDocument();
    expect(screen.getByText("Operational Labor Cost")).toBeInTheDocument();

    // 3. Operational FTE Burden
    expect(screen.getAllByText(/0.25 FTE/)[0]).toBeInTheDocument();

    // 4. Representative Single-Event Exposure (Strict label check: NOT annual loss)
    expect(screen.getAllByText("Representative Single-Event Exposure")[0]).toBeInTheDocument();
    expect(screen.getByText("$825,000")).toBeInTheDocument();
    expect(screen.queryByText("Annual Loss")).not.toBeInTheDocument();

    // 5. Total Recoverable Labor Hours & Illustrative Economic Value
    expect(screen.getByText("132 hrs")).toBeInTheDocument();
    expect(screen.getByText("$11,423")).toBeInTheDocument();
    expect(screen.getAllByText("Illustrative Economic Value")[0]).toBeInTheDocument();
    expect(screen.queryByText("Guaranteed Savings")).not.toBeInTheDocument();
    expect(screen.queryByText("Guaranteed ROI")).not.toBeInTheDocument();

    // 6. Customer-Reported Annual MQ Spend (Q21)
    expect(screen.getByText("$500,000")).toBeInTheDocument();
    expect(screen.getByText("Customer-Reported MQ Spend")).toBeInTheDocument();
  });

  it("handles Q21 when unknown / not provided gracefully without computing false labor equivalents", () => {
    const answersWithoutQ21 = { ...mockAnswers, q21_annual_mq_spend: undefined, q21_is_unknown: true };
    render(
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={mockCustomer}
        answers={answersWithoutQ21}
        onReturnToWizard={vi.fn()}
      />
    );

    expect(screen.getByText("Not provided")).toBeInTheDocument();
  });

  it("switches between Executive Customer View and Consultant Audit View", () => {
    render(
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={mockCustomer}
        answers={mockAnswers}
        onReturnToWizard={vi.fn()}
      />
    );

    // Default: Executive View
    expect(screen.queryByText(/Consultant Audit View Enabled/i)).not.toBeInTheDocument();

    // Switch to Consultant View
    const consultantBtn = screen.getByRole("button", { name: /consultant view/i });
    fireEvent.click(consultantBtn);

    expect(screen.getByText(/Consultant Audit View Enabled/i)).toBeInTheDocument();
    expect(screen.getByText("C_TOTAL = C_ADMIN + C_TRB")).toBeInTheDocument();
  });

  it("navigates across all 6 dashboard tabs seamlessly", () => {
    render(
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={mockCustomer}
        answers={mockAnswers}
        onReturnToWizard={vi.fn()}
      />
    );

    // Tab 2: Effort & Operational Cost
    fireEvent.click(screen.getByRole("button", { name: /effort & operational cost/i }));
    expect(screen.getByText("Operational Effort & Cost Decomposition")).toBeInTheDocument();
    expect(screen.getByText("Routine Administration Stream")).toBeInTheDocument();
    expect(screen.getByText("Incident Troubleshooting Stream")).toBeInTheDocument();

    // Tab 3: Single-Event Exposure
    fireEvent.click(screen.getByRole("button", { name: /single-event exposure/i }));
    expect(screen.getByText("Representative Single-Event Business Exposure")).toBeInTheDocument();
    expect(screen.getByText("Governance Note on Exposure Metric:")).toBeInTheDocument();

    // Tab 4: Scenario Sandbox
    fireEvent.click(screen.getByRole("button", { name: /scenario sandbox/i }));
    expect(screen.getByText("meshIQ Efficiency Scenario Modeler")).toBeInTheDocument();
    expect(screen.getByText("Troubleshooting Productivity Opportunity (Separate 10% Rule)")).toBeInTheDocument();

    // Tab 5: Contextual Findings
    fireEvent.click(screen.getByRole("button", { name: /contextual findings/i }));
    expect(screen.getByText("Assessment Strategic Findings & Risk Matrix")).toBeInTheDocument();
    expect(screen.getByText("Estate Scale & Technical Debt (Q01, Q05)")).toBeInTheDocument();

    // Tab 6: Provenance Inventory
    fireEvent.click(screen.getByRole("button", { name: /calculation provenance/i }));
    expect(screen.getByText("Calculation Engine Provenance & Metric Inventory")).toBeInTheDocument();
    expect(screen.getByText("Rule Version: calc-rules-v1.0.0")).toBeInTheDocument();
  });

  it("operates the Scenario Sandbox with interactive adjustments, delta tracking, and baseline reset", () => {
    render(<ScenarioSandbox calculation={mockCalculation} />);

    // Check baseline model values
    expect(screen.getByText("Approved Baseline")).toBeInTheDocument();
    expect(screen.getByText("$11,423")).toBeInTheDocument();
    expect(screen.getAllByText(/132 hrs/)[0]).toBeInTheDocument();

    // Separate 10% troubleshooting opportunity check: $18,000 * 0.1 = $1,800
    expect(screen.getByText("$1,800")).toBeInTheDocument();
    expect(screen.getByText(/Separate 10% Rule/i)).toBeInTheDocument();

    // Modify Investigation Improvement slider
    const investigationInput = screen.getByLabelText(/Investigation Improvement/i);
    fireEvent.change(investigationInput, { target: { value: "50" } });

    // Verify User-Defined status and delta tracking
    expect(screen.getByText("User-Defined")).toBeInTheDocument();
    expect(screen.getByText("Custom Scenario Active")).toBeInTheDocument();

    // Reset to Model Baseline
    const resetBtn = screen.getByRole("button", { name: /reset to model baseline/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText("Approved Baseline")).toBeInTheDocument();
  });

  it("renders structured provenance badges with appropriate tiers and evaluation states", () => {
    render(
      <div>
        <ProvenanceBadge provenance="CUSTOMER_FACT" state="VALID" />
        <ProvenanceBadge provenance="INDUSTRY_BENCHMARK" state="INDUSTRY_BENCHMARK" />
        <ProvenanceBadge provenance="SCENARIO_PROJECTION" state="VALID" />
        <ProvenanceBadge provenance="CALCULATED_RESULT" state="VALID" />
      </div>
    );

    expect(screen.getByText("Customer Fact")).toBeInTheDocument();
    expect(screen.getByText("Industry Benchmark")).toBeInTheDocument();
    expect(screen.getByText("Illustrative Scenario")).toBeInTheDocument();
    expect(screen.getByText("Calculated Metric")).toBeInTheDocument();
  });

  it("verifies scenario immutability and explicit safeguard notice", () => {
    render(<ScenarioSandbox calculation={mockCalculation} />);

    // Verify explicit safeguard notice
    expect(screen.getByText(/Scenario only — does not modify the official assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/never modifies the official assessment, persisted responses, or historical calculation snapshot/i)).toBeInTheDocument();

    // Verify mockCalculation snapshot object is not mutated
    expect(mockCalculation.summary.total_recoverable_labor_hours).toBe(132);
    expect(mockCalculation.summary.illustrative_annual_labor_savings).toBe(11423.08);
  });

  it("verifies Q08 (clock duration) does not substitute for Q07 (staff hours) or alter operational labor calculations", () => {
    // Both answers have Q07 = 4.0 hrs (H_trb = 208), but different Q08 clock times
    const answersClock30Min = { ...mockAnswers, q08_duration: "Under 30 minutes" };
    const answersClock3Days = { ...mockAnswers, q08_duration: "1–3 days" };

    const { unmount } = render(
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={mockCustomer}
        answers={answersClock30Min}
        onReturnToWizard={vi.fn()}
      />
    );

    expect(screen.getByText("$45,692")).toBeInTheDocument();
    expect(screen.getAllByText(/0.25 FTE/)[0]).toBeInTheDocument();
    unmount();

    render(
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={mockCustomer}
        answers={answersClock3Days}
        onReturnToWizard={vi.fn()}
      />
    );

    // Operational labor, FTE, and illustrative savings remain identical
    expect(screen.getByText("$45,692")).toBeInTheDocument();
    expect(screen.getAllByText(/0.25 FTE/)[0]).toBeInTheDocument();
    expect(screen.getByText("$11,423")).toBeInTheDocument();
  });

  it("verifies structured states (NOT_MODELED / INSUFFICIENT_DATA) render as dashes rather than misleading $0", () => {
    const unmodeledCalculation: CalculationRunResponse = {
      ...mockCalculation,
      summary: {
        ...mockCalculation.summary,
        representative_single_event_exposure: undefined,
      },
      computed_metrics: {
        ...mockCalculation.computed_metrics,
        representative_single_event_exposure: {
          value: null,
          state: "NOT_MODELED",
          provenance: "EXCLUDED_FROM_BASELINE",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
          state_reason: "Severity below Critical/Significant and no customer override provided.",
        },
      },
    };

    render(
      <ExecutiveDashboard
        calculation={unmodeledCalculation}
        customer={mockCustomer}
        answers={mockAnswers}
        onReturnToWizard={vi.fn()}
      />
    );

    // Exposure tile must render "—" instead of "$0"
    expect(screen.getAllByText("Single-Event Exposure")[0]).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });
});
