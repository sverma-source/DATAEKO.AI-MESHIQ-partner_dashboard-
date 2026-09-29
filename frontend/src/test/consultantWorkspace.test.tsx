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
      permissions: ["customer:read", "assessment:read"],
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

  it("opens an assessment to view all 7 sections and Q01–Q22 responses in read-only form", async () => {
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
          q20_use_default: true,
        },
      },
    };

    vi.mocked(api.listAssessments).mockResolvedValueOnce([mockAssessmentDetail as any]);
    vi.mocked(api.listCustomers).mockResolvedValueOnce([mockAssessmentDetail.customer as any]);
    vi.mocked(api.getAssessment).mockResolvedValueOnce(mockAssessmentDetail as any);

    renderConsultantWorkspace();

    await waitFor(() => {
      expect(screen.getByText("Open Assessment")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Open Assessment"));

    await waitFor(() => {
      expect(screen.getByTestId("consultant-assessment-view")).toBeInTheDocument();
    });

    // Verify Read-Only Notice and Headers
    expect(screen.getByText(/Consultant Portfolio Review/i)).toBeInTheDocument();
    expect(screen.getByText("A. Environment & Cost Baseline")).toBeInTheDocument();
    expect(screen.getByText("B. Troubleshooting Economics")).toBeInTheDocument();
    expect(screen.getByText("G. Economic Inputs & Timing")).toBeInTheDocument();

    // Verify Q01-Q04 human-readable formatted answers
    expect(screen.getByText("18 Queue Managers (Exact Override)")).toBeInTheDocument();
    expect(screen.getByText("3–5")).toBeInTheDocument();
    expect(screen.getByText("Centralized dedicated MQ team")).toBeInTheDocument();
    expect(screen.getByText("80 hours / quarter")).toBeInTheDocument();
    expect(screen.getByText("$180,000 / year (Model Standard Default)")).toBeInTheDocument();

    // Verify zero editable controls or submit buttons
    expect(screen.queryByRole("button", { name: /Submit Assessment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    // Click Back to Portfolio
    fireEvent.click(screen.getByRole("button", { name: "Back to Assessment Portfolio" }));

    await waitFor(() => {
      expect(screen.getByTestId("consultant-portfolio-workspace")).toBeInTheDocument();
    });
  });
});
