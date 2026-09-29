import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminWorkspace } from "../components/AdminWorkspace";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    listCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    listAssessments: vi.fn(),
    listAuditEvents: vi.fn(),
  },
}));

describe("AdminWorkspace Component (Batch 4B User & Customer Governance Mutations)", () => {
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

  const mockUsers = [
    {
      id: "usr-001",
      email: "admin@enterprise.com",
      full_name: "Admin User",
      role: "PARTNER_ADMIN",
      tenant_id: "tenant-001",
      is_active: true,
      created_at: "2026-01-10T10:00:00Z",
      updated_at: "2026-01-10T10:00:00Z",
    },
    {
      id: "usr-002",
      email: "jane.client@acme.com",
      full_name: "Jane Client",
      role: "CUSTOMER_USER",
      tenant_id: "tenant-001",
      is_active: true,
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "2026-02-01T10:00:00Z",
    },
    {
      id: "usr-003",
      email: "bob.consultant@meshiq.com",
      full_name: "Bob Consultant",
      role: "CONSULTANT",
      tenant_id: "tenant-001",
      is_active: false,
      created_at: "2026-02-15T10:00:00Z",
      updated_at: "2026-02-20T10:00:00Z",
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
      user_id: "usr-001",
      event_type: "USER_CREATED",
      resource_type: "USER",
      resource_id: "usr-002",
      status: "SUCCESS",
      created_at: "2026-03-10T14:00:00Z",
    },
    {
      id: "audit-002",
      tenant_id: "tenant-001",
      user_id: "usr-001",
      event_type: "CUSTOMER_CREATED",
      resource_type: "CUSTOMER",
      resource_id: "cust-001",
      status: "SUCCESS",
      created_at: "2026-03-10T15:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.listCustomers as any).mockResolvedValue(mockCustomers);
    (api.listUsers as any).mockResolvedValue(mockUsers);
    (api.listAssessments as any).mockResolvedValue(mockAssessments);
    (api.listAuditEvents as any).mockResolvedValue(mockAuditEvents);
  });

  const renderWithRole = (role: string, currentUserId: string = "usr-001") => {
    const authValue: any = {
      user: {
        id: currentUserId,
        email: "admin@enterprise.com",
        full_name: "Admin User",
        role: role,
        tenant_id: "tenant-001",
        is_active: true,
      },
      permissions: ["CUSTOMER_READ", "CUSTOMER_CREATE", "CUSTOMER_UPDATE", "ASSESSMENT_READ", "AUDIT_READ"],
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

  it("renders User Directory by default with search and filters", async () => {
    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("admin-user-directory")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Jane Client")).toBeInTheDocument();
    expect(screen.getByText("Bob Consultant")).toBeInTheDocument();

    // Filter by search query
    const searchInput = screen.getByPlaceholderText("Search users by name or email...");
    fireEvent.change(searchInput, { target: { value: "Jane" } });

    expect(screen.getByText("Jane Client")).toBeInTheDocument();
    expect(screen.queryByText("Bob Consultant")).not.toBeInTheDocument();
  });

  it("renders Customer Directory when switching tabs", async () => {
    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    // Switch to Customer Directory tab
    const custTabBtn = screen.getByRole("button", { name: /Customer Directory/i });
    fireEvent.click(custTabBtn);

    expect(screen.getByTestId("admin-customer-directory")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp Financial")).toBeInTheDocument();
    expect(screen.getByText("Global Health Systems")).toBeInTheDocument();

    // Filter by search query
    const searchInput = screen.getByPlaceholderText("Search customer organizations...");
    fireEvent.change(searchInput, { target: { value: "Acme" } });

    expect(screen.getByText("Acme Corp Financial")).toBeInTheDocument();
    expect(screen.queryByText("Global Health Systems")).not.toBeInTheDocument();
  });

  it("provisions a new user with role-constrained choices", async () => {
    (api.createUser as any).mockResolvedValue({
      id: "usr-004",
      email: "new.user@acme.com",
      full_name: "New User",
      role: "CUSTOMER_USER",
      is_active: true,
    });

    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    // Click Provision User
    const provisionBtn = screen.getByRole("button", { name: /Provision User/i });
    fireEvent.click(provisionBtn);

    expect(screen.getByText("Provision New User Account")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText("e.g. Jane Doe"), { target: { value: "New User" } });
    fireEvent.change(screen.getByPlaceholderText("jane@company.com"), { target: { value: "new.user@acme.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••••••"), { target: { value: "SecurePass123!" } });

    // Select role
    const roleSelects = screen.getAllByRole("combobox");
    // The role select inside modal is the last combobox
    const modalRoleSelect = roleSelects[roleSelects.length - 1];
    fireEvent.change(modalRoleSelect, { target: { value: "CUSTOMER_USER" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Provision Account" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledWith({
        full_name: "New User",
        email: "new.user@acme.com",
        role: "CUSTOMER_USER",
        password: "SecurePass123!",
      });
    });
  });

  it("displays duplicate email error (409) during user provisioning", async () => {
    (api.createUser as any).mockRejectedValue({
      status: 409,
      message: "A user with this email address already exists.",
    });

    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Provision User/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Jane Doe"), { target: { value: "Existing User" } });
    fireEvent.change(screen.getByPlaceholderText("jane@company.com"), { target: { value: "admin@enterprise.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••••••"), { target: { value: "SecurePass123!" } });

    fireEvent.click(screen.getByRole("button", { name: "Provision Account" }));

    await waitFor(() => {
      expect(screen.getByText(/A user with this email address already exists/i)).toBeInTheDocument();
    });
  });

  it("handles user activation and deactivation with confirmation dialog", async () => {
    (api.updateUser as any).mockResolvedValue({
      id: "usr-002",
      full_name: "Jane Client",
      email: "jane.client@acme.com",
      role: "CUSTOMER_USER",
      is_active: false,
    });

    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    // Click Deactivate for Jane Client (index 1, index 0 is admin user)
    const deactBtns = screen.getAllByRole("button", { name: "Deactivate" });
    fireEvent.click(deactBtns[1]);

    // Confirmation dialog appears
    expect(screen.getByText("Deactivate User Account?")).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getByRole("button", { name: "Confirm Deactivation" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.updateUser).toHaveBeenCalledWith("usr-002", { is_active: false });
    });
  });

  it("handles role change with confirmation dialog", async () => {
    (api.updateUser as any).mockResolvedValue({
      id: "usr-002",
      full_name: "Jane Client",
      email: "jane.client@acme.com",
      role: "CONSULTANT",
      is_active: true,
    });

    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    // Click Change Role for Jane Client (first "Role" button for usr-001 is for admin, second is usr-002)
    const roleButtons = screen.getAllByRole("button", { name: "Role" });
    fireEvent.click(roleButtons[1]);

    expect(screen.getByText("Modify User Role Assignment")).toBeInTheDocument();

    // Change role in select
    const roleSelect = screen.getByDisplayValue("CUSTOMER_USER");
    fireEvent.change(roleSelect, { target: { value: "CONSULTANT" } });

    // Confirm Role Change
    const confirmRoleBtn = screen.getByRole("button", { name: "Save Role Change" });
    fireEvent.click(confirmRoleBtn);

    await waitFor(() => {
      expect(api.updateUser).toHaveBeenCalledWith("usr-002", { role: "CONSULTANT" });
    });
  });

  it("creates customer organization via Add Organization modal", async () => {
    (api.createCustomer as any).mockResolvedValue({
      id: "cust-003",
      name: "New Enterprise Org",
      industry: "Financial Services",
    });

    renderWithRole("PARTNER_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    // Switch to Customer Directory tab
    const custTabBtn = screen.getByRole("button", { name: /Customer Directory/i });
    fireEvent.click(custTabBtn);

    expect(screen.getByTestId("admin-customer-directory")).toBeInTheDocument();

    // Click Add Organization
    const addCustBtn = screen.getByRole("button", { name: /Add Organization/i });
    fireEvent.click(addCustBtn);

    expect(screen.getByText("Create Customer Organization")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("e.g. Apex Global Financial"), {
      target: { value: "New Enterprise Org" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Organization" }));

    await waitFor(() => {
      expect(api.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Enterprise Org" })
      );
    });
  });

  it("enforces immutable isolation without exposing destructive customer/user delete controls", async () => {
    renderWithRole("PLATFORM_ADMIN");

    await waitFor(() => {
      expect(screen.queryByText("Loading governance records...")).not.toBeInTheDocument();
    });

    // Verify NO delete user / hard delete buttons exist
    expect(screen.queryByRole("button", { name: /Delete User/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Purge User/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Customer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete Assessment/i })).not.toBeInTheDocument();
  });
});
