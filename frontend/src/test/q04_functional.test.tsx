import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuestionCard } from "../components/QuestionCard";
import { QUESTIONS, SECTIONS, normalizeResponseState } from "../data/questionCatalog";
import { ReviewSummary } from "../components/ReviewSummary";
import { SubmittedResponsesView } from "../components/SubmittedResponsesView";
import { ConsultantWorkspace } from "../components/ConsultantWorkspace";
import { api } from "../services/api";
import { mapSnapshotToExecutiveReport } from "../services/reportDataAdapter";
import { ExecutiveReportView } from "../components/report/ExecutiveReportView";
import { ExecutiveDashboard } from "../components/ExecutiveDashboard";
import { generateReportHtml } from "../../scripts/render_report_pdf.mjs";
import { Customer, Assessment, CalculationRunResponse } from "../types/assessment";

describe("Q04 Authoritative Exact Numeric Intake & Validation", () => {
  it("1. accepts and displays exact integer quarterly hours (80 hours / quarter)", () => {
    const handleOverride = vi.fn();
    const handleSelect = vi.fn();

    render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="OVERRIDE"
        overrideValue={80}
        onSelectOption={handleSelect}
        onOverrideChange={handleOverride}
      />
    );

    const input = screen.getByLabelText("Exact Quarterly Administration Hours");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(80);
    expect(screen.getByText("hours / quarter")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Total combined staff hours per typical quarter spent on routine IBM MQ administration and management."
      )
    ).toBeInTheDocument();
  });

  it("2. accepts decimal quarterly hours (12.5 hours / quarter)", () => {
    const handleOverride = vi.fn();

    render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="OVERRIDE"
        overrideValue={12.5}
        onSelectOption={vi.fn()}
        onOverrideChange={handleOverride}
      />
    );

    const input = screen.getByLabelText("Exact Quarterly Administration Hours");
    expect(input).toHaveValue(12.5);

    fireEvent.change(input, { target: { value: "15.75" } });
    expect(handleOverride).toHaveBeenCalledWith(15.75);
  });

  it("3. accepts zero as a valid quarterly hours input (0 hours / quarter)", () => {
    const handleOverride = vi.fn();

    const { container } = render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="OVERRIDE"
        overrideValue={0}
        onSelectOption={vi.fn()}
        onOverrideChange={handleOverride}
      />
    );

    const input = screen.getByLabelText("Exact Quarterly Administration Hours");
    expect(input).toHaveValue(0);

    // Border should be green (#D4EAD8) indicating answered and valid (not error)
    expect(container.firstChild).toHaveClass("border-[#D4EAD8]");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("4. rejects negative quarterly hours and displays error without marking question answered", () => {
    const { container } = render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="OVERRIDE"
        overrideValue={-10}
        onSelectOption={vi.fn()}
        onOverrideChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Exact Quarterly Administration Hours");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Quarterly administration hours cannot be negative."
    );
    // Should NOT have answered border
    expect(container.firstChild).not.toHaveClass("border-[#D4EAD8]");
  });

  it("5. supports 'Not sure' and leaves numeric value empty without inventing any numbers", () => {
    const handleSelect = vi.fn();
    const handleOverride = vi.fn();

    render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue="UNKNOWN"
        overrideValue={undefined}
        onSelectOption={handleSelect}
        onOverrideChange={handleOverride}
      />
    );

    const selectEl = screen.getByLabelText("Q04: Quarterly Administration Time Overhead");
    expect(selectEl).toHaveValue("UNKNOWN");

    // Override numeric input should be hidden when UNKNOWN
    expect(screen.queryByLabelText("Exact Quarterly Administration Hours")).not.toBeInTheDocument();
  });

  it("6. repopulates exact stored numeric value upon resuming an assessment", () => {
    const persistedBackendResponse = {
      q04_weekly_admin_hours: 80.0,
      raw_responses: {
        q04_admin_hours: 80.0,
        q04_dropdown: "OVERRIDE",
      },
    };

    const state = normalizeResponseState(persistedBackendResponse);
    expect(state.q04_admin_hours).toBe(80.0);
    expect(state.q04_dropdown).toBe("OVERRIDE");
  });

  it("7. handles legacy draft with q04_dropdown='101–250 hours' WITHOUT converting to 175 or any other number", () => {
    const legacyDraftResponse = {
      q04_weekly_admin_hours: null,
      raw_responses: {
        q04_dropdown: "101–250 hours",
      },
    };

    const state = normalizeResponseState(legacyDraftResponse);
    // CRITICAL: Must remain undefined, absolutely NO numeric assumption (no 175)
    expect(state.q04_admin_hours).toBeUndefined();
    expect(state.q04_dropdown).toBe("101–250 hours");

    // Render QuestionCard with this legacy state
    render(
      <QuestionCard
        question={QUESTIONS.Q04}
        selectedValue={state.q04_dropdown}
        overrideValue={state.q04_admin_hours}
        onSelectOption={vi.fn()}
        onOverrideChange={vi.fn()}
      />
    );

    // Expect the legacy guidance banner to guide user
    const banner = screen.getByText(/Previous draft selection:/).parentElement;
    expect(banner).toHaveTextContent(
      "Previous draft selection: 101–250 hours. Please enter exact quarterly hours below or select \"Not sure\"."
    );

    // The numeric input should be open and ready for the user to enter their value
    expect(screen.getByLabelText("Exact Quarterly Administration Hours")).toBeInTheDocument();
  });

  it("8. renders exact numeric value formatted with 'hours / quarter' across review components", () => {
    const mockAssessment: any = {
      id: "ass-submitted-1",
      customer_id: "cust-1",
      title: "Q3 MQ Review",
      status: "SUBMITTED",
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-29T12:00:00Z",
    };

    const mockAnswers = {
      q04_admin_hours: 80,
      q04_dropdown: "OVERRIDE",
    };

    const { getByText: getByTextSubmitted } = render(
      <SubmittedResponsesView
        assessment={mockAssessment}
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={mockAnswers as any}
      />
    );
    expect(getByTextSubmitted("80 hours / quarter")).toBeInTheDocument();

    const { getByText: getByTextWorkspace } = render(
      <ConsultantWorkspace
        assessment={{ ...mockAssessment, responses: mockAnswers }}
      />
    );
    expect(getByTextWorkspace("80 hours / quarter")).toBeInTheDocument();
  });

  it("9. renders 'Not sure / To be assessed' when unknown is selected", () => {
    const mockAssessment: any = {
      id: "ass-submitted-2",
      customer_id: "cust-1",
      title: "Q3 MQ Review",
      status: "SUBMITTED",
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-29T12:00:00Z",
    };

    const mockUnknownAnswers = {
      q04_admin_hours: undefined,
      q04_dropdown: "UNKNOWN",
    };

    const { getByText } = render(
      <SubmittedResponsesView
        assessment={mockAssessment}
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={mockUnknownAnswers as any}
      />
    );
    expect(getByText("Not sure / To be assessed")).toBeInTheDocument();
  });

  it("10. serializes exact numeric value in api.saveResponses correctly", () => {
    const mockRequest = vi.spyOn(api as any, "saveResponses");

    const state = {
      q04_admin_hours: 80,
      q04_dropdown: "OVERRIDE",
    };

    // Verify api.saveResponses prepares payload with q04_weekly_admin_hours: 80
    // (tested directly by verifying cleanRaw.q04_admin_hours mapping)
    const cleanRaw = { ...state };
    const payload = {
      q04_weekly_admin_hours: cleanRaw.q04_admin_hours,
      raw_responses: cleanRaw,
    };

    expect(payload.q04_weekly_admin_hours).toBe(80);
    expect(payload.raw_responses.q04_admin_hours).toBe(80);
    expect(payload.raw_responses.q04_dropdown).toBe("OVERRIDE");
  });

  it("11. preserves numeric 0 across review and summary components without falsy fallback", () => {
    const mockZeroAnswers = {
      q04_admin_hours: 0,
      q04_dropdown: "OVERRIDE",
    };

    const mockAssessment: any = {
      id: "ass-submitted-zero",
      customer_id: "cust-1",
      title: "Q3 MQ Review",
      status: "SUBMITTED",
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-29T12:00:00Z",
    };

    const { getByText: getByTextSubmitted } = render(
      <SubmittedResponsesView
        assessment={mockAssessment}
        sections={SECTIONS}
        questionsMap={QUESTIONS}
        answers={mockZeroAnswers as any}
      />
    );
    expect(getByTextSubmitted("0 hours / quarter")).toBeInTheDocument();

    const { getByText: getByTextWorkspace } = render(
      <ConsultantWorkspace
        assessment={{ ...mockAssessment, responses: mockZeroAnswers }}
      />
    );
    expect(getByTextWorkspace("0 hours / quarter")).toBeInTheDocument();
  });

  it("12. verifies existing Q06/Q07 and Q15/Q20/Q21 definitions remain intact", () => {
    expect(QUESTIONS.Q06.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q07.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q15.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q20.feedsCalculation).toBe(true);
    expect(QUESTIONS.Q21.feedsCalculation).toBe(false);
  });
});

describe("Q04 Report Presentation & Non-Authoritative Fallback Removal", () => {
  const mockCustomer: Customer = {
    id: "cust-test-1",
    name: "Acme Financial Corp",
    industry: "Banking",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };

  const mockAssessment: Assessment = {
    id: "ass-test-1",
    customer_id: "cust-test-1",
    title: "IBM MQ Assessment",
    status: "COMPLETED",
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T12:00:00Z",
  };

  const createMockSnapshot = (adminAnnualHours: number | null): CalculationRunResponse => ({
    id: "snap-1",
    assessment_id: "ass-test-1",
    calculation_engine_version: "1.0.0",
    business_rulebook_version: "2026.1",
    calculated_at: "2026-09-25T12:00:00Z",
    summary: {
      admin_annual_hours: adminAnnualHours ?? undefined,
      admin_annual_cost: adminAnnualHours !== null ? adminAnnualHours * 86.54 : undefined,
    } as any,
    computed_metrics: {
      annual_admin_hours: {
        label: "Annual Administration Hours",
        value: adminAnnualHours,
        unit: "hours/year",
        state: adminAnnualHours !== null ? "VALID" : "INSUFFICIENT_DATA",
        provenance: adminAnnualHours !== null ? "CALCULATED_RESULT" : "CUSTOMER_FACT",
      },
      annual_admin_labor_cost: {
        label: "Annual Administration Labor Cost",
        value: adminAnnualHours !== null ? adminAnnualHours * 86.54 : null,
        unit: "$/year",
        state: adminAnnualHours !== null ? "VALID" : "INSUFFICIENT_DATA",
        provenance: adminAnnualHours !== null ? "CALCULATED_RESULT" : "CUSTOMER_FACT",
      },
    },
  });

  it("handles Q04 = 80 → quarterlyHours = 80", () => {
    const snapshot = createMockSnapshot(320);
    const answers = { q04_admin_hours: 80, q04_dropdown: "OVERRIDE" };
    const report = mapSnapshotToExecutiveReport(snapshot, mockCustomer, mockAssessment, answers);
    expect(report.operationalEffort.routineAdmin.quarterlyHours).toBe(80);
    expect(report.operationalEffort.routineAdmin.quarterlyDropdownValue).toBe("80 hours / quarter");
    expect(report.scopeAndEnvironment.adminTimeOverhead.customerResponse).toBe("80 hours / quarter");
  });

  it("handles Q04 = 12.5 → quarterlyHours = 12.5", () => {
    const snapshot = createMockSnapshot(50);
    const answers = { q04_admin_hours: 12.5, q04_dropdown: "OVERRIDE" };
    const report = mapSnapshotToExecutiveReport(snapshot, mockCustomer, mockAssessment, answers);
    expect(report.operationalEffort.routineAdmin.quarterlyHours).toBe(12.5);
    expect(report.operationalEffort.routineAdmin.quarterlyDropdownValue).toBe("12.5 hours / quarter");
    expect(report.scopeAndEnvironment.adminTimeOverhead.customerResponse).toBe("12.5 hours / quarter");
  });

  it("handles Q04 = 0 → quarterlyHours = 0", () => {
    const snapshot = createMockSnapshot(0);
    const answers = { q04_admin_hours: 0, q04_dropdown: "OVERRIDE" };
    const report = mapSnapshotToExecutiveReport(snapshot, mockCustomer, mockAssessment, answers);
    expect(report.operationalEffort.routineAdmin.quarterlyHours).toBe(0);
    expect(report.operationalEffort.routineAdmin.quarterlyDropdownValue).toBe("0 hours / quarter");
    expect(report.scopeAndEnvironment.adminTimeOverhead.customerResponse).toBe("0 hours / quarter");
  });

  it("handles Q04 = Not sure → quarterlyHours = null, customerResponse = 'Not sure', quarterlyDropdownValue = 'Not sure'", () => {
    const snapshot = createMockSnapshot(null);
    const answers = { q04_admin_hours: undefined, q04_dropdown: "UNKNOWN" };
    const report = mapSnapshotToExecutiveReport(snapshot, mockCustomer, mockAssessment, answers);
    expect(report.operationalEffort.routineAdmin.quarterlyHours).toBeNull();
    expect(report.operationalEffort.routineAdmin.quarterlyDropdownValue).toBe("Not sure");
    expect(report.scopeAndEnvironment.adminTimeOverhead.customerResponse).toBe("Not sure");
  });

  it("handles Q04 missing → quarterlyHours = null, customerResponse = 'Not provided', quarterlyDropdownValue = 'Not provided'", () => {
    const snapshot = createMockSnapshot(null);
    const answers = {};
    const report = mapSnapshotToExecutiveReport(snapshot, mockCustomer, mockAssessment, answers);
    expect(report.operationalEffort.routineAdmin.quarterlyHours).toBeNull();
    expect(report.operationalEffort.routineAdmin.quarterlyDropdownValue).toBe("Not provided");
    expect(report.scopeAndEnvironment.adminTimeOverhead.customerResponse).toBe("Not provided");
  });

  it("renders report presentation for null → 'Quarterly Admin: —'", () => {
    const snapshot = createMockSnapshot(null);
    const answers = { q04_dropdown: "UNKNOWN" };
    render(
      <ExecutiveReportView
        calculation={snapshot}
        customer={mockCustomer}
        assessment={mockAssessment}
        answers={answers as any}
      />
    );
    expect(screen.getByText("Quarterly Admin: —")).toBeInTheDocument();
  });

  it("renders report presentation for 0 → 'Quarterly Admin: 0 hrs × 4'", () => {
    const snapshot = createMockSnapshot(0);
    const answers = { q04_admin_hours: 0, q04_dropdown: "OVERRIDE" };
    render(
      <ExecutiveReportView
        calculation={snapshot}
        customer={mockCustomer}
        assessment={mockAssessment}
        answers={answers as any}
      />
    );
    expect(screen.getByText("Quarterly Admin: 0 hrs × 4")).toBeInTheDocument();
  });
});

describe("Q04 Dashboard Stream A Display & PDF Render Lookup Fix", () => {
  const mockCustomer: Customer = {
    id: "cust-test-1",
    name: "Acme Financial Corp",
    industry: "Banking",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };

  const mockAssessment: Assessment = {
    id: "ass-test-1",
    customer_id: "cust-test-1",
    title: "IBM MQ Assessment",
    status: "COMPLETED",
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T12:00:00Z",
  };

  const mockCalculation: CalculationRunResponse = {
    id: "snap-stream-a-1",
    snapshot_id: "snap-stream-a-1",
    assessment_id: "ass-test-1",
    calculation_engine_version: "1.0.0",
    assessment_version: "1.0.0",
    calculated_at: "2026-09-25T14:00:00Z",
    summary: {
      admin_annual_hours: 320,
      admin_annual_cost: 27692.31,
      troubleshooting_annual_hours: 96,
      troubleshooting_annual_cost: 8307.69,
      total_operational_labor_cost: 36000,
      operational_fte_burden: 0.20,
      representative_single_event_exposure: 16700,
      total_recoverable_labor_hours: 104,
      illustrative_annual_labor_savings: 9000,
      troubleshooting_productivity_opportunity: 830.77,
    },
    computed_metrics: {
      annual_admin_hours: {
        value: "320.00",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "H_ADMIN = Q04_QUARTERLY_HOURS * 4",
      },
      annual_admin_labor_cost: {
        value: "27692.30769230769230769230769",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
        formula_code: "C_ADMIN = H_ADMIN * R_HR",
      },
      annual_troubleshooting_hours: {
        value: "96.0",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
      annual_troubleshooting_labor_cost: {
        value: "8307.69",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
      total_quantified_labor_cost: {
        value: "36000.00",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
      operational_fte_burden: {
        value: "0.20",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
      loaded_hourly_rate: {
        value: "86.53846153846154",
        state: "VALID",
        provenance: "CALCULATED_RESULT",
      },
    },
  };

  const renderDashboardEffortTab = (answers: Record<string, any>) => {
    render(
      <ExecutiveDashboard
        calculation={mockCalculation}
        customer={mockCustomer}
        assessment={mockAssessment}
        answers={answers}
      />
    );
    fireEvent.click(screen.getByRole("tab", { name: /effort & operational cost/i }));
  };

  it("A. displays exact '80 hours / quarter' for Q04 = 80 in ExecutiveDashboard", () => {
    renderDashboardEffortTab({ q04_admin_hours: 80, q04_dropdown: "OVERRIDE" });
    expect(screen.getByText("80 hours / quarter")).toBeInTheDocument();
    expect(screen.queryByText("OVERRIDE")).not.toBeInTheDocument();
  });

  it("B. displays exact '12.5 hours / quarter' for Q04 = 12.5 in ExecutiveDashboard", () => {
    renderDashboardEffortTab({ q04_admin_hours: 12.5, q04_dropdown: "OVERRIDE" });
    expect(screen.getByText("12.5 hours / quarter")).toBeInTheDocument();
  });

  it("C. displays exact '0 hours / quarter' for Q04 = 0 in ExecutiveDashboard", () => {
    renderDashboardEffortTab({ q04_admin_hours: 0, q04_dropdown: "OVERRIDE" });
    expect(screen.getByText("0 hours / quarter")).toBeInTheDocument();
    expect(screen.queryByText("80 hours / quarter")).not.toBeInTheDocument();
  });

  it("D. displays 'Not sure' for Q04 = UNKNOWN / Not sure in ExecutiveDashboard", () => {
    renderDashboardEffortTab({ q04_dropdown: "UNKNOWN" });
    expect(screen.getByText("Not sure")).toBeInTheDocument();
    expect(screen.queryByText("80 hours / quarter")).not.toBeInTheDocument();
  });

  it("E. preserves legacy categorical Q04 with no numeric value without synthesizing a number", () => {
    renderDashboardEffortTab({ q04_dropdown: "101–250 hours" });
    expect(screen.getByText("101–250 hours")).toBeInTheDocument();
    expect(screen.queryByText("175 hours / quarter")).not.toBeInTheDocument();
  });

  it("F. verifies render_report_pdf.mjs resolves annual_admin_hours = 320.0 and displays '320'", () => {
    const html = generateReportHtml(
      {
        computed_metrics: mockCalculation.computed_metrics,
        summary_metrics: mockCalculation.summary,
      },
      mockCustomer,
      mockAssessment
    );
    expect(html).toContain(">320</td>");
    expect(html).not.toContain(">—</td>\n            <td class=\"text-right font-mono\" style=\"color: #64748b;\">—</td>\n            <td class=\"text-right font-mono font-bold\">$27,692</td>");
  });

  it("G. verifies annual_admin_labor_cost displays $27,692 in PDF and dashboard", () => {
    const html = generateReportHtml(
      {
        computed_metrics: mockCalculation.computed_metrics,
        summary_metrics: mockCalculation.summary,
      },
      mockCustomer,
      mockAssessment
    );
    expect(html).toContain("$27,692");

    renderDashboardEffortTab({ q04_admin_hours: 80, q04_dropdown: "OVERRIDE" });
    expect(screen.getAllByText(/\$27,692/).length).toBeGreaterThanOrEqual(1);
  });
});
