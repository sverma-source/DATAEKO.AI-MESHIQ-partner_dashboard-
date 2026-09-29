import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ConsultantWorkspace } from "../components/ConsultantWorkspace";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    listAssessments: vi.fn(),
    listCustomers: vi.fn(),
    getAssessment: vi.fn(),
    getLatestSnapshot: vi.fn(),
    getAssessmentPdfUrl: vi.fn().mockReturnValue("/api/v1/assessments/ass-101/deliverables/pdf"),
    getAssessmentCsvUrl: vi.fn().mockReturnValue("/api/v1/assessments/ass-101/deliverables/csv"),
  },
}));

describe("ConsultantWorkspace Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  const renderConsultantWorkspace = () => {
    const authValue: any = {
      user: {
        id: "consultant-user-id",
        email: "consultant@dataeko.ai",
        full_name: "Lead Consultant",
        role: "CONSULTANT",
        tenant_id: "00000000-0000-0000-0000-000000000001",
        is_active: true,
      },
      permissions: ["customer:read", "assessment:read", "snapshot:read"],
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockReturnValue(true),
      hasRole: vi.fn().mockReturnValue(true),
      refreshUser: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={authValue}>
        <ConsultantWorkspace />
      </AuthContext.Provider>
    );
  };

  it("renders empty state when no assessments are authorized in tenant", async () => {
    vi.mocked(api.listAssessments).mockResolvedValueOnce([]);
    vi.mocked(api.listCustomers).mockResolvedValueOnce([]);

    renderConsultantWorkspace();

    await waitFor(() => {
      expect(screen.getByText("No assessments are currently available in your authorized workspace.")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Customer & Assessment Portfolio" })).toBeInTheDocument();
  });

  it("renders portfolio table with assessments, customer context, and status badges", async () => {
    const mockAssessments = [
      {
        id: "ass-101",
        customer_id: "cust-1",
        title: "Acme Corp MQ Assessment",
        status: "SUBMITTED" as const,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-15T00:00:00Z",
        tenant_id: "tenant-1",
        assessment_version: "1.0.0",
      },
      {
        id: "ass-102",
        customer_id: "cust-2",
        title: "Beta Bank Intake Session",
        status: "DRAFT" as const,
        created_at: "2026-09-10T00:00:00Z",
        updated_at: "2026-09-12T00:00:00Z",
        tenant_id: "tenant-1",
        assessment_version: "1.0.0",
      },
    ];

    const mockCustomers = [
      { id: "cust-1", name: "Acme Corporation", industry: "Financial Services" },
      { id: "cust-2", name: "Beta Bank International", industry: "Banking" },
    ];

    vi.mocked(api.listAssessments).mockResolvedValueOnce(mockAssessments as any);
    vi.mocked(api.listCustomers).mockResolvedValueOnce(mockCustomers as any);

    renderConsultantWorkspace();

    await waitFor(() => {
      expect(screen.getByText("Acme Corporation")).toBeInTheDocument();
      expect(screen.getByText("Beta Bank International")).toBeInTheDocument();
    });

    expect(screen.getByText("Acme Corp MQ Assessment")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("opens a submitted assessment and renders the 12-section economic summary with authoritative metrics", async () => {
    const mockAssessmentDetail = {
      id: "ass-101",
      customer_id: "cust-1",
      title: "Acme Corp MQ Assessment",
      status: "SUBMITTED" as const,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      tenant_id: "tenant-1",
      assessment_version: "1.0.0",
      customer: { id: "cust-1", name: "Acme Corporation", industry: "Financial Services" },
      response: {
        id: "resp-1",
        assessment_id: "ass-101",
        raw_responses: {
          q01_scale: "11–25",
          q01_override: 18,
          q02_staffing: "3–5",
          q03_staffing_model: "Centralized dedicated MQ team",
          q04_admin_hours: 80,
          q06_frequency: "About monthly (12/yr)",
          q07_labor_hours: "3–5 hours (4.0 hrs)",
          q12_business_impact: "Critical / Significant",
          q14_disruption_duration: "46–90 minutes (1.13 hrs)",
          q20_use_default: true,
          q21_annual_mq_spend: 450000,
        },
      },
    };

    const mockSnapshot = {
      id: "snap-abc-12345678",
      assessment_id: "ass-101",
      tenant_id: "tenant-1",
      calculation_engine_version: "1.0.0",
      assessment_version: "1.0.0",
      calculated_at: "2026-09-15T12:00:00Z",
      created_at: "2026-09-15T12:00:00Z",
      normalized_inputs: {},
      summary_metrics: {
        admin_annual_hours: 320,
        admin_annual_cost: 27692,
        troubleshooting_annual_hours: 48,
        troubleshooting_annual_cost: 4154,
        total_operational_labor_cost: 31846,
        operational_fte_burden: 0.18,
        representative_single_event_exposure: 340000,
        total_recoverable_labor_hours: 92,
        illustrative_annual_labor_savings: 7962,
        troubleshooting_productivity_opportunity: 415,
      },
      computed_metrics: {
        total_operational_labor_cost: {
          value: 31846,
          state: "VALID",
          provenance: "CALCULATED_RESULT",
          rule_version: "v1.0.0",
          inputs_used: {},
        },
        operational_fte_burden: {
          value: 0.18,
          state: "VALID",
          provenance: "CALCULATED_RESULT",
          rule_version: "v1.0.0",
          inputs_used: {},
        },
        representative_single_event_exposure: {
          value: 340000,
          state: "VALID",
          provenance: "CALCULATED_RESULT",
          rule_version: "v1.0.0",
          inputs_used: {},
        },
        customer_reported_mq_spend: {
          value: 450000,
          state: "VALID",
          provenance: "CUSTOMER_FACT",
          rule_version: "v1.0.0",
          inputs_used: {},
        },
        improvement_scenario_economic_value: {
          value: 7962,
          state: "VALID",
          provenance: "SCENARIO_PROJECTION",
          rule_version: "v1.0.0",
          inputs_used: {},
        },
        improvement_scenario_recoverable_total_hours: {
          value: 92,
          state: "VALID",
          provenance: "SCENARIO_PROJECTION",
          rule_version: "v1.0.0",
          inputs_used: {},
        },
      },
      assumptions_used: {},
      benchmarks_used: {},
      provenance_summary: {},
    };

    vi.mocked(api.listAssessments).mockResolvedValueOnce([mockAssessmentDetail as any]);
    vi.mocked(api.listCustomers).mockResolvedValueOnce([mockAssessmentDetail.customer as any]);
    vi.mocked(api.getAssessment).mockResolvedValueOnce(mockAssessmentDetail as any);
    vi.mocked(api.getLatestSnapshot).mockResolvedValueOnce(mockSnapshot as any);

    renderConsultantWorkspace();

    await waitFor(() => {
      expect(screen.getByText("Open Assessment")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Open Assessment"));

    await waitFor(() => {
      expect(screen.getByTestId("consultant-economic-summary")).toBeInTheDocument();
    });

    // Verify 12-Section Header and Authoritative Metrics
    expect(screen.getByText("Executive Summary & Core Economic Baseline")).toBeInTheDocument();
    expect(screen.getAllByText("$31,846").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0.18 FTE").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$340,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$450,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$7,962").length).toBeGreaterThanOrEqual(1);

    // Verify Section titles
    expect(screen.getByText("Assessment Scope & Environment Baseline")).toBeInTheDocument();
    expect(screen.getByText("Operational Effort & Labor Cost Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Single-Event Business Exposure")).toBeInTheDocument();
    expect(screen.getByText("Customer-Reported MQ Spend")).toBeInTheDocument();
    expect(screen.getByText("meshIQ Improvement Scenario")).toBeInTheDocument();
    expect(screen.getByText("Data Provenance & Trust Hierarchy")).toBeInTheDocument();
    expect(screen.getByText("Assessment Methodology & Financial Safeguards")).toBeInTheDocument();

    // Verify Tab Switcher to Q01-Q22 responses
    fireEvent.click(screen.getByRole("button", { name: /Q01–Q22 Discovery Answers/i }));

    await waitFor(() => {
      expect(screen.getByText(/Consultant Portfolio Review/i)).toBeInTheDocument();
    });
    expect(screen.getByText("18 Queue Managers (Exact Override)")).toBeInTheDocument();

    // Verify Tab Switcher to Executive Dashboard
    fireEvent.click(screen.getByRole("button", { name: /Executive Dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText("Executive Overview")).toBeInTheDocument();
    });
  });

  it("handles draft assessments gracefully by indicating finalized results are unavailable", async () => {
    const mockDraftAssessment = {
      id: "ass-102",
      customer_id: "cust-2",
      title: "Beta Bank Intake Session",
      status: "DRAFT" as const,
      created_at: "2026-09-10T00:00:00Z",
      updated_at: "2026-09-12T00:00:00Z",
      tenant_id: "tenant-1",
      assessment_version: "1.0.0",
      customer: { id: "cust-2", name: "Beta Bank International", industry: "Banking" },
      response: {
        id: "resp-2",
        assessment_id: "ass-102",
        raw_responses: {
          q01_scale: "1–10",
        },
      },
    };

    vi.mocked(api.listAssessments).mockResolvedValueOnce([mockDraftAssessment as any]);
    vi.mocked(api.listCustomers).mockResolvedValueOnce([mockDraftAssessment.customer as any]);
    vi.mocked(api.getAssessment).mockResolvedValueOnce(mockDraftAssessment as any);

    renderConsultantWorkspace();

    await waitFor(() => {
      expect(screen.getByText("Open Assessment")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Open Assessment"));

    await waitFor(() => {
      expect(screen.getByText("Finalized Economic Results Unavailable")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This assessment is currently in/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review Current Q01–Q22 Discovery Intake Responses")
    ).toBeInTheDocument();
  });
});
