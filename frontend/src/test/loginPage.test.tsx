import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../app/login/page";
import { AuthProvider } from "../context/AuthContext";
import { api } from "../services/api";

vi.mock("../services/api", () => ({
  api: {
    getCurrentUser: vi.fn().mockRejectedValue(new Error("No session")),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe("LoginPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DATAEKO × meshIQ enterprise login layout", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByText("DATAEKO")).toBeInTheDocument();
    expect(screen.getByText("meshIQ")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByLabelText(/Corporate Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it("validates empty submission", async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    const form = screen.getByRole("button", { name: /Sign In/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Please enter your corporate email address.");
    });
  });

  it("displays generic safe error message on invalid credentials", async () => {
    (api.login as any).mockRejectedValueOnce(new Error("Incorrect email or password."));

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Corporate Email Address/i), {
      target: { value: "invalid@dataeko.ai" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "WrongPassword" },
    });

    const form = screen.getByRole("button", { name: /Sign In/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Incorrect email or password.");
    });
  });

  it("fills development credentials when clicking quick role buttons in development mode", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    const consultantBtn = screen.getByText("Consultant");
    fireEvent.click(consultantBtn);

    expect(screen.getByLabelText(/Corporate Email Address/i)).toHaveValue("consultant@dataeko.ai");
    expect(screen.getByLabelText(/Password/i)).toHaveValue("Consultant123!");
  });

  it("does not render development quick roles helper in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      render(
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      );

      expect(screen.queryByText("Development Quick Roles")).not.toBeInTheDocument();
      expect(screen.queryByTestId("dev-quick-roles")).not.toBeInTheDocument();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
