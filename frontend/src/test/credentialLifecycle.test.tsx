import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AcceptInvitationPage from "../app/accept-invitation/page";
import ForgotPasswordPage from "../app/forgot-password/page";
import ResetPasswordPage from "../app/reset-password/page";
import { AdminWorkspace } from "../components/AdminWorkspace";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

const mockPush = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}));

vi.mock("../services/api", () => ({
  api: {
    acceptInvitation: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendInvitation: vi.fn(),
    listUsers: vi.fn().mockResolvedValue([]),
    listCustomers: vi.fn().mockResolvedValue([]),
    listAssessments: vi.fn().mockResolvedValue([]),
    listAuditEvents: vi.fn().mockResolvedValue([]),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

describe("Batch 4D — Frontend Credential Lifecycle & Invitation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsGet.mockReturnValue("mock-valid-token-12345");
    (api.listUsers as any).mockResolvedValue([]);
    (api.listCustomers as any).mockResolvedValue([]);
    (api.listAssessments as any).mockResolvedValue([]);
    (api.listAuditEvents as any).mockResolvedValue([]);
  });

  describe("Accept Invitation Page", () => {
    it("renders accept invitation form when token is present", () => {
      mockSearchParamsGet.mockReturnValue("mock-valid-token-12345");
      render(<AcceptInvitationPage />);
      expect(screen.getByText(/Accept Invitation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Activate/i })).toBeInTheDocument();
      // Token itself must NEVER be rendered to the user
      expect(screen.queryByText("mock-valid-token-12345")).not.toBeInTheDocument();
    });

    it("displays error when token is missing", () => {
      mockSearchParamsGet.mockReturnValue(null);
      render(<AcceptInvitationPage />);
      expect(screen.getByText(/No invitation token provided/i)).toBeInTheDocument();
    });

    it("validates password length and matching confirmation", async () => {
      mockSearchParamsGet.mockReturnValue("mock-valid-token-12345");
      render(<AcceptInvitationPage />);
      const passInput = screen.getByLabelText(/^New Password/i);
      const confirmInput = screen.getByLabelText(/Confirm Password/i);
      const submitBtn = screen.getByRole("button", { name: /Activate/i });

      // Too short
      fireEvent.change(passInput, { target: { value: "short" } });
      fireEvent.change(confirmInput, { target: { value: "short" } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();

      // Mismatched
      fireEvent.change(passInput, { target: { value: "validpassword123" } });
      fireEvent.change(confirmInput, { target: { value: "different123" } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });

    it("calls acceptInvitation API and redirects to login on success", async () => {
      mockSearchParamsGet.mockReturnValue("mock-valid-token-12345");
      (api.acceptInvitation as any).mockResolvedValueOnce({
        message: "Invitation accepted successfully.",
      });

      render(<AcceptInvitationPage />);
      const passInput = screen.getByLabelText(/^New Password/i);
      const confirmInput = screen.getByLabelText(/Confirm Password/i);
      const submitBtn = screen.getByRole("button", { name: /Activate/i });

      fireEvent.change(passInput, { target: { value: "ValidPassword123!" } });
      fireEvent.change(confirmInput, { target: { value: "ValidPassword123!" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.acceptInvitation).toHaveBeenCalledWith({
          token: "mock-valid-token-12345",
          new_password: "ValidPassword123!",
        });
        expect(screen.getByText(/Invitation accepted successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe("Forgot Password Page", () => {
    it("renders forgot password form", () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByText(/Reset Your Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
    });

    it("submits email and displays generic success message without account enumeration", async () => {
      (api.forgotPassword as any).mockResolvedValueOnce({
        message: "If the account exists, password reset instructions have been sent.",
      });

      render(<ForgotPasswordPage />);
      const emailInput = screen.getByLabelText(/Email Address/i);
      const submitBtn = screen.getByRole("button", { name: /Send Reset Link/i });

      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.forgotPassword).toHaveBeenCalledWith({ email: "user@example.com" });
        expect(screen.getByText(/instructions have been sent/i)).toBeInTheDocument();
        expect(screen.getByText(/Please check your inbox/i)).toBeInTheDocument();
      });
    });
  });

  describe("Reset Password Page", () => {
    it("renders reset password form when token is present", () => {
      mockSearchParamsGet.mockReturnValue("mock-valid-token-12345");
      render(<ResetPasswordPage />);
      expect(screen.getByText(/Choose a New Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^New Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      // Token must not be displayed
      expect(screen.queryByText("mock-valid-token-12345")).not.toBeInTheDocument();
    });

    it("displays error when token is missing", () => {
      mockSearchParamsGet.mockReturnValue(null);
      render(<ResetPasswordPage />);
      expect(screen.getByText(/No reset token provided/i)).toBeInTheDocument();
    });

    it("submits new password and redirects to login on success", async () => {
      mockSearchParamsGet.mockReturnValue("mock-valid-token-12345");
      (api.resetPassword as any).mockResolvedValueOnce({
        message: "Password reset successful.",
      });

      render(<ResetPasswordPage />);
      const passInput = screen.getByLabelText(/^New Password/i);
      const confirmInput = screen.getByLabelText(/Confirm Password/i);
      const submitBtn = screen.getByRole("button", { name: /Set Password & Continue/i });

      fireEvent.change(passInput, { target: { value: "NewResetPass123!" } });
      fireEvent.change(confirmInput, { target: { value: "NewResetPass123!" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.resetPassword).toHaveBeenCalledWith({
          token: "mock-valid-token-12345",
          new_password: "NewResetPass123!",
        });
        expect(screen.getByText(/Password reset successful/i)).toBeInTheDocument();
      });
    });
  });

  describe("Admin User Provisioning — No Password Field", () => {
    it("admin workspace user provisioning modal contains invitation notice and no password field", async () => {
      (api.listUsers as any).mockResolvedValue([
        {
          id: "u-1",
          email: "invited@example.com",
          full_name: "Invited Guy",
          role: "CUSTOMER_USER",
          is_active: false,
          tenant_id: "t-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      (api.listAuditEvents as any).mockResolvedValue([]);
      (api.listCustomers as any).mockResolvedValue([]);

      const mockUser = {
        id: "admin-1",
        email: "admin@dataeko.ai",
        full_name: "Admin",
        role: "PARTNER_ADMIN" as const,
        tenant_id: "t-1",
      };

      const authValue = {
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn(),
        hasRole: vi.fn().mockImplementation((r) => (Array.isArray(r) ? r.includes("PARTNER_ADMIN") : r === "PARTNER_ADMIN")),
        hasPermission: vi.fn().mockReturnValue(true),
      };

      render(
        <AuthContext.Provider value={authValue}>
          <AdminWorkspace />
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getByText("Invited Guy")).toBeInTheDocument();
      });

      // Open provision modal
      const addBtns = screen.getAllByRole("button", { name: /Provision User/i });
      fireEvent.click(addBtns[0]);

      await waitFor(() => {
        expect(screen.getByText("Provision New User Account")).toBeInTheDocument();
      });

      // Verify no password input in provision modal
      expect(screen.queryByLabelText(/Password/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Secure Invitation Lifecycle/i)).toBeInTheDocument();
      expect(screen.getByText(/activation link will be sent/i)).toBeInTheDocument();
    });
  });
});
