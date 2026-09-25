import {
  Assessment,
  AssessmentResponseState,
  CalculationRunResponse,
  CalculationSnapshot,
  Customer,
} from "../types/assessment";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-ID": "00000000-0000-0000-0000-000000000001",
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
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

  // Calculate
  calculateAssessment: (assessmentId: string) =>
    request<CalculationRunResponse>(`/assessments/${assessmentId}/calculate`, {
      method: "POST",
    }),

  // Snapshots
  getLatestSnapshot: (assessmentId: string) =>
    request<CalculationSnapshot>(`/assessments/${assessmentId}/snapshots/latest`),
};
