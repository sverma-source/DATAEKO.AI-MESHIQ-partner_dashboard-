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
    potential_financial_exposure: {
      value: "825000.00",
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "EXPOSURE_SINGLE = D_HOURS * R_IMPACT",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { d_hours: "2.750", r_impact: "300000.00" },
    },
    representative_duration_hours: {
      value: 2.75,
      state: "VALID",
      provenance: "MODEL_ASSUMPTION",
      formula_code: "D_HOURS = LOOKUP(Q14_DURATION)",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q14_duration_input: "1.5–4 hours" },
    },
    applicable_financial_rate: {
      value: "300000.00",
      state: "VALID_WITH_DEFAULTS",
      provenance: "INDUSTRY_BENCHMARK",
      formula_code: "R_IMPACT = Q15_OVERRIDE OR (ITIC_300K IF Q12 IN {CRITICAL, SIGNIFICANT})",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q15_hourly_cost: "None", q12_severity: "Critical / Significant" },
      state_reason: "Using ITIC $300,000/hr benchmark for Critical/Significant impact",
    },
    recovered_admin_hours: {
      value: "52.00",
      state: "VALID",
      provenance: "ILLUSTRATIVE_SCENARIO",
      formula_code: "H_REC_ADMIN = H_ADMIN * 0.50_ADDRESSABLE * 0.50_EFFICIENCY",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { h_admin: "208", addressable_share: "0.50", admin_efficiency: "0.50" },
    },
    recovered_investigation_hours: {
      value: "80.00",
      state: "VALID",
      provenance: "ILLUSTRATIVE_SCENARIO",
      formula_code: "H_REC_INV = H_TRB * 0.25_INVESTIGATION_IMP",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { h_trb: "320", investigation_improvement: "0.25" },
    },
    total_recovered_hours: {
      value: "132.00",
      state: "VALID",
      provenance: "ILLUSTRATIVE_SCENARIO",
      formula_code: "H_REC_TOTAL = H_REC_ADMIN + H_REC_INV",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { rec_admin: "52.00", rec_inv: "80.00" },
    },
    illustrative_economic_value: {
      value: "11423.08",
      state: "VALID",
      provenance: "ILLUSTRATIVE_SCENARIO",
      formula_code: "V_ILLUSTRATIVE = H_REC_TOTAL * R_HR",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { rec_total: "132.00", r_hr: "86.53846153846154" },
    },
    troubleshooting_productivity_opportunity: {
      value: "2769.23",
      state: "VALID",
      provenance: "ILLUSTRATIVE_SCENARIO",
      formula_code: "OPP_TRB = C_TRB * 0.10",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { c_trb: "27692.31", opportunity_share: "0.10" },
    },
  },
  assumptions_used: {
    annual_working_hours: 2080,
    default_annual_loaded_labor_cost: 180000,
    scenario_admin_addressable_share: "0.50",
    scenario_admin_efficiency_improvement: "0.50",
    scenario_investigation_improvement: "0.25",
    scenario_troubleshooting_opportunity_share: "0.10",
  },
  benchmarks_used: {
    itic_hourly_downtime_benchmark: 300000,
  },
  provenance_summary: {
    total_quantified_labor_cost: "CALCULATED_RESULT",
    annual_admin_labor_cost: "CALCULATED_RESULT",
    annual_troubleshooting_labor_cost: "CALCULATED_RESULT",
    potential_financial_exposure: "CALCULATED_RESULT",
    representative_duration_hours: "MODEL_ASSUMPTION",
    applicable_financial_rate: "INDUSTRY_BENCHMARK",
    recovered_admin_hours: "ILLUSTRATIVE_SCENARIO",
    recovered_investigation_hours: "ILLUSTRATIVE_SCENARIO",
    total_recovered_hours: "ILLUSTRATIVE_SCENARIO",
    illustrative_economic_value: "ILLUSTRATIVE_SCENARIO",
    troubleshooting_productivity_opportunity: "ILLUSTRATIVE_SCENARIO",
  },
};

const mockAnswers = {
  q04_dropdown: "1–5 hrs/week",
  q06_frequency: "2–3 times / week",
  q07_labor_hours: "2–4 hours",
  q12_business_impact: "Critical / Significant",
  q14_disruption_duration: "1.5–4 hours",
  q15_is_unknown: true,
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

const renderDashboardWithRole = (role: string) => {
  const authValue = createMockAuth(role);
  return render(
    <AuthContext.Provider value={authValue as any}>
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={{ id: "cust-1", name: "Acme Corp" }}
        assessment={{ id: "ass-101", title: "Enterprise MQ Assessment", status: "SUBMITTED" } as any}
        answers={mockAnswers}
      />
    </AuthContext.Provider>
  );
};

describe("E1: Economic Insight / Show the Math (Labor Cost)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. renders Show the Math button for CONSULTANT on Operational Labor Cost metric", () => {
    renderDashboardWithRole("CONSULTANT");
    const showMathBtn = screen.getByTestId("show-the-math-btn");
    expect(showMathBtn).toBeInTheDocument();
    expect(showMathBtn).toHaveTextContent("Show the Math");
  });

  it("2. renders Show the Math button for PLATFORM_ADMIN", () => {
    renderDashboardWithRole("PLATFORM_ADMIN");
    expect(screen.getByTestId("show-the-math-btn")).toBeInTheDocument();
  });

  it("3. does NOT render Show the Math button for CUSTOMER_USER (role restricted)", () => {
    renderDashboardWithRole("CUSTOMER_USER");
    expect(screen.queryByTestId("show-the-math-btn")).not.toBeInTheDocument();
  });

  it("4. clicking Show the Math opens the detail panel drawer", () => {
    renderDashboardWithRole("CONSULTANT");
    const showMathBtn = screen.getByTestId("show-the-math-btn");
    fireEvent.click(showMathBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Operational Labor Cost Breakdown")).toBeInTheDocument();
  });

  it("5. displays the exact existing snapshot metric value without recalculation", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    const targetVal = screen.getByTestId("target-metric-value");
    expect(targetVal).toHaveTextContent("$45,692");
  });

  it("6. displays existing metric state badge and calculation provenance tier", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getAllByText("CALCULATED_RESULT").length).toBeGreaterThan(0);
  });

  it("7. displays existing canonical formula metadata from calculation snapshot", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    const formulaEl = screen.getByTestId("canonical-formula-code");
    expect(formulaEl).toHaveTextContent("C_TOTAL = C_ADMIN + C_TRB");
  });

  it("8. displays existing component metrics directly from snapshot (C_ADMIN and C_TRB)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByTestId("component-admin-cost")).toHaveTextContent("$18,000");
    expect(screen.getByTestId("component-trb-cost")).toHaveTextContent("$27,692");
  });

  it("9. displays existing intermediate metrics where available in snapshot", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-btn"));

    expect(screen.getByTestId("intermediate-admin-hours")).toHaveTextContent("208 hrs/yr");
    expect(screen.getByTestId("intermediate-trb-events")).toHaveTextContent("104 events/yr");
    expect(screen.getByTestId("intermediate-inv-hours")).toHaveTextContent("3 hrs/event");
    expect(screen.getByTestId("intermediate-trb-hours")).toHaveTextContent("312 hrs/yr");
    expect(screen.getByTestId("intermediate-hourly-rate")).toHaveTextContent("$86.54/hr");
  });

  it("10. displays source assessment inputs and lineage mapped to questions (Q04, Q06, Q07, Q20)", () => {
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

describe("E2: Financial Exposure / Show the Math", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboardWithRole = (role: string) => {
    const authValue = createMockAuth(role);
    return render(
      <AuthContext.Provider value={authValue as any}>
        <ExecutiveDashboard
          calculation={mockCalculation}
          customer={{ id: "cust-1", name: "Acme Corp" }}
          assessment={{ id: "ass-101", title: "Enterprise MQ Assessment", status: "SUBMITTED" } as any}
          answers={mockAnswers}
        />
      </AuthContext.Provider>
    );
  };

  it("1. renders Financial Exposure metric on dashboard card", () => {
    renderDashboardWithRole("CONSULTANT");
    const exposureVal = screen.getByTestId("dashboard-financial-exposure");
    expect(exposureVal).toBeInTheDocument();
    expect(exposureVal).toHaveTextContent("$825,000");
  });

  it("2. renders Show the Math button on Single-Event Exposure card for authorized CONSULTANT", () => {
    renderDashboardWithRole("CONSULTANT");
    const exposureBtn = screen.getByTestId("show-the-math-exposure-btn");
    expect(exposureBtn).toBeInTheDocument();
    expect(exposureBtn).toHaveTextContent("Show the Math");
  });

  it("3. renders Show the Math button for PLATFORM_ADMIN on Exposure card", () => {
    renderDashboardWithRole("PLATFORM_ADMIN");
    expect(screen.getByTestId("show-the-math-exposure-btn")).toBeInTheDocument();
  });

  it("4. does NOT render Show the Math button on Exposure card for CUSTOMER_USER", () => {
    renderDashboardWithRole("CUSTOMER_USER");
    expect(screen.queryByTestId("show-the-math-exposure-btn")).not.toBeInTheDocument();
  });

  it("5. clicking Show the Math on Exposure card opens the Financial Exposure detail drawer", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Single-Event Financial Exposure Breakdown")).toBeInTheDocument();
  });

  it("6. displays the exact snapshot value for potential_financial_exposure ($825,000)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    const targetVal = screen.getByTestId("target-metric-value");
    expect(targetVal).toHaveTextContent("$825,000");
    expect(screen.getByText("potential_financial_exposure")).toBeInTheDocument();
  });

  it("7. displays existing metric state and canonical formula (EXPOSURE_SINGLE = D_HOURS * R_IMPACT)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    expect(screen.getByText("Valid")).toBeInTheDocument();
    const formulaEl = screen.getByTestId("canonical-formula-code");
    expect(formulaEl).toHaveTextContent("EXPOSURE_SINGLE = D_HOURS * R_IMPACT");
  });

  it("8. displays existing component metrics: D_HOURS (2.75 hrs) and R_IMPACT ($300,000 / hr)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    expect(screen.getByTestId("component-duration-hours")).toHaveTextContent("2.75 hrs");
    expect(screen.getByTestId("component-financial-rate")).toHaveTextContent("$300,000 / hr");
  });

  it("9. distinguishes between Customer Fact and Industry Benchmark / Model Assumption", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    expect(screen.getByTestId("provenance-rate-source")).toHaveTextContent("ITIC $300k/hr Industry Benchmark");
    expect(screen.getByTestId("provenance-duration-source")).toHaveTextContent("Standard Duration Table Lookup");
  });

  it("10. displays input lineage for Q14 (Duration), Q12 (Severity), and Q15 (Hourly Cost Override)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    expect(screen.getByTestId("input-q14")).toHaveTextContent("1.5–4 hours");
    expect(screen.getByTestId("input-q12")).toHaveTextContent("Critical / Significant");
    expect(screen.getByTestId("input-q15")).toHaveTextContent("Unknown / Unprovided");
  });

  it("11. displays ITIC benchmark ($300,000 / hour) and duration lookup mapping table", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    expect(screen.getByTestId("benchmark-itic-rate")).toHaveTextContent("$300,000 / hour");
    expect(screen.getByText("Authoritative Duration Lookup Mapping:")).toBeInTheDocument();
  });

  it("12. displays technical engine version, rule version, snapshot ID, and calculated timestamp", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));

    expect(screen.getByTestId("engine-version")).toHaveTextContent("1.0.0");
    expect(screen.getByTestId("rule-version")).toHaveTextContent("calc-rules-v1.0.0");
    expect(screen.getByTestId("snapshot-id")).toHaveTextContent("snap-abc-12345");
    expect(screen.getByTestId("calculated-at")).toHaveTextContent("2026-09-30T14:00:00Z");
  });

  it("13. closes Financial Exposure drawer via close button and Escape key", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-exposure-btn"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("14. renders Show the Math button on Single-Event Exposure tab and opens drawer", () => {
    renderDashboardWithRole("CONSULTANT");
    // Switch to Single-Event Exposure tab
    const exposureTabBtn = screen.getByRole("tab", { name: /single-event exposure/i });
    fireEvent.click(exposureTabBtn);

    const tabMathBtn = screen.getByTestId("show-the-math-exposure-tab-btn");
    expect(tabMathBtn).toBeInTheDocument();
    fireEvent.click(tabMathBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Single-Event Financial Exposure Breakdown")).toBeInTheDocument();
  });

  it("15. standalone ShowTheMathDrawer with targetMetricKey='potential_financial_exposure' has zero client math", () => {
    const handleClose = vi.fn();
    render(
      <ShowTheMathDrawer
        isOpen={true}
        onClose={handleClose}
        calculation={mockCalculation}
        customerName="Apex Global"
        answers={mockAnswers}
        targetMetricKey="potential_financial_exposure"
      />
    );

    expect(screen.getByTestId("target-metric-value")).toHaveTextContent("$825,000");
    expect(screen.getByTestId("component-duration-hours")).toHaveTextContent("2.75 hrs");
    expect(screen.getByTestId("component-financial-rate")).toHaveTextContent("$300,000 / hr");
  });
});

describe("E3: Show the Math — Recoverable Opportunity & Scenario Explanation", () => {
  it("1. renders Controlled Improvement Scenario metrics on Executive Dashboard", () => {
    renderDashboardWithRole("CONSULTANT");
    expect(screen.getByTestId("dashboard-total-recoverable-hours")).toHaveTextContent("132 hrs");
    expect(screen.getByTestId("dashboard-illustrative-economic-value")).toHaveTextContent("$11,423");
  });

  it("2. renders Show the Math scenario controls for authorized CONSULTANT", () => {
    renderDashboardWithRole("CONSULTANT");
    expect(screen.getByTestId("show-the-math-scenario-btn")).toBeInTheDocument();
    expect(screen.getByTestId("show-the-math-recovered-hours-btn")).toBeInTheDocument();
    expect(screen.getByTestId("show-the-math-opportunity-btn")).toBeInTheDocument();
  });

  it("3. renders Show the Math scenario controls for PLATFORM_ADMIN and PARTNER_ADMIN", () => {
    const { unmount } = renderDashboardWithRole("PLATFORM_ADMIN");
    expect(screen.getByTestId("show-the-math-opportunity-btn")).toBeInTheDocument();
    unmount();

    renderDashboardWithRole("PARTNER_ADMIN");
    expect(screen.getByTestId("show-the-math-opportunity-btn")).toBeInTheDocument();
  });

  it("4. strictly hides Show the Math scenario controls for CUSTOMER_USER", () => {
    renderDashboardWithRole("CUSTOMER_USER");
    expect(screen.queryByTestId("show-the-math-scenario-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("show-the-math-recovered-hours-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("show-the-math-opportunity-btn")).not.toBeInTheDocument();
  });

  it("5. clicking Show the Math on Illustrative Economic Value opens explanation surface", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Recoverable Opportunity & Scenario Breakdown")).toBeInTheDocument();
  });

  it("6. displays exact snapshot value for Illustrative Economic Value ($11,423)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByTestId("target-metric-value")).toHaveTextContent("$11,423");
  });

  it("7. displays existing VALID state and ILLUSTRATIVE_SCENARIO provenance", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getAllByText("Valid").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Illustrative Scenario").length).toBeGreaterThanOrEqual(1);
  });

  it("8. displays canonical formula code for Illustrative Economic Value", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByTestId("canonical-formula-code")).toHaveTextContent("V_ILLUSTRATIVE = H_REC_TOTAL * R_HR");
  });

  it("9. displays recovered hours breakdown (H_REC_ADMIN, H_REC_INV, H_REC_TOTAL) directly from snapshot", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByTestId("scenario-rec-admin-hours")).toHaveTextContent("52 hrs/yr");
    expect(screen.getByTestId("scenario-rec-inv-hours")).toHaveTextContent("80 hrs/yr");
    expect(screen.getByTestId("scenario-total-rec-hours")).toHaveTextContent("132 hrs/yr");
  });

  it("10. clicking Show the Math on Total Recoverable Hours displays total_recovered_hours as hero metric", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-recovered-hours-btn"));

    expect(screen.getByText("Recoverable Labor Hours Breakdown")).toBeInTheDocument();
    expect(screen.getByTestId("target-metric-value")).toHaveTextContent("132");
    expect(screen.getByTestId("canonical-formula-code")).toHaveTextContent("H_REC_TOTAL = H_REC_ADMIN + H_REC_INV");
  });

  it("11. displays isolated Troubleshooting Productivity Opportunity (10% rule) from snapshot", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByTestId("scenario-trb-opp-value")).toHaveTextContent("$2,769");
    expect(screen.getByText(/OPP_TRB = C_TRB \* 0\.10/)).toBeInTheDocument();
  });

  it("12. displays scenario assumptions used from snapshot.assumptions_used", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByTestId("assumption-admin-addressable")).toHaveTextContent("50%");
    expect(screen.getByTestId("assumption-admin-efficiency")).toHaveTextContent("50%");
    expect(screen.getByTestId("assumption-inv-improvement")).toHaveTextContent("25%");
    expect(screen.getByTestId("assumption-trb-opp-share")).toHaveTextContent("10%");
  });

  it("13. displays source questions and assessment inputs lineage (Q04, Q06, Q07, Q20)", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByTestId("input-q04")).toHaveTextContent("1–5 hrs/week");
    expect(screen.getByTestId("input-q06")).toHaveTextContent("2–3 times / week");
    expect(screen.getByTestId("input-q07")).toHaveTextContent("2–4 hours");
    expect(screen.getByTestId("input-q20")).toHaveTextContent("$180,000 / yr (Default)");
  });

  it("14. displays provenance source tiers classification", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByText("Provenance Classification: Source Tiers")).toBeInTheDocument();
    expect(screen.getByText("Assessment Discovery Inputs")).toBeInTheDocument();
    expect(screen.getByText("Approved Improvement Multipliers")).toBeInTheDocument();
  });

  it("15. displays technical engine and rule metadata", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));

    expect(screen.getByTestId("engine-version")).toHaveTextContent("1.0.0");
    expect(screen.getByTestId("rule-version")).toHaveTextContent("calc-rules-v1.0.0");
    expect(screen.getByTestId("snapshot-id")).toHaveTextContent("snap-abc-12345");
    expect(screen.getByTestId("calculated-at")).toHaveTextContent("2026-09-30T14:00:00Z");
  });

  it("16. closes on close button click and on Escape key press", () => {
    renderDashboardWithRole("CONSULTANT");
    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close calculation detail panel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("show-the-math-opportunity-btn"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("17. renders Show the Math button in ScenarioSandbox for authorized users and opens explanation drawer", () => {
    renderDashboardWithRole("CONSULTANT");
    // Switch to Scenario Sandbox tab
    const sandboxTabBtn = screen.getByRole("tab", { name: /scenario sandbox/i });
    fireEvent.click(sandboxTabBtn);

    const sandboxMathBtn = screen.getByTestId("show-the-math-sandbox-btn");
    expect(sandboxMathBtn).toBeInTheDocument();
    fireEvent.click(sandboxMathBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Recoverable Opportunity & Scenario Breakdown")).toBeInTheDocument();
  });

  it("18. standalone ShowTheMathDrawer with targetMetricKey='illustrative_economic_value' has zero client math", () => {
    const handleClose = vi.fn();
    render(
      <ShowTheMathDrawer
        isOpen={true}
        onClose={handleClose}
        calculation={mockCalculation}
        customerName="Apex Global"
        answers={mockAnswers}
        targetMetricKey="illustrative_economic_value"
      />
    );

    expect(screen.getByTestId("target-metric-value")).toHaveTextContent("$11,423");
    expect(screen.getByTestId("scenario-rec-admin-hours")).toHaveTextContent("52 hrs/yr");
    expect(screen.getByTestId("scenario-rec-inv-hours")).toHaveTextContent("80 hrs/yr");
    expect(screen.getByTestId("scenario-total-rec-hours")).toHaveTextContent("132 hrs/yr");
    expect(screen.getByTestId("scenario-illustrative-value")).toHaveTextContent("$11,423");
    expect(screen.getByTestId("scenario-trb-opp-value")).toHaveTextContent("$2,769");
  });
});
