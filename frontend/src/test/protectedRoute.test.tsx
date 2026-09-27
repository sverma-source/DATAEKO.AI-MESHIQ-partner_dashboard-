import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("ProtectedRoute Component", () => {
  it("renders children when user is authenticated with proper role", async () => {
    (api.getCurrentUser as any).mockResolvedValueOnce({
      access_token: "mock-token",
      user: {
        id: "user-1",
        email: "consultant@dataeko.ai",
        role: "CONSULTANT",
        tenant_id: "tenant-1",
        is_active: true,
      },
      permissions: ["assessment:calculate"],
    });

    render(
      <AuthProvider>
        <ProtectedRoute allowedRoles={["CONSULTANT", "PLATFORM_ADMIN"]}>
          <div data-testid="protected-content">Secret Operational Data</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(await screen.findByTestId("protected-content")).toHaveTextContent("Secret Operational Data");
  });

  it("renders Access Restricted view when user lacks allowed role", async () => {
    (api.getCurrentUser as any).mockResolvedValueOnce({
      access_token: "mock-token",
      user: {
        id: "user-2",
        email: "customer@corp.com",
        role: "CUSTOMER_USER",
        tenant_id: "tenant-1",
        is_active: true,
      },
      permissions: [],
    });

    render(
      <AuthProvider>
        <ProtectedRoute allowedRoles={["CONSULTANT", "PLATFORM_ADMIN"]}>
          <div data-testid="protected-content">Secret Operational Data</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(await screen.findByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders Authentication Required view when unauthenticated", async () => {
    (api.getCurrentUser as any).mockRejectedValueOnce(new Error("Unauthorized"));

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Secret Operational Data</div>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(await screen.findByText("Authentication Required")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
