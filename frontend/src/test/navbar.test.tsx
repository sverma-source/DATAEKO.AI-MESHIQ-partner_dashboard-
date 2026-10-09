import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Navbar } from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock api
vi.mock("../services/api", () => ({
  api: {
    checkHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      calculation_engine_version: "1.0.0",
      database: "ok",
    }),
  },
}));

describe("Navbar Component - Role-Aware Top Bar UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNavbarWithRole = (
    role?: string,
    fullName?: string,
    customerName?: string,
    assessmentTitle?: string
  ) => {
    const authValue: any = {
      user: role
        ? {
            id: "test-user-id",
            email: `${role.toLowerCase()}@test.com`,
            full_name: fullName || "Test User",
            role: role,
            tenant_id: "00000000-0000-0000-0000-000000000001",
            is_active: true,
          }
        : null,
      permissions: [],
      isAuthenticated: Boolean(role),
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      hasPermission: vi.fn().mockReturnValue(true),
      hasRole: vi.fn().mockImplementation((r) => (Array.isArray(r) ? r.includes(role!) : r === role)),
      refreshUser: vi.fn(),
    };

    return {
      ...render(
        <AuthContext.Provider value={authValue}>
          <Navbar customerName={customerName} assessmentTitle={assessmentTitle} />
        </AuthContext.Provider>
      ),
      authValue,
    };
  };

  it("CUSTOMER_USER does not see 'Engine v1.0.0' or 'Connected' in the top bar", async () => {
    renderNavbarWithRole("CUSTOMER_USER", "Alice Customer", "Apex Financial", "Q4 Modernization");

    // Wait for health check effect
    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalled();
    });

    // Technical badges must NOT be rendered for customer user
    expect(screen.queryByText(/Engine v1\.0\.0/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Connected$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Calculation Engine version/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/System Status:/i)).not.toBeInTheDocument();

    // Customer context and user menu MUST be present
    expect(screen.getByText("Apex Financial")).toBeInTheDocument();
    expect(screen.getByText("Q4 Modernization")).toBeInTheDocument();
    expect(screen.getByLabelText("User account menu")).toBeInTheDocument();
  });

  it("CUSTOMER_USER profile menu and sign-out action remain available and functional", async () => {
    const { authValue } = renderNavbarWithRole("CUSTOMER_USER", "Alice Customer");

    const menuButton = screen.getByLabelText("User account menu");
    expect(menuButton).toBeInTheDocument();

    // Open user menu
    fireEvent.click(menuButton);

    expect(screen.getAllByText("Alice Customer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("CUSTOMER_USER")).toBeInTheDocument();

    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    expect(signOutBtn).toBeInTheDocument();

    fireEvent.click(signOutBtn);
    expect(authValue.logout).toHaveBeenCalled();
  });

  it("CONSULTANT sees technical diagnostic badges ('Engine v1.0.0' and 'Connected')", async () => {
    renderNavbarWithRole("CONSULTANT", "Bob Consultant");

    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalled();
    });

    expect(screen.getByText("Engine v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Consultant Workspace")).toBeInTheDocument();
  });

  it("PLATFORM_ADMIN sees technical diagnostic badges ('Engine v1.0.0' and 'Connected')", async () => {
    renderNavbarWithRole("PLATFORM_ADMIN", "Super Admin");

    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalled();
    });

    expect(screen.getByText("Engine v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Platform Administration")).toBeInTheDocument();
  });

  it("CUSTOMER_ADMIN in governance console sees technical diagnostic badges", async () => {
    renderNavbarWithRole("CUSTOMER_ADMIN", "Carol Admin");

    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalled();
    });

    expect(screen.getByText("Engine v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Customer Administration")).toBeInTheDocument();
  });

  it("Unauthenticated visitor does not see internal engine version badges", async () => {
    renderNavbarWithRole(undefined);

    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalled();
    });

    expect(screen.queryByText(/Engine v1\.0\.0/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Connected$/i)).not.toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("Preserves underlying health-checking logic even when badges are hidden for CUSTOMER_USER", async () => {
    renderNavbarWithRole("CUSTOMER_USER", "Alice Customer");

    // api.checkHealth must still be invoked for connectivity lifecycle
    await waitFor(() => {
      expect(api.checkHealth).toHaveBeenCalledTimes(1);
    });
  });
});
