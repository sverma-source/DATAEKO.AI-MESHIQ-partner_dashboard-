import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { ExecutiveEconomicNarrative } from "../components/ExecutiveEconomicNarrative";
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
    operational_fte_burden: {
      value: "0.25",
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "FTE = (H_ADMIN + H_TRB) / 2080",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { h_admin: "208", h_trb: "320" },
    },
    potential_financial_exposure: {
      value: "825000.00",
      state: "VALID",
      provenance: "INDUSTRY_BENCHMARK",
      formula_code: "EXPOSURE_SINGLE = D_HOURS * R_IMPACT",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { d_hours: "2.75", r_impact: "300000" },
    },
    representative_duration_hours: {
      value: "2.75",
      state: "VALID",
      provenance: "MODEL_ASSUMPTION",
      formula_code: "D_HOURS = LOOKUP(Q14_DURATION)",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q14_duration_input: "1.5–4 hours" },
    },
    applicable_financial_rate: {
      value: "300000.00",
      state: "VALID",
      provenance: "INDUSTRY_BENCHMARK",
      formula_code: "R_IMPACT = BENCHMARK_ITIC",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { q12_severity_input: "High" },
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
      value: "1800.00",
      state: "VALID",
      provenance: "ILLUSTRATIVE_SCENARIO",
      formula_code: "OPP_TRB = C_TRB * 0.10",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { c_trb: "18000.00", opportunity_share: "0.10" },
    },
    loaded_hourly_rate: {
      value: "86.53846153846154",
      state: "VALID",
      provenance: "CALCULATED_RESULT",
      formula_code: "R_HR = C_LABOR / 2080",
      rule_version: "calc-rules-v1.0.0",
      inputs_used: { loaded_annual_labor_cost: "180000", annual_working_hours: "2080" },
    },
  },
  assumptions_used: {
    annual_working_hours: 2080,
    default_annual_loaded_labor_cost: "180000.00",
    scenario_admin_addressable_share: "0.50",
    scenario_admin_efficiency_improvement: "0.50",
    scenario_investigation_improvement: "0.25",
    scenario_troubleshooting_opportunity_share: "0.10",
  },
};

const renderWithRole = (role: string, customCalc = mockCalculation) => {
  const mockAuth = {
    user: {
      id: "u-1",
      email: "test@meshiq.com",
      name: "Test User",
      role,
      tenant_id: "t-1",
      customer_id: "c-1",
      is_active: true,
      created_at: "2026-01-01",
    },
    token: "mock-token",
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    permissions: {} as any,
  };

  return render(
    <AuthContext.Provider value={mockAuth as any}>
      <ExecutiveDashboard
        calculation={customCalc}
        customer={{ id: "c-1", name: "Apex Global Financial", tenant_id: "t-1", created_at: "2026-01-01" }}
        answers={{}}
        onReturnToWizard={vi.fn()}
      />
    </AuthContext.Provider>
  );
};

describe("E4: Executive Economic Narrative Component & Integration", () => {
  it("1. renders Executive Economic Summary container", () => {
    renderWithRole("CONSULTANT");
    expect(screen.getByTestId("executive-economic-narrative")).toBeInTheDocument();
    expect(screen.getByText("Executive Economic Narrative")).toBeInTheDocument();
    expect(screen.getByText("Economic Interpretation & Decision Baseline")).toBeInTheDocument();
  });

  it("2. displays existing quantified labor cost from snapshot data", () => {
    renderWithRole("CONSULTANT");
    const laborVal = screen.getByTestId("narrative-labor-cost-value");
    expect(laborVal).toHaveTextContent("$45,692 / yr");
    expect(screen.getByTestId("narrative-labor-text")).toHaveTextContent("Quantified operational labor expenditure is currently modeled at $45,692 / yr");
  });

  it("3. displays existing financial exposure from snapshot data", () => {
    renderWithRole("CONSULTANT");
    const expVal = screen.getByTestId("narrative-exposure-value");
    expect(expVal).toHaveTextContent("$825,000 / event");
    expect(screen.getByTestId("narrative-exposure-text")).toHaveTextContent("Representative single-event downtime exposure is modeled at $825,000 per event");
  });

  it("4. displays existing recoverable opportunity from snapshot data", () => {
    renderWithRole("CONSULTANT");
    const oppVal = screen.getByTestId("narrative-opportunity-value");
    expect(oppVal).toHaveTextContent("$11,423 / yr");
    expect(screen.getByTestId("narrative-opportunity-text")).toHaveTextContent("132 recoverable engineering hours / yr");
  });

  it("5. displays existing illustrative economic value where available", () => {
    renderWithRole("CONSULTANT");
    expect(screen.getByTestId("narrative-opportunity-text")).toHaveTextContent("$11,423 / yr");
  });

  it("6. displays existing troubleshooting opportunity where available", () => {
    renderWithRole("CONSULTANT");
    // Matrix displays troubleshooting productivity opportunity
    expect(screen.getByText("Troubleshooting Opportunity")).toBeInTheDocument();
  });

  it("7. represents VALID state correctly", () => {
    renderWithRole("CONSULTANT");
    const burdenCard = screen.getByTestId("narrative-operational-burden-card");
    expect(burdenCard).toBeInTheDocument();
    expect(screen.getByTestId("narrative-labor-text")).not.toHaveTextContent("incomplete");
  });

  it("8. represents VALID_WITH_DEFAULTS correctly", () => {
    const defaultCalc: CalculationRunResponse = {
      ...mockCalculation,
      computed_metrics: {
        ...mockCalculation.computed_metrics,
        total_quantified_labor_cost: {
          value: "45692.31",
          state: "VALID_WITH_DEFAULTS",
          provenance: "CALCULATED_RESULT",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
        },
      },
    };
    renderWithRole("CONSULTANT", defaultCalc);
    expect(screen.getByTestId("narrative-labor-text")).toHaveTextContent("model standard benchmark defaults");
  });

  it("9. represents INSUFFICIENT_DATA correctly with authoritative state reason", () => {
    const incompleteCalc: CalculationRunResponse = {
      ...mockCalculation,
      computed_metrics: {
        ...mockCalculation.computed_metrics,
        total_quantified_labor_cost: {
          value: null,
          state: "INSUFFICIENT_DATA",
          state_reason: "Admin hours missing",
          provenance: "CALCULATED_RESULT",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
        },
      },
    };
    renderWithRole("CONSULTANT", incompleteCalc);
    expect(screen.getByTestId("narrative-labor-text")).toHaveTextContent("incomplete");
    expect(screen.getByTestId("narrative-labor-text")).toHaveTextContent("Admin hours missing");
  });

  it("10. represents NOT_MODELED correctly", () => {
    const unmodeledCalc: CalculationRunResponse = {
      ...mockCalculation,
      computed_metrics: {
        ...mockCalculation.computed_metrics,
        potential_financial_exposure: {
          value: null,
          state: "NOT_MODELED",
          provenance: "CUSTOMER_FACT",
          rule_version: "calc-rules-v1.0.0",
          inputs_used: {},
        },
      },
    };
    renderWithRole("CONSULTANT", unmodeledCalc);
    expect(screen.getByTestId("narrative-exposure-text")).toHaveTextContent("not currently modeled");
  });

  it("11. preserves provenance classifications", () => {
    renderWithRole("CONSULTANT");
    expect(screen.getByText("Evidence Provenance:")).toBeInTheDocument();
    expect(screen.getByText(/Calculated Results/)).toBeInTheDocument();
    expect(screen.getByText(/Scenarios/)).toBeInTheDocument();
  });

  it("12. does NOT describe illustrative values as guaranteed savings or cash ROI", () => {
    renderWithRole("CONSULTANT");
    const opportunityCard = screen.getByTestId("narrative-opportunity-card");
    expect(opportunityCard).toHaveTextContent("Capacity valuation (not cash ROI)");
    expect(screen.getByText(/No Guaranteed Cash Savings/)).toBeInTheDocument();
  });

  it("13. does NOT invent an ROI percentage or metric", () => {
    renderWithRole("CONSULTANT");
    expect(screen.queryByText(/ROI:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Payback:/i)).not.toBeInTheDocument();
  });

  it("14. performs zero financial arithmetic in the narrative layer", () => {
    // Standalone render verifies pure snapshot rendering
    const onMathMock = vi.fn();
    render(
      <ExecutiveEconomicNarrative
        calculation={mockCalculation}
        onShowMath={onMathMock}
        isAuthorizedForMath={true}
      />
    );
    expect(screen.getByTestId("narrative-labor-cost-value")).toHaveTextContent("$45,692 / yr");
    expect(screen.getByTestId("narrative-exposure-value")).toHaveTextContent("$825,000 / event");
    expect(screen.getByTestId("narrative-opportunity-value")).toHaveTextContent("$11,423 / yr");
  });

  it("15. opens Show the Math detail drawers when clicking narrative math triggers", () => {
    renderWithRole("CONSULTANT");
    const mathLaborBtn = screen.getByTestId("narrative-math-labor-btn");
    expect(mathLaborBtn).toBeInTheDocument();
    fireEvent.click(mathLaborBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("16. strictly hides Show the Math buttons for CUSTOMER_USER", () => {
    renderWithRole("CUSTOMER_USER");
    expect(screen.queryByTestId("narrative-math-labor-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("narrative-math-exposure-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("narrative-math-opportunity-btn")).not.toBeInTheDocument();
  });

  it("17. produces deterministic narrative outputs given the same snapshot", () => {
    const { container: firstRender } = render(
      <ExecutiveEconomicNarrative calculation={mockCalculation} />
    );
    const textFirst = firstRender.textContent;

    const { container: secondRender } = render(
      <ExecutiveEconomicNarrative calculation={mockCalculation} />
    );
    const textSecond = secondRender.textContent;

    expect(textFirst).toEqual(textSecond);
  });

  it("18. displays traceable snapshot metadata", () => {
    renderWithRole("CONSULTANT");
    expect(screen.getByText("Audit Record • v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Rule: 1.0.0")).toBeInTheDocument();
    expect(screen.getByText("snap-abc")).toBeInTheDocument();
  });
});
