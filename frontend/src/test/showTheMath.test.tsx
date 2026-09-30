import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { ShowTheMathDrawer } from "../components/ShowTheMathDrawer";
import { AuthContext } from "../context/AuthContext";
import { CalculationRunResponse } from "../types/assessment";

const mockCalculation: CalculationRunResponse = {
  snapshot_id: "snap-abc-12345",
  assessment_id: "ass-101",
  calculation_engine_version: "1.0.0",
  assessment_version: "1.0.0",
  calculated_at: "2026-09-30T14:00:00Z",
  summary: {
    admin_annual_hours: 208,
    admin_annual_cost: 18000,
    troubleshooting_annual_hours: 320,
    troubleshooting_annual_cost: 27692.31,
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
      inputs_used: { c_admin: "18000.00", c_trb: "27692.31" },
    },
    annual_admin_labor_cost: {
      value: "18000.00",
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "C_ADMIN = H_ADMIN * R_HR",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { h_admin: "208", r_hr: "86.53846153846154" },
    },
    annual_troubleshooting_labor_cost: {
      value: "27692.31",
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "C_TRB = H_TRB * R_HR",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { h_trb: "320", r_hr: "86.53846153846154" },
    },
    annual_admin_hours: {
      value: 208,
      state: "VALID",
      provenance: "MODEL_ASSUMPTION",
      formula_code: "H_ADMIN = LOOKUP(Q04_EFFORT) * 52",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q04_effort_input: "1–5 hrs/week" },
    },
    annual_troubleshooting_events: {
      value: 104,
      state: "VALID",
      provenance: "MODEL_ASSUMPTION",
      formula_code: "N_EVENTS = LOOKUP(Q06_FREQUENCY)",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q06_frequency_input: "2–3 times / week" },
    },
    staff_hours_per_investigation: {
      value: 3.0,
      state: "VALID",
      provenance: "MODEL_ASSUMPTION",
      formula_code: "H_INV = LOOKUP(Q07_STAFF_HOURS)",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q07_staff_hours_input: "2–4 hours" },
    },
    annual_troubleshooting_hours: {
      value: 312,
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "H_TRB = N_EVENTS * H_INV",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { n_events: "104", h_inv: "3.0" },
    },
    loaded_annual_labor_cost: {
      value: "180000.00",
      state: "VALID_WITH_DEFAULTS",
      provenance: "MODEL_ASSUMPTION",
      formula_code: "L_ANNUAL = INPUT(Q20_LABOR) || DEFAULT(180,000)",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q20_annual_cost_input: "180000.00" },
    },
    loaded_hourly_rate: {
      value: 86.53846153846154,
      state: "VALID_WITH_DEFAULTS",
      provenance: "CALCULATED_RESULT",
      formula_code: "R_HR = L_ANNUAL / 2080",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { loaded_annual_labor_cost: "180000.00", annual_working_hours: "2080" },
    },
    operational_fte_burden: {
      value: "0.25",
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "FTE = H_TOTAL / 2,080",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { H_total: 520 },
    },
  },
  assumptions_used: {
    annual_working_hours: 2080,
    default_annual_loaded_labor_cost: 180000,
  },
  benchmarks_used: {
    itic_hourly_downtime_benchmark: 300000,
  },
  provenance_summary: {
    total_quantified_labor_cost: "CALCULATED_RESULT",
    annual_admin_labor_cost: "CALCULATED_RESULT",
    annual_troubleshooting_labor_cost: "CALCULATED_RESULT",
  },
};

const mockAnswers = {
  q04_dropdown: "1–5 hrs/week",
  q06_frequency: "2–3 times / week",
  q07_labor_hours: "2–4 hours",
  q20_use_default: true,
  q20_annual_labor_rate: 180000,
};

const createMockAuth = (role: string) => ({
  user: {
    id: "user-123",
    email: `${role.toLowerCase()}@example.com`,
    full_name: "Test User",
    role,
    tenant_id: "tenant-abc",
    is_active: true,
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn().mockImplementation((r) => r === role),
});

describe("E1: Economic Insight / Show the Math", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboardWithRole = (role: string) => {
    return render(
      <AuthContext.Provider value={createMockAuth(role)}>
        <ExecutiveDashboard
          calculation={mockCalculation}
          customer={{ id: "cust-1", name: "Global Financial Corp", tenant_id: "tenant-abc", created_at: "" }}
          answers={mockAnswers}
          onReturnToWizard={vi.fn()}
        />
      </AuthContext.Provider>
    );
  };

  it("1. renders Show the Math control for the targeted Operational Labor Cost metric for CONSULTANT", () => {
    renderDashboardWithRole("CONSULTANT");
    const showMathBtn = screen.getByTestId("show-the-math-btn");
    expect(showMathBtn).toBeInTheDocument();
    expect(showMathBtn).toHaveTextContent("Show the Math");
  });

  it("2. renders Show the Math control for PLATFORM_ADMIN", () => {
    renderDashboardWithRole("PLATFORM_ADMIN");
    expect(screen.getByTestId("show-the-math-btn")).toBeInTheDocument();
  });

  it("3. does NOT render Show the Math control for CUSTOMER_USER (unauthorized)", () => {
    renderDashboardWithRole("CUSTOMER_USER");
    expect(screen.queryByTestId("show-the-math-btn")).not.toBeInTheDocument();
  });

  it("4. clicking Show the Math opens the detail panel", () => {
    renderDashboardWithRole("CONSULTANT");
    const showMathBtn = screen.getByTestId("show-the-math-btn");
    fireEvent.click(showMathBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Operational Labor Cost Breakdown")).toBeInTheDocument();
  });

  it("5. displays exact existing metric value directly from snapshot ($45,692)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    const valueEl = screen.getByTestId("target-metric-value");
    expect(valueEl).toBeInTheDocument();
    expect(valueEl).toHaveTextContent("$45,692");
  });

  it("6. displays existing metric state and provenance metadata", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByText("total_quantified_labor_cost")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });

  it("7. displays existing canonical formula metadata (C_TOTAL = C_ADMIN + C_TRB)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    const formulaEl = screen.getByTestId("canonical-formula-code");
    expect(formulaEl).toBeInTheDocument();
    expect(formulaEl).toHaveTextContent("C_TOTAL = C_ADMIN + C_TRB");
  });

  it("8. displays existing component metrics directly from snapshot without recalculation", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    const adminCostEl = screen.getByTestId("component-admin-cost");
    const trbCostEl = screen.getByTestId("component-trb-cost");

    expect(adminCostEl).toHaveTextContent("$18,000");
    expect(trbCostEl).toHaveTextContent("$27,692");
  });

  it("9. displays underlying intermediate metrics (H_ADMIN, N_EVENTS, H_INV, H_TRB, R_HR)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByTestId("intermediate-admin-hours")).toHaveTextContent("208 hrs/yr");
    expect(screen.getByTestId("intermediate-trb-events")).toHaveTextContent("104 events/yr");
    expect(screen.getByTestId("intermediate-inv-hours")).toHaveTextContent("3 hrs/event");
    expect(screen.getByTestId("intermediate-trb-hours")).toHaveTextContent("312 hrs/yr");
    expect(screen.getByTestId("intermediate-hourly-rate")).toHaveTextContent("$86.54/hr");
  });

  it("10. displays source assessment inputs lineage (Q04, Q06, Q07, Q20)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByTestId("input-q04")).toHaveTextContent("1–5 hrs/week");
    expect(screen.getByTestId("input-q06")).toHaveTextContent("2–3 times / week");
    expect(screen.getByTestId("input-q07")).toHaveTextContent("2–4 hours");
    expect(screen.getByTestId("input-q20")).toHaveTextContent("$180,000 / yr (Default)");
  });

  it("11. displays model assumptions and standard benchmarks (2,080 working hours, $180,000 default)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByTestId("assumption-working-hours")).toHaveTextContent("2080 hours / year");
    expect(screen.getByTestId("assumption-default-labor")).toHaveTextContent("$180,000 / year");
  });

  it("12. displays calculation engine and rule set technical versions and snapshot ID", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByTestId("engine-version")).toHaveTextContent("1.0.0");
    expect(screen.getByTestId("rule-version")).toHaveTextContent("calc-rules-v1.0.0");
    expect(screen.getByTestId("snapshot-id")).toHaveTextContent("snap-abc-12345");
  });

  it("13. closes the panel when clicking the close button", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const closeBtn = screen.getByLabelText("Close calculation detail panel");
    fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("14. closes the panel when pressing the Escape key", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("15. standalone ShowTheMathDrawer renders accessible modal dialog semantics with zero frontend math", () => {
    const handleClose = vi.fn();
    render(
      <ShowTheMathDrawer
        isOpen={true}
        onClose={handleClose}
        calculation={mockCalculation}
        customerName="Apex Global"
        answers={mockAnswers}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "show-the-math-title");
    expect(screen.getByTestId("target-metric-value")).toHaveTextContent("$45,692");
  });
});
