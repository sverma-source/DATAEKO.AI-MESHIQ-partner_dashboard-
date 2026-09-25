export type AssessmentStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "CALCULATED"
  | "COMPLETED"
  | "ARCHIVED";

export type QuestionResponseType =
  | "DROPDOWN_SINGLE_SELECT"
  | "DROPDOWN_WITH_NUMERIC_OVERRIDE"
  | "NUMERIC_HOURS_OR_DROPDOWN"
  | "NUMERIC_CURRENCY_OR_UNKNOWN"
  | "DROPDOWN_PERCENTAGE_OR_NUMERIC"
  | "NUMERIC_CURRENCY_OR_DEFAULT";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  isUnknownOrNotSure?: boolean;
}

export interface QuestionDefinition {
  id: string; // e.g. "Q01"
  number: number; // 1..22
  code: string; // "Q01"
  sectionId: string; // "A", "B", etc.
  title: string;
  questionText: string;
  responseType: QuestionResponseType;
  options: QuestionOption[];
  allowNumericOverride: boolean;
  overrideLabel?: string;
  overrideUnit?: string;
  overridePlaceholder?: string;
  sellerGuidance?: string;
  theme: string;
  feedsCalculation: boolean;
  calculationNote?: string;
  defaultValue?: string | number;
}

export interface SectionDefinition {
  id: string; // "A", "B", etc.
  title: string;
  subtitle: string;
  questionIds: string[]; // ["Q01", "Q02", ...]
}

export interface AssessmentResponseState {
  // Section A (Q01-Q05)
  q01_scale?: string;
  q01_override?: number;
  q02_staffing?: string;
  q02_override?: number;
  q03_staffing_model?: string;
  q04_admin_hours?: number;
  q04_dropdown?: string;
  q05_tech_debt?: string;

  // Section B (Q06-Q08)
  q06_frequency?: string;
  q07_labor_hours?: string;
  q07_override?: number;
  q08_duration?: string;

  // Section C (Q09-Q11)
  q09_tools_count?: string;
  q10_manual_tracing?: string;
  q11_productivity_constraint?: string;

  // Section D (Q12-Q15)
  q12_business_impact?: string;
  q13_recent_disruptions?: string;
  q14_disruption_duration?: string;
  q15_hourly_cost_override?: number;
  q15_is_unknown?: boolean;

  // Section E (Q16-Q17)
  q16_cost_mandate?: string;
  q17_opex_reduction?: string;
  q17_override?: number;

  // Section F (Q18-Q19)
  q18_audit_effort?: string;
  q19_documentation_effort?: string;

  // Section G (Q20-Q22)
  q20_annual_labor_rate?: number;
  q20_use_default?: boolean;
  q21_annual_mq_spend?: number;
  q21_is_unknown?: boolean;
  q22_migration_plans?: string;

  // Freeform unadulterated dictionary
  raw_responses?: Record<string, any>;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  industry?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Assessment {
  id: string;
  tenant_id: string;
  customer_id: string;
  title: string;
  description?: string;
  status: AssessmentStatus;
  assessment_version: string;
  created_at: string;
  updated_at?: string;
  customer?: Customer;
  response?: any;
  latest_snapshot?: CalculationSnapshot;
}

export interface MetricResult {
  value: number | string | null;
  state: string; // "VALID", "INSUFFICIENT_DATA", "NOT_MODELED", "NOT_APPLICABLE", etc.
  provenance: string; // "CUSTOMER_FACT", "INDUSTRY_BENCHMARK", "CALCULATED_RESULT", etc.
  formula_code?: string;
  rule_version: string;
  inputs_used: Record<string, any>;
  state_reason?: string;
}

export interface SummaryMetrics {
  admin_annual_hours?: number;
  admin_annual_cost?: number;
  troubleshooting_annual_hours?: number;
  troubleshooting_annual_cost?: number;
  total_operational_labor_cost?: number;
  operational_fte_burden?: number;
  representative_single_event_exposure?: number;
  total_recoverable_labor_hours?: number;
  illustrative_annual_labor_savings?: number;
  troubleshooting_productivity_opportunity?: number;
}

export interface CalculationSnapshot {
  id: string;
  assessment_id: string;
  tenant_id: string;
  calculation_engine_version: string;
  assessment_version: string;
  calculated_at: string;
  normalized_inputs: Record<string, any>;
  computed_metrics: Record<string, MetricResult>;
  summary_metrics: Record<string, any>;
  assumptions_used: Record<string, any>;
  benchmarks_used: Record<string, any>;
  provenance_summary: Record<string, string>;
  created_at: string;
}

export interface CalculationRunResponse {
  snapshot_id: string;
  assessment_id: string;
  calculation_engine_version: string;
  assessment_version: string;
  calculated_at: string;
  summary: SummaryMetrics;
  computed_metrics: Record<string, MetricResult>;
  assumptions_used: Record<string, any>;
  benchmarks_used: Record<string, any>;
  provenance_summary: Record<string, string>;
}
