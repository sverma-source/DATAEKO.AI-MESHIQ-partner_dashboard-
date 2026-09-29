import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AssessmentWizardPage from "../app/page";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    checkHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      calculation_engine_version: "1.0.0",
      database: "ok",
    }),
    listCustomers: vi.fn().mockResolvedValue([
      { id: "cust-1", name: "Apex Financial", industry: "Banking" },
    ]),
    listAssessments: vi.fn().mockResolvedValue([]),
    createAssessment: vi.fn().mockResolvedValue({
      id: "ass-1",
      customer_id: "cust-1",
      title: "IBM MQ Assessment",
      status: "DRAFT",
    }),
  },
}));

describe("Role-Aware Application Workspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  const renderWithAuth = (role: string, fullName: string) => {
    const authValue: any = {
      user: {
        id: "test-user-id",
        email: `${role.toLowerCase()}@test.com`,
        full_name: fullName,
        role: role,
        tenant_id: "00000000-0000-0000-0000-000000000001",
        is_active: true,
      },
      permissions: [],
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockReturnValue(true),
      hasRole: vi.fn().mockImplementation((r) => (Array.isArray(r) ? r.includes(role) : r === role)),
      refreshUser: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={authValue}>
        <AssessmentWizardPage />
      </AuthContext.Provider>
    );
  };

  it("renders Client Assessment Intake Wizard when authenticated as CUSTOMER_USER", async () => {
    renderWithAuth("CUSTOMER_USER", "Alice Client");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "A. Environment & Cost Baseline" })).toBeInTheDocument();
    });
    expect(screen.getByText("Queue Manager Estate Scale")).toBeInTheDocument();
    expect(screen.queryByText("Customer & Assessment Portfolio")).not.toBeInTheDocument();
    expect(screen.queryByText("Administration & Governance Workspace")).not.toBeInTheDocument();
  });

  it("renders Consultant Workspace when authenticated as CONSULTANT", async () => {
    renderWithAuth("CONSULTANT", "Bob Consultant");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Customer & Assessment Portfolio" })).toBeInTheDocument();
    });
    expect(screen.getByText("Advisory & Review Workspace")).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the Consultant Engagement Workspace/i)).toBeInTheDocument();
    expect(screen.getByText("Consultant Workspace")).toBeInTheDocument();

    // Client wizard questions should NOT be rendered
    expect(screen.queryByRole("heading", { name: "A. Environment & Cost Baseline" })).not.toBeInTheDocument();
  });

  it("renders Admin Workspace when authenticated as PLATFORM_ADMIN", async () => {
    renderWithAuth("PLATFORM_ADMIN", "Super Admin");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Administration & Governance Workspace" })).toBeInTheDocument();
    });
    expect(screen.getByText("Platform Superadmin")).toBeInTheDocument();
    expect(screen.getAllByText("Platform Administration").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("User Visibility & Identity")).toBeInTheDocument();
    expect(screen.getByText("Audit Trail & Compliance")).toBeInTheDocument();

    // Client wizard questions should NOT be rendered
    expect(screen.queryByRole("heading", { name: "A. Environment & Cost Baseline" })).not.toBeInTheDocument();
  });

  it("renders Admin Workspace with Partner scope when authenticated as PARTNER_ADMIN", async () => {
    renderWithAuth("PARTNER_ADMIN", "Partner Lead");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Administration & Governance Workspace" })).toBeInTheDocument();
    });
    expect(screen.getByText("Partner Administrator")).toBeInTheDocument();
    expect(screen.getAllByText("Partner Administration").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Admin Workspace with Customer scope when authenticated as CUSTOMER_ADMIN", async () => {
    renderWithAuth("CUSTOMER_ADMIN", "Customer Admin Lead");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Administration & Governance Workspace" })).toBeInTheDocument();
    });
    expect(screen.getByText("Customer Administrator")).toBeInTheDocument();
    expect(screen.getAllByText("Customer Administration").length).toBeGreaterThanOrEqual(1);
  });
});
