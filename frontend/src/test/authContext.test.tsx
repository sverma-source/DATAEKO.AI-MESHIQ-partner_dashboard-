import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { api } from "../services/api";

// Mock API
vi.mock("../services/api", () => ({
  api: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

const TestConsumer: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout, hasPermission, hasRole } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "idle"}</div>
      <div data-testid="auth-status">{isAuthenticated ? "authenticated" : "unauthenticated"}</div>
      <div data-testid="user-email">{user?.email || "none"}</div>
      <div data-testid="user-role">{user?.role || "none"}</div>
      <div data-testid="perm-calc">{hasPermission("assessment:calculate") ? "can-calc" : "no-calc"}</div>
      <div data-testid="role-consultant">{hasRole("CONSULTANT") ? "is-consultant" : "not-consultant"}</div>
      <button onClick={() => login({ email: "consultant@dataeko.ai", password: "Password123!" })}>
        Trigger Login
      </button>
      <button onClick={() => logout()}>Trigger Logout</button>
    </div>
  );
};

describe("AuthContext & AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates authenticated user session on mount when API returns active session", async () => {
    (api.getCurrentUser as any).mockResolvedValueOnce({
      access_token: "active_session",
      token_type: "bearer",
      expires_in_minutes: 1440,
      user: {
        id: "user-123",
        email: "lead@dataeko.ai",
        full_name: "Lead Specialist",
        role: "CONSULTANT",
        tenant_id: "tenant-999",
        is_active: true,
        created_at: new Date().toISOString(),
      },
      permissions: ["assessment:calculate", "customer:create"],
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("loading");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("idle");
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("user-email")).toHaveTextContent("lead@dataeko.ai");
    expect(screen.getByTestId("user-role")).toHaveTextContent("CONSULTANT");
    expect(screen.getByTestId("perm-calc")).toHaveTextContent("can-calc");
    expect(screen.getByTestId("role-consultant")).toHaveTextContent("is-consultant");
  });

  it("handles unauthenticated initial state when getCurrentUser fails with 401", async () => {
    (api.getCurrentUser as any).mockRejectedValueOnce(new Error("Authentication required"));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("idle");
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("unauthenticated");
    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
  });

  it("handles successful login mutation", async () => {
    (api.getCurrentUser as any).mockRejectedValueOnce(new Error("No session"));
    (api.login as any).mockResolvedValueOnce({
      access_token: "mock-jwt",
      token_type: "bearer",
      expires_in_minutes: 1440,
      user: {
        id: "user-456",
        email: "consultant@dataeko.ai",
        role: "CONSULTANT",
        tenant_id: "tenant-1",
        is_active: true,
      },
      permissions: ["assessment:calculate"],
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("unauthenticated");
    });

    await act(async () => {
      screen.getByText("Trigger Login").click();
    });

    expect(api.login).toHaveBeenCalledWith({
      email: "consultant@dataeko.ai",
      password: "Password123!",
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("user-email")).toHaveTextContent("consultant@dataeko.ai");
    });
  });

  it("handles logout mutation and clears user state", async () => {
    (api.getCurrentUser as any).mockResolvedValueOnce({
      access_token: "active_session",
      user: {
        id: "user-123",
        email: "consultant@dataeko.ai",
        role: "CONSULTANT",
        tenant_id: "tenant-1",
        is_active: true,
      },
      permissions: [],
    });
    (api.logout as any).mockResolvedValueOnce({ detail: "Logged out" });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");
    });

    await act(async () => {
      screen.getByText("Trigger Logout").click();
    });

    expect(api.logout).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("unauthenticated");
      expect(screen.getByTestId("user-email")).toHaveTextContent("none");
    });
  });
});
