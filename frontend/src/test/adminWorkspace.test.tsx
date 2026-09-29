import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminWorkspace } from "../components/AdminWorkspace";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    listCustomers: vi.fn(),
    listAssessments: vi.fn(),
    listAuditEvents: vi.fn(),
  },
}));

describe("AdminWorkspace Component (Batch 4A Read-Only Governance)", () => {
  const mockCustomers = [
    {
      id: "cust-001",
      name: "Acme Corp Financial",
      industry: "Financial Services",
      primary_contact_name: "Jane Doe",
      primary_contact_email: "jane@acme.com",
      tenant_id: "tenant-001",
      created_at: "2026-01-15T10:00:00Z",
    },
    {
      id: "cust-002",
      name: "Global Health Systems",
      industry: "Healthcare",
      primary_contact_name: "Dr. Smith",
      primary_contact_email: "smith@health.org",
      tenant_id: "tenant-001",
      created_at: "2026-02-20T10:00:00Z",
    },
  ];

  const mockAssessments = [
    {
      id: "ass-001",
      customer_id: "cust-001",
      title: "Acme Core Banking MQ Assessment",
      status: "SUBMITTED",
      assessment_version: "1.0.0",
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "2026-02-05T12:00:00Z",
      customer: { id: "cust-001", name: "Acme Corp Financial" },
      latest_snapshot: { id: "snap-001" },
    },
    {
      id: "ass-002",
      customer_id: "cust-002",
      title: "Global Health MQ Discovery",
      status: "DRAFT",
      assessment_version: "1.0.0",
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-03-02T12:00:00Z",
      customer: { id: "cust-002", name: "Global Health Systems" },
    },
  ];

  const mockAuditEvents = [
    {
      id: "audit-001",
      tenant_id: "tenant-001",
      user_id: "usr-admin",
      event_type: "USER_LOGIN_SUCCESS",
      resource_type: "SESSION",
      resource_id: "sess-123",
      status: "SUCCESS",
      created_at: "2026-03-10T14:00:00Z",
    },
    {
      id: "audit-002",
      tenant_id: "tenant-001",
      user_id: "usr-client",
      event_type: "ASSESSMENT_SUBMITTED",
      resource_type: "ASSESSMENT",
      resource_id: "ass-001",
      status: "SUCCESS",
      created_at: "2026-03-10T15:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.listCustomers as any).mockResolvedValue(mockCustomers);
    (api.listAssessments as any).mockResolvedValue(mockAssessments);
    (api.listAuditEvents as any).mockResolvedValue(mockAuditEvents);
  });

  const renderWithRole = (role: string) => {
    const authValue: any = {
      user: {
        id: "usr-admin-001",
        email: "admin@enterprise.com",
        full_name: "Admin User",
        role: role,
        tenant_id: "tenant-001",
        is_active: true,
      },
      permissions: ["CUSTOMER_READ", "ASSESSMENT_READ", "AUDIT_READ"],
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
        <AdminWorkspace />
      </AuthContext.Provider>
    );
  };

  it("renders Customer Directory with metrics and search functionality", async () => {
    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("admin-customer-directory")).toBeInTheDocument();
    });

    expect(screen.getByText("Acme Corp Financial")).toBeInTheDocument();
    expect(screen.getByText("Global Health Systems")).toBeInTheDocument();
    expect(screen.getByText("Partner Administration")).toBeInTheDocument();

    // Verify search
    const searchInput = screen.getByPlaceholderText("Search customer organizations...");
    fireEvent.change(searchInput, { target: { value: "Acme" } });

    expect(screen.getByText("Acme Corp Financial")).toBeInTheDocument();
    expect(screen.queryByText("Global Health Systems")).not.toBeInTheDocument();
  });

  it("opens customer read-only detail inspection modal and closes it", async () => {
    renderWithRole("CUSTOMER_ADMIN");

    await waitFor(() => {
      expect(screen.getByText("Acme Corp Financial")).toBeInTheDocument();
    });

    const inspectBtn = screen.getByRole("button", { name: "Inspect Acme Corp Financial" });
    fireEvent.click(inspectBtn);

    expect(screen.getByText("Customer Organization Detail")).toBeInTheDocument();
    expect(screen.getAllByText("Financial Services").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("jane@acme.com").length).toBeGreaterThanOrEqual(1);

    // Close modal
    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Customer Organization Detail")).not.toBeInTheDocument();
  });

  it("renders Assessment Registry, supports status filtering and modal inspection", async () => {
    renderWithRole("PLATFORM_ADMIN");

    await waitFor(() => {
      expect(screen.getByText(/Assessment Registry \(/i)).toBeInTheDocument();
    });

    // Switch to Assessment Registry Tab
    const registryTabBtn = screen.getByRole("button", { name: /Assessment Registry/i });
    fireEvent.click(registryTabBtn);

    expect(screen.getByTestId("admin-assessment-registry")).toBeInTheDocument();
    expect(screen.getByText("Acme Core Banking MQ Assessment")).toBeInTheDocument();
    expect(screen.getByText("Global Health MQ Discovery")).toBeInTheDocument();

    // Filter by SUBMITTED
    const submittedFilterBtn = screen.getByRole("button", { name: /Submitted \(1\)/i });
    fireEvent.click(submittedFilterBtn);

    expect(screen.getByText("Acme Core Banking MQ Assessment")).toBeInTheDocument();
    expect(screen.queryByText("Global Health MQ Discovery")).not.toBeInTheDocument();

    // Inspect assessment record modal
    const inspectAssBtn = screen.getByRole("button", { name: "Inspect assessment ass-001" });
    fireEvent.click(inspectAssBtn);

    expect(screen.getByText("Assessment Registry Record")).toBeInTheDocument();
    expect(screen.getAllByText("v1.0.0").length).toBeGreaterThanOrEqual(1);

    // Close modal
    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Assessment Registry Record")).not.toBeInTheDocument();
  });

  it("renders Audit Trail & Compliance tab with category filter", async () => {
    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Audit Trail/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Audit Trail/i }));

    expect(screen.getByTestId("admin-audit-trail")).toBeInTheDocument();
    expect(screen.getByText("USER_LOGIN_SUCCESS")).toBeInTheDocument();
    expect(screen.getByText("ASSESSMENT_SUBMITTED")).toBeInTheDocument();
  });

  it("renders User Visibility & Identity tab with authenticated profile information", async () => {
    renderWithRole("PLATFORM_ADMIN");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /User Visibility/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /User Visibility/i }));

    expect(screen.getByTestId("admin-user-visibility")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@enterprise.com")).toBeInTheDocument();
    expect(screen.getByText("PLATFORM_ADMIN")).toBeInTheDocument();
    expect(screen.getByText("Active & Authenticated")).toBeInTheDocument();
    expect(screen.getByText(/User Directory & Access Governance Notice/i)).toBeInTheDocument();
  });

  it("enforces read-only governance without exposing mutation controls", async () => {
    renderWithRole("PLATFORM_ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("admin-customer-directory")).toBeInTheDocument();
    });

    // Ensure NO mutation buttons exist
    expect(screen.queryByRole("button", { name: /Create Customer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Customer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create Assessment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Assessment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit Assessment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create User/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Calculate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit Assessment/i })).not.toBeInTheDocument();
  });
});
