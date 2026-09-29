import {
  Assessment,
  AssessmentResponseState,
  CalculationRunResponse,
  CalculationSnapshot,
  Customer,
} from "../types/assessment";
import { LoginCredentials, TokenResponse, User } from "../types/auth";

/**
 * Resolves the base API URL:
 * - If NEXT_PUBLIC_API_URL is explicitly configured (non-empty), sanitize and use it.
 * - In production mode (NODE_ENV === "production"), defaults to same-origin relative path "/api/v1".
 * - In development/test mode, defaults to "http://localhost:8000/api/v1".
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof envUrl === "string" && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return process.env.NODE_ENV === "production" ? "/api/v1" : "http://localhost:8000/api/v1";
}

const API_BASE = getApiBaseUrl();

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    credentials: "include", // Ensure HTTP-only cookies are included
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const requestId = response.headers.get("X-Request-ID") || response.headers.get("x-request-id");
    let errorDetail = "An unexpected error occurred. Please try again.";
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      if (response.status === 401) {
        errorDetail = "Authentication required or session expired. Please log in.";
      } else if (response.status === 403) {
        errorDetail = "You do not have permission to perform this action.";
      } else if (response.status === 404) {
        errorDetail = "The requested resource was not found.";
      } else if (response.status >= 500) {
        errorDetail = "Internal server error. Please contact system support.";
      } else {
        errorDetail = `Request failed (HTTP ${response.status}).`;
      }
    }

    if (requestId && !errorDetail.includes(requestId)) {
      errorDetail = `${errorDetail} (Reference ID: ${requestId})`;
    }

    const error = new Error(errorDetail);
    (error as any).requestId = requestId;
    (error as any).status = response.status;
    throw error;
  }


  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; calculation_engine_version: string; database: string }>("/health"),

  // Customers
  listCustomers: () => request<Customer[]>("/customers"),
  createCustomer: (data: { name: string; industry?: string; primary_contact_name?: string; primary_contact_email?: string; notes?: string }) =>
    request<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCustomer: (customerId: string, data: { name?: string; industry?: string; primary_contact_name?: string; primary_contact_email?: string; notes?: string }) =>
    request<Customer>(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Users & Administration (Batch 4B/4C)
  listUsers: (params?: { search?: string; role?: string; is_active?: boolean; customer_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.role) query.set("role", params.role);
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
    if (params?.customer_id) query.set("customer_id", params.customer_id);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<User[]>(`/users${qs}`);
  },

  createUser: (data: { email: string; full_name: string; role: string; password?: string; customer_id?: string }) =>
    request<User>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateUser: (userId: string, data: { full_name?: string; role?: string; is_active?: boolean }) =>
    request<User>(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Assessments
  listAssessments: (customerId?: string) =>
    request<Assessment[]>(`/assessments${customerId ? `?customer_id=${customerId}` : ""}`),
  
  createAssessment: (data: { customer_id: string; title: string; description?: string }) =>
    request<Assessment>("/assessments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAssessment: (id: string) => request<Assessment>(`/assessments/${id}`),

  // Save Responses
  saveResponses: (assessmentId: string, state: AssessmentResponseState) => {
    // Convert frontend state format to backend AssessmentResponse schema
    const payload = {
      q01_company_name: undefined,
      q02_industry: undefined,
      q03_environment_scale: state.q01_scale,
      q04_weekly_admin_hours: state.q04_admin_hours,
      q05_mq_role_split: state.q03_staffing_model,
      q06_frequency_text: state.q06_frequency,
      q06_frequency_override: undefined,
      q07_labor_hours_text: state.q07_labor_hours,
      q07_labor_hours_override: state.q07_override,
      q08_duration_text: state.q08_duration,
      q09_root_cause_categories: state.q09_tools_count,
      q10_problem_types: state.q10_manual_tracing,
      q11_monitoring_status: state.q11_productivity_constraint,
      q12_business_impact: state.q12_business_impact,
      q13_annual_outage_count: undefined,
      q14_duration_text: state.q14_disruption_duration,
      q14_duration_override: undefined,
      q15_hourly_cost_override: state.q15_is_unknown ? null : state.q15_hourly_cost_override,
      q16_config_management_method: state.q16_cost_mandate,
      q17_audit_frequency: undefined,
      q18_audit_effort: state.q18_audit_effort,
      q19_documentation_effort: state.q19_documentation_effort,
      q20_annual_labor_rate: state.q20_use_default ? null : state.q20_annual_labor_rate,
      q21_annual_mq_spend: state.q21_is_unknown ? null : state.q21_annual_mq_spend,
      q22_migration_plans: state.q22_migration_plans,
      raw_responses: state,
    };

    return request<any>(`/assessments/${assessmentId}/responses`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // Submit Assessment (Batch B Finalization)
  submitAssessment: (assessmentId: string) =>
    request<Assessment>(`/assessments/${assessmentId}/submit`, {
      method: "POST",
    }),

  // Calculate
  calculateAssessment: (assessmentId: string) =>
    request<CalculationRunResponse>(`/assessments/${assessmentId}/calculate`, {
      method: "POST",
    }),

  // Snapshots
  getLatestSnapshot: (assessmentId: string) =>
    request<CalculationSnapshot>(`/assessments/${assessmentId}/snapshots/latest`),

  // Authentication & Session
  login: (credentials: LoginCredentials) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  logout: () =>
    request<{ detail: string }>("/auth/logout", {
      method: "POST",
    }),

  getCurrentUser: () => request<TokenResponse>("/auth/me"),

  // Batch 4D: Credential Lifecycle
  acceptInvitation: (payload: { token: string; new_password: string }) =>
    request<{ message: string }>("/auth/accept-invitation", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  forgotPassword: (payload: { email: string }) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  resetPassword: (payload: { token: string; new_password: string }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  resendInvitation: (userId: string) =>
    request<{ message: string }>(`/users/${userId}/resend-invitation`, {
      method: "POST",
    }),

  // Deliverables
  getAssessmentCsvUrl: (assessmentId: string) => `${API_BASE}/assessments/${assessmentId}/deliverables/csv`,
  getAssessmentPdfUrl: (assessmentId: string) => `${API_BASE}/assessments/${assessmentId}/deliverables/pdf`,

  // Audit Events
  listAuditEvents: (params?: { limit?: number; event_type?: string; resource_type?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.event_type) query.set("event_type", params.event_type);
    if (params?.resource_type) query.set("resource_type", params.resource_type);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<any[]>(`/audit-events${qs}`);
  },
};
