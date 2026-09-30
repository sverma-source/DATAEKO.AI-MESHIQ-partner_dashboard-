import { describe, it, expect } from "vitest";
import { QUESTIONS, normalizeResponseState } from "../data/questionCatalog";
import { AssessmentResponseState } from "../types/assessment";
import { api } from "../services/api";

describe("P1 — Save & Resume Draft Persistence (Q01–Q22)", () => {
  it("normalizes and preserves full Q01–Q22 responses across simulated save and reload", () => {
    // Initial client state with diverse question types:
    // select, numeric, text, boolean, conditional, override, unknown
    const clientState: AssessmentResponseState = {
      q01_scale: "51–100",
      q01_override: 75,
      q02_staffing: "3–5",
      q02_override: 4,
      q03_staffing_model: "Centralized dedicated MQ team",
      q04_dropdown: "10–20 hours",
      q04_admin_hours: 15,
      q05_tech_debt: "Moderate debt",
      q06_frequency: "Monthly",
      q07_labor_hours: "1–4 hours",
      q07_override: 2.5,
      q08_duration: "1–2 hours",
      q09_tools_count: "3–5 tools",
      q10_manual_tracing: "Partially automated scripts",
      q11_productivity_constraint: "Slow cross-team root cause isolation on bridge calls",
      q12_business_impact: "Moderate",
      q13_recent_disruptions: "Yes, 1–2 significant disruptions",
      q14_disruption_duration: "1–2 hours",
      q15_hourly_cost_override: 50000,
      q15_is_unknown: false,
      q16_cost_mandate: "Moderate priority",
      q17_opex_reduction: "15–25%",
      q17_override: 20,
      q18_audit_effort: "Moderate (20–80 hours/year)",
      q19_documentation_effort: "Manual diagrams / partial docs",
      q20_annual_labor_rate: 185000,
      q20_use_default: false,
      q21_annual_mq_spend: 450000,
      q21_is_unknown: false,
      q22_migration_plans: "Near-term (90–180 days)",
    };

    // 1. Simulate saving to backend (payload transformation)
    const cleanRaw = { ...clientState };
    delete (cleanRaw as any).raw_responses;

    const backendStoredResponse = {
      q03_environment_scale: cleanRaw.q01_scale,
      q04_weekly_admin_hours: cleanRaw.q04_admin_hours,
      q05_mq_role_split: cleanRaw.q03_staffing_model,
      q06_frequency_text: cleanRaw.q06_frequency,
      q07_labor_hours_text: cleanRaw.q07_labor_hours,
      q07_labor_hours_override: cleanRaw.q07_override,
      q08_duration_text: cleanRaw.q08_duration,
      q09_root_cause_categories: cleanRaw.q09_tools_count,
      q10_problem_types: cleanRaw.q10_manual_tracing,
      q11_monitoring_status: cleanRaw.q11_productivity_constraint,
      q12_business_impact: cleanRaw.q12_business_impact,
      q14_duration_text: cleanRaw.q14_disruption_duration,
      q15_hourly_cost_override: cleanRaw.q15_hourly_cost_override,
      q16_config_management_method: cleanRaw.q16_cost_mandate,
      q18_audit_effort: cleanRaw.q18_audit_effort,
      q19_documentation_effort: cleanRaw.q19_documentation_effort,
      q20_annual_labor_rate: cleanRaw.q20_annual_labor_rate,
      q21_annual_mq_spend: cleanRaw.q21_annual_mq_spend,
      q22_migration_plans: cleanRaw.q22_migration_plans,
      raw_responses: cleanRaw,
    };

    // 2. Reload / resume from backend
    const reloadedState = normalizeResponseState(backendStoredResponse, QUESTIONS);

    // Verify all 22 questions restored identically
    expect(reloadedState.q01_scale).toBe("51–100");
    expect(reloadedState.q01_override).toBe(75);
    expect(reloadedState.q02_staffing).toBe("3–5");
    expect(reloadedState.q02_override).toBe(4);
    expect(reloadedState.q03_staffing_model).toBe("Centralized dedicated MQ team");
    expect(reloadedState.q04_dropdown).toBe("10–20 hours");
    expect(reloadedState.q04_admin_hours).toBe(15);
    expect(reloadedState.q05_tech_debt).toBe("Moderate debt");
    expect(reloadedState.q06_frequency).toBe("Monthly");
    expect(reloadedState.q07_labor_hours).toBe("1–4 hours");
    expect(reloadedState.q07_override).toBe(2.5);
    expect(reloadedState.q08_duration).toBe("1–2 hours");
    expect(reloadedState.q09_tools_count).toBe("3–5 tools");
    expect(reloadedState.q10_manual_tracing).toBe("Partially automated scripts");
    expect(reloadedState.q11_productivity_constraint).toBe("Slow cross-team root cause isolation on bridge calls");
    expect(reloadedState.q12_business_impact).toBe("Moderate");
    expect(reloadedState.q13_recent_disruptions).toBe("Yes, 1–2 significant disruptions");
    expect(reloadedState.q14_disruption_duration).toBe("1–2 hours");
    expect(reloadedState.q15_hourly_cost_override).toBe(50000);
    expect(reloadedState.q15_is_unknown).toBe(false);
    expect(reloadedState.q16_cost_mandate).toBe("Moderate priority");
    expect(reloadedState.q17_opex_reduction).toBe("15–25%");
    expect(reloadedState.q17_override).toBe(20);
    expect(reloadedState.q18_audit_effort).toBe("Moderate (20–80 hours/year)");
    expect(reloadedState.q19_documentation_effort).toBe("Manual diagrams / partial docs");
    expect(reloadedState.q20_annual_labor_rate).toBe(185000);
    expect(reloadedState.q20_use_default).toBe(false);
    expect(reloadedState.q21_annual_mq_spend).toBe(450000);
    expect(reloadedState.q21_is_unknown).toBe(false);
    expect(reloadedState.q22_migration_plans).toBe("Near-term (90–180 days)");
  });

  it("handles repeated save -> reload -> edit -> save -> reload cycles without progressive mutation or nesting", () => {
    let state: AssessmentResponseState = {
      q01_scale: "26–50",
      q04_admin_hours: 10,
      q20_use_default: true,
    };

    // Cycle 1: Save
    const cleanRaw1 = { ...state };
    delete (cleanRaw1 as any).raw_responses;
    const db1 = {
      q03_environment_scale: cleanRaw1.q01_scale,
      q04_weekly_admin_hours: cleanRaw1.q04_admin_hours,
      raw_responses: cleanRaw1,
    };

    // Cycle 1: Reload
    const reloaded1 = normalizeResponseState(db1, QUESTIONS);
    expect(reloaded1.q01_scale).toBe("26–50");
    expect(reloaded1.q04_admin_hours).toBe(10);
    expect((reloaded1 as any).raw_responses).toBeUndefined();

    // Cycle 2: Edit
    const edited = {
      ...reloaded1,
      q01_scale: "51–100",
      q02_staffing: "6–10",
      q02_override: 8,
    };

    // Cycle 2: Save
    const cleanRaw2 = { ...edited };
    delete (cleanRaw2 as any).raw_responses;
    const db2 = {
      q03_environment_scale: cleanRaw2.q01_scale,
      q04_weekly_admin_hours: cleanRaw2.q04_admin_hours,
      raw_responses: cleanRaw2,
    };

    // Cycle 2: Reload
    const reloaded2 = normalizeResponseState(db2, QUESTIONS);
    expect(reloaded2.q01_scale).toBe("51–100");
    expect(reloaded2.q02_staffing).toBe("6–10");
    expect(reloaded2.q02_override).toBe(8);
    expect(reloaded2.q04_admin_hours).toBe(10);
    expect((reloaded2 as any).raw_responses).toBeUndefined();
  });

  it("resiliently normalizes label strings and dash differences (e.g. '51-100 Queue Managers') to option values", () => {
    // Test structured response with label variation and regular hyphen
    const rawWithLabels = {
      q03_environment_scale: "51-100 Queue Managers",
      q05_mq_role_split: "Centralized dedicated MQ team",
      raw_responses: {
        q01_scale: "51-100 Queue Managers",
        q02_staffing: "1-2 Engineers",
      },
    };

    const normalized = normalizeResponseState(rawWithLabels, QUESTIONS);
    expect(normalized.q01_scale).toBe("51–100");
    expect(normalized.q02_staffing).toBe("1–2");
    expect(normalized.q03_staffing_model).toBe("Centralized dedicated MQ team");
  });

  it("survives pure structured-only backend responses where raw_responses was null", () => {
    const structuredOnly = {
      q03_environment_scale: "51–100",
      q04_weekly_admin_hours: 20,
      q05_mq_role_split: "Shared middleware / platform team",
      q06_frequency_text: "Weekly",
      q07_labor_hours_text: "4–8 hours",
      q07_labor_hours_override: 6,
      q08_duration_text: "2–4 hours",
      q09_root_cause_categories: "Channel disconnects",
      q10_problem_types: "Queue full",
      q11_monitoring_status: "Third-party tooling",
      q12_business_impact: "Moderate",
      q14_duration_text: "1–2 hours",
      q15_hourly_cost_override: null,
      q16_config_management_method: "Ansible automation",
      q18_audit_effort: "< 1 day",
      q19_documentation_effort: "Up to date runbooks",
      q20_annual_labor_rate: 180000,
      q21_annual_mq_spend: null,
      q22_migration_plans: "Evaluating hybrid cloud",
      raw_responses: null,
    };

    const reloaded = normalizeResponseState(structuredOnly, QUESTIONS);
    expect(reloaded.q01_scale).toBe("51–100");
    expect(reloaded.q03_staffing_model).toBe("Shared middleware / platform team");
    expect(reloaded.q04_admin_hours).toBe(20);
    expect(reloaded.q06_frequency).toBe("Weekly");
    expect(reloaded.q07_labor_hours).toBe("4–8 hours");
    expect(reloaded.q07_override).toBe(6);
    expect(reloaded.q20_annual_labor_rate).toBe(180000);
    expect(reloaded.q20_use_default).toBe(false);
  });
});
