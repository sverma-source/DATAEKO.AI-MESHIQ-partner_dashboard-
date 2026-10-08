import { describe, it, expect } from "vitest";
import { generateReportHtml } from "../../scripts/render_report_pdf.mjs";

describe("PDF Report Deliverable — Q20 Loaded Rate Dynamic Narrative", () => {
  const mockCustomer = {
    name: "DATAEKO UX Verification Client 01",
    industry: "Enterprise Financial Technology",
  };

  const mockAssessment = {
    id: "ass-q20-narrative-test",
    title: "Executive Economic Assessment",
    version: 1,
    status: "FINALIZED",
  };

  it("dynamically renders customer override Q20 ($250,000) loaded-rate narrative", () => {
    const customSnapshot = {
      calculation_engine_version: "1.0.0",
      assessment_version: 1,
      calculated_at: "2026-10-08T11:00:00Z",
      computed_metrics: {
        loaded_annual_labor_cost: {
          value: 250000,
          state: "VALID",
          provenance: "CUSTOMER_FACT",
        },
        loaded_hourly_rate: {
          value: 120.19230769230769,
          state: "VALID",
          provenance: "CALCULATED_RESULT",
        },
        annual_admin_hours: { value: 480, state: "VALID" },
        annual_troubleshooting_hours: { value: 884, state: "VALID" },
        total_operational_annual_hours: { value: 1364, state: "VALID" },
        operational_fte_burden: { value: 0.655769, state: "VALID" },
        annual_admin_labor_cost: { value: 57692.31, state: "VALID" },
        annual_troubleshooting_labor_cost: { value: 106250.0, state: "VALID" },
        total_quantified_labor_cost: { value: 163942.31, state: "VALID" },
      },
      summary_metrics: {
        loaded_annual_labor_cost: 250000,
        loaded_hourly_rate: 120.19230769230769,
        total_quantified_labor_cost: 163942.31,
      },
    };

    const html = generateReportHtml(customSnapshot, mockCustomer, mockAssessment);

    // Exact assertions requested:
    // 1. Contains "$250k ÷ 2,080 h"
    expect(html).toContain("$250k ÷ 2,080 h");
    // 2. Contains "$250,000 ÷ 2,080 hours"
    expect(html).toContain("$250,000 ÷ 2,080 hours");
    // 3. Narrative displays calculated rounded rate $120/hr
    expect(html).toContain("Loaded rate $120/hr ($250k ÷ 2,080 h)");
    // 4. Does NOT contain "$180k ÷ 2,080 h" for this custom snapshot
    expect(html).not.toContain("$180k ÷ 2,080 h");
    // 5. Does NOT contain "Loaded annual labor cost $180,000" for this custom snapshot
    expect(html).not.toContain("Loaded annual labor cost $180,000");
  });

  it("preserves default baseline narrative when snapshot uses default $180,000", () => {
    const defaultSnapshot = {
      calculation_engine_version: "1.0.0",
      assessment_version: 1,
      calculated_at: "2026-10-08T11:00:00Z",
      computed_metrics: {
        loaded_annual_labor_cost: {
          value: 180000,
          state: "VALID_WITH_DEFAULTS",
          provenance: "MODEL_ASSUMPTION",
        },
        loaded_hourly_rate: {
          value: 86.53846153846153,
          state: "VALID_WITH_DEFAULTS",
          provenance: "CALCULATED_RESULT",
        },
        annual_admin_hours: { value: 320, state: "VALID" },
        annual_troubleshooting_hours: { value: 208, state: "VALID" },
        total_operational_annual_hours: { value: 528, state: "VALID" },
        operational_fte_burden: { value: 0.2538, state: "VALID" },
        annual_admin_labor_cost: { value: 27692.31, state: "VALID" },
        annual_troubleshooting_labor_cost: { value: 18000.0, state: "VALID" },
        total_quantified_labor_cost: { value: 45692.31, state: "VALID" },
      },
      summary_metrics: {
        loaded_annual_labor_cost: 180000,
        loaded_hourly_rate: 86.53846153846153,
        total_quantified_labor_cost: 45692.31,
      },
    };

    const html = generateReportHtml(defaultSnapshot, mockCustomer, mockAssessment);

    // Default assertions:
    expect(html).toContain("$180k ÷ 2,080 h");
    expect(html).toContain("$180,000 ÷ 2,080 hours");
    expect(html).toContain("Loaded rate $87/hr ($180k ÷ 2,080 h)");
  });
});
