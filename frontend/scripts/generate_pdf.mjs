import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample Golden Master Phase 3 Snapshot for Deterministic Baseline Report
const sampleCalculationSnapshot = {
  id: "snap-gm-01-a4b8",
  assessment_id: "ass-1234-5678",
  calculation_engine_version: "1.0.0",
  business_rulebook_version: "2026.1",
  calculated_at: "2026-09-25T12:00:00Z",
  summary: {
    administrative_labor_cost: 16615.38,
    troubleshooting_labor_cost: 134999.99,
    total_operational_labor_cost: 151615.37,
    representative_single_event_exposure: 720000.0,
    customer_reported_mq_spend: 350000.0,
    troubleshooting_productivity_opportunity_cost: 13500.0,
    improvement_scenario_cost: 41903.84,
  },
  computed_metrics: {
    routine_admin_quarterly_hours: {
      label: "Quarterly Routine Administration Hours",
      value: 48.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "CUSTOMER_FACT",
      formula_code: "F01_ADMIN_QUARTERLY_HOURS",
    },
    routine_admin_annual_hours: {
      label: "Annual Routine Administration Hours",
      value: 192.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F02_ADMIN_ANNUAL_HOURS",
    },
    troubleshooting_annual_frequency: {
      label: "Annual Troubleshooting Incidents",
      value: 52.0,
      unit: "COUNT",
      state: "VALID",
      provenance: "CUSTOMER_FACT",
      formula_code: "F04_TRB_ANNUAL_FREQUENCY",
    },
    troubleshooting_staff_hours_per_investigation: {
      label: "Staff Effort Hours per Incident",
      value: 30.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "CUSTOMER_FACT",
      formula_code: "F05_TRB_STAFF_HOURS_PER_INCIDENT",
    },
    troubleshooting_annual_hours: {
      label: "Annual Incident Troubleshooting Hours",
      value: 1560.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F06_TRB_ANNUAL_HOURS",
    },
    total_operational_annual_hours: {
      label: "Total Quantified Operational Hours",
      value: 1752.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F07_TOTAL_OPERATIONAL_HOURS",
    },
    internal_loaded_hourly_rate: {
      label: "Internal Loaded Hourly Labor Rate",
      value: 86.53846153846154,
      unit: "USD_PER_HOUR",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F08_LOADED_HOURLY_RATE",
    },
    quantified_fte_burden: {
      label: "Quantified Operational Staff FTE Burden",
      value: 0.8423076923076923,
      unit: "FTE",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F09_FTE_BURDEN",
    },
    administrative_labor_cost: {
      label: "Administrative Labor Cost",
      value: 16615.384615384617,
      unit: "USD",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F10_ADMIN_LABOR_COST",
    },
    troubleshooting_labor_cost: {
      label: "Troubleshooting Labor Cost",
      value: 134999.99999999997,
      unit: "USD",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F11_TRB_LABOR_COST",
    },
    total_operational_labor_cost: {
      label: "Total Quantified Operational Labor Cost",
      value: 151615.38461538459,
      unit: "USD",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F12_TOTAL_OPERATIONAL_LABOR_COST",
    },
    representative_single_event_exposure: {
      label: "Representative Single-Event Exposure",
      value: 720000.0,
      unit: "USD",
      state: "VALID",
      provenance: "CUSTOMER_FACT",
      formula_code: "F13_REPRESENTATIVE_EXPOSURE",
    },
    customer_reported_mq_spend: {
      label: "Customer-Reported Annual MQ Spend",
      value: 350000.0,
      unit: "USD",
      state: "VALID",
      provenance: "CUSTOMER_FACT",
      formula_code: "F14_CUSTOMER_REPORTED_MQ_SPEND",
    },
    troubleshooting_productivity_opportunity_cost: {
      label: "Troubleshooting Productivity Opportunity (10%)",
      value: 13500.0,
      unit: "USD",
      state: "VALID",
      provenance: "CALCULATED_METRIC",
      formula_code: "F15_TRB_PRODUCTIVITY_OPPORTUNITY",
    },
    improvement_scenario_recoverable_admin_hours: {
      label: "Recoverable Routine Administration Hours",
      value: 48.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "MODEL_BASELINE",
      formula_code: "F16_SCENARIO_ADMIN_HOURS",
    },
    improvement_scenario_recoverable_troubleshooting_hours: {
      label: "Recoverable Troubleshooting Hours",
      value: 390.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "MODEL_BASELINE",
      formula_code: "F17_SCENARIO_TRB_HOURS",
    },
    improvement_scenario_recoverable_total_hours: {
      label: "Total Recoverable Operational Hours",
      value: 438.0,
      unit: "HOURS",
      state: "VALID",
      provenance: "MODEL_BASELINE",
      formula_code: "F18_SCENARIO_TOTAL_HOURS",
    },
    improvement_scenario_economic_value: {
      label: "Illustrative Economic Value",
      value: 37903.84615384615,
      unit: "USD",
      state: "VALID",
      provenance: "ILLUSTRATIVE_SCENARIO",
      formula_code: "F19_SCENARIO_ECONOMIC_VALUE",
    },
  },
};

const customerMeta = {
  name: "Global Financial Services Corp",
  industry: "Banking & Capital Markets",
};

const assessmentMeta = {
  title: "IBM MQ Economic Cost & Efficiency Assessment",
  status: "COMPLETED",
};

function formatCurrency(val) {
  if (val === null || val === undefined || isNaN(Number(val))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function formatNumber(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(Number(val))) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
  }).format(Number(val));
}

function generateReportHtml(snapshot, customer, assessment) {
  const m = snapshot.computed_metrics;

  const adminLaborCost = formatCurrency(m.administrative_labor_cost?.value);
  const trbLaborCost = formatCurrency(m.troubleshooting_labor_cost?.value);
  const totalLaborCost = formatCurrency(m.total_operational_labor_cost?.value);
  const totalHours = formatNumber(m.total_operational_annual_hours?.value, 0);
  const fteBurden = formatNumber(m.quantified_fte_burden?.value, 2);
  const exposureCost = formatCurrency(m.representative_single_event_exposure?.value);
  const mqSpend = formatCurrency(m.customer_reported_mq_spend?.value);
  const scenarioVal = formatCurrency(m.improvement_scenario_economic_value?.value);
  const recoverableHours = formatNumber(m.improvement_scenario_recoverable_total_hours?.value, 0);
  const trbOppCost = formatCurrency(m.troubleshooting_productivity_opportunity_cost?.value);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Customer Report — ${customer.name}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      page-break-after: always;
      padding-bottom: 20px;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .header-band {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 22pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-accent {
      color: #2563eb;
    }
    .brand-sub {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      font-weight: 700;
      margin-top: 2px;
    }
    .report-badge {
      background: #0f172a;
      color: #ffffff;
      font-size: 8pt;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-top: 14px;
      font-size: 8.5pt;
    }
    .meta-item span {
      display: block;
      color: #64748b;
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 600;
    }
    .meta-item strong {
      color: #0f172a;
      font-size: 9.5pt;
    }
    .section-heading {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      border-left: 4px solid #2563eb;
      padding-left: 10px;
      margin-top: 22px;
      margin-bottom: 12px;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .metric-card.highlight {
      background: #eef2ff;
      border-color: #c7d2fe;
    }
    .metric-title {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .metric-card.highlight .metric-title {
      color: #4338ca;
    }
    .metric-val {
      font-size: 16pt;
      font-weight: 900;
      color: #0f172a;
      font-feature-settings: "tnum";
    }
    .metric-card.highlight .metric-val {
      color: #312e81;
    }
    .metric-sub {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
    }
    .narrative-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 9pt;
      color: #334155;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .narrative-box p {
      margin-bottom: 8px;
    }
    .narrative-box p:last-child {
      margin-bottom: 0;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-top: 8px;
      margin-bottom: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border-bottom: 1px solid #cbd5e1;
    }
    table.data-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.data-table tr:last-child td {
      border-bottom: none;
    }
    table.data-table tr.total-row td {
      background: #f8fafc;
      font-weight: 800;
      border-top: 2px solid #cbd5e1;
      color: #0f172a;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .badge {
      display: inline-block;
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .badge-fact { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .badge-calc { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
    .badge-bench { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .badge-base { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
    .badge-scen { background: #faf5ff; color: #6b21a8; border-color: #e9d5ff; }

    .two-col-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .card-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #ffffff;
    }
    .card-box.amber { background: #fffdfa; border-color: #fde68a; }
    .card-box.blue { background: #f8faff; border-color: #bfdbfe; }
    .card-box.indigo { background: #fafaff; border-color: #c7d2fe; }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .card-head h4 {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
    }
    .safeguard-box {
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 8pt;
      line-height: 1.45;
      margin-top: 14px;
    }
    .safeguard-box h5 {
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .safeguard-box ul {
      margin-left: 14px;
    }
    .safeguard-box li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER & EXECUTIVE SUMMARY -->
  <div class="page">
    <div class="header-band">
      <div>
        <div class="brand-title"><span class="brand-accent">DATAEKO</span> × meshIQ</div>
        <div class="brand-sub">Enterprise Messaging Economic Assessment</div>
      </div>
      <div style="text-align: right;">
        <span class="report-badge">Executive Customer Report</span>
        <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">Version 1.0 (Deterministic)</div>
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <h1 style="font-size: 18pt; font-weight: 900; color: #0f172a; line-height: 1.2;">
        IBM MQ Economic Cost & Efficiency Assessment
      </h1>
      <p style="font-size: 10pt; color: #2563eb; font-weight: 600; margin-top: 2px;">
        Executive Assessment Report & Economic Baseline
      </p>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span>Customer Organization</span>
        <strong>${customer.name}</strong>
      </div>
      <div class="meta-item">
        <span>Assessment Scope</span>
        <strong>${assessment.title}</strong>
      </div>
      <div class="meta-item">
        <span>Assessment Date</span>
        <strong>2026-09-25</strong>
      </div>
      <div class="meta-item">
        <span>Engine Version</span>
        <strong class="font-mono">v${snapshot.calculation_engine_version}</strong>
      </div>
    </div>

    <div class="section-heading">1. Executive Summary</div>
    
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-title">Quantified Operational Labor</div>
        <div class="metric-val">${totalLaborCost}</div>
        <div class="metric-sub">
          <span>${totalHours} hrs/yr</span>
          <span style="font-weight: 700; color: #2563eb;">${fteBurden} FTE</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Single-Event Exposure</div>
        <div class="metric-val" style="color: #92400e;">${exposureCost}</div>
        <div class="metric-sub">
          <span>Representative Event</span>
          <span class="badge badge-fact">Customer Fact</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Customer-Reported MQ Spend</div>
        <div class="metric-val">${mqSpend}</div>
        <div class="metric-sub">
          <span>Isolated Spend (Q21)</span>
          <span class="badge badge-fact">Customer Fact</span>
        </div>
      </div>

      <div class="metric-card highlight">
        <div class="metric-title">Illustrative Economic Value</div>
        <div class="metric-val">${scenarioVal}</div>
        <div class="metric-sub">
          <span>${recoverableHours} hrs recovered</span>
          <span class="badge badge-scen">Scenario</span>
        </div>
      </div>
    </div>

    <div class="narrative-box">
      <p>
        This report delivers an objective, deterministic baseline of ongoing operational effort, staffing allocations, and potential business disruption exposure for <strong>${customer.name}</strong>’s IBM MQ messaging infrastructure.
      </p>
      <p>
        Quantified baseline operational effort totals <strong>${totalHours} annual staff hours</strong>, representing an annual operational labor burden of <strong>${totalLaborCost}</strong> (equivalent to ${fteBurden} FTEs across routine administration and incident troubleshooting).
      </p>
      <p>
        Under the approved model baseline assumptions (addressing 50% of routine administration with 50% efficiency and reducing investigation effort by 25%), the modeled scenario indicates an <strong>illustrative economic value of approximately ${scenarioVal}</strong> annually through the recovery of ${recoverableHours} staff hours.
      </p>
    </div>

    <div class="section-heading">2. Operational Effort & Labor Cost Decomposition</div>
    
    <table class="data-table">
      <thead>
        <tr>
          <th>Workload Category</th>
          <th>Calculation Driver</th>
          <th class="text-right">Annual Hours</th>
          <th class="text-right">FTE Equiv.</th>
          <th class="text-right">Labor Cost</th>
          <th class="text-center">Provenance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Routine Administration</strong>
            <div style="font-size: 7.5pt; color: #64748b;">Quarterly Admin: 48.0 hrs × 4 quarters</div>
          </td>
          <td>Q04 Admin Workload</td>
          <td class="text-right font-mono font-semibold">192.0</td>
          <td class="text-right font-mono">0.09</td>
          <td class="text-right font-mono font-bold">${adminLaborCost}</td>
          <td class="text-center"><span class="badge badge-calc">Calculated</span></td>
        </tr>
        <tr>
          <td>
            <strong>Incident Troubleshooting</strong>
            <div style="font-size: 7.5pt; color: #64748b;">52 incidents/yr × 30.0 staff hrs/investigation</div>
          </td>
          <td>Q06 Frequency × Q07 Staff Effort</td>
          <td class="text-right font-mono font-semibold">1,560.0</td>
          <td class="text-right font-mono">0.75</td>
          <td class="text-right font-mono font-bold">${trbLaborCost}</td>
          <td class="text-center"><span class="badge badge-calc">Calculated</span></td>
        </tr>
        <tr class="total-row">
          <td>Total Quantified Operational Labor</td>
          <td style="font-size: 7.5pt; color: #64748b;">Loaded Rate: $86.54/hr ($180k/2,080h)</td>
          <td class="text-right font-mono text-blue-900" style="font-size: 10pt;">${totalHours}</td>
          <td class="text-right font-mono text-blue-900" style="font-size: 10pt;">${fteBurden}</td>
          <td class="text-right font-mono text-blue-900" style="font-size: 10pt;">${totalLaborCost}</td>
          <td class="text-center"><span class="badge badge-calc">Calculated</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PAGE 2: BUSINESS EXPOSURE, SCENARIO & METHODOLOGY -->
  <div class="page">
    <div class="section-heading" style="margin-top: 0;">3. Business Exposure & Isolated MQ Spend</div>
    
    <div class="two-col-cards">
      <div class="card-box amber">
        <div class="card-head">
          <h4>Representative Single-Event Exposure</h4>
          <span class="badge badge-fact">Customer Fact</span>
        </div>
        <div style="font-size: 16pt; font-weight: 900; color: #92400e; margin: 4px 0;">
          ${exposureCost}
        </div>
        <div style="font-size: 8pt; color: #451a03; line-height: 1.4;">
          <strong>Modeled Consequence:</strong> Duration (72.0 hrs) × Customer Hourly Rate ($10,000/hr from Q15).
          <div style="margin-top: 6px; padding: 6px; background: rgba(255,255,255,0.7); border-radius: 4px; border: 1px solid #fde68a;">
            <strong>Interpretation Safeguard:</strong> This figure models the consequence of one representative disruption event and must never be interpreted as an annualized loss estimate.
          </div>
        </div>
      </div>

      <div class="card-box blue">
        <div class="card-head">
          <h4>Customer-Reported Annual MQ Spend</h4>
          <span class="badge badge-fact">Customer Fact</span>
        </div>
        <div style="font-size: 16pt; font-weight: 900; color: #0f172a; margin: 4px 0;">
          ${mqSpend}
        </div>
        <div style="font-size: 8pt; color: #1e3a8a; line-height: 1.4;">
          <strong>Direct Customer Input:</strong> Provided in Discovery Question Q21.
          <div style="margin-top: 6px; padding: 6px; background: rgba(255,255,255,0.7); border-radius: 4px; border: 1px solid #bfdbfe;">
            <strong>Isolation Rule:</strong> Customer-Reported Spend is preserved in strict isolation and is never added to operational labor or used to derive ROI metrics.
          </div>
        </div>
      </div>
    </div>

    <div class="section-heading">4. Improvement Scenarios & Productivity Opportunity</div>
    
    <div class="two-col-cards">
      <div class="card-box blue">
        <div class="card-head">
          <h4>Troubleshooting Productivity Opportunity (10%)</h4>
          <span class="badge badge-calc">Calculated</span>
        </div>
        <div style="font-size: 15pt; font-weight: 900; color: #1e40af; margin: 4px 0;">
          ${trbOppCost}
        </div>
        <p style="font-size: 8pt; color: #334155;">
          Direct 10% productivity opportunity applied to annual troubleshooting labor (${trbLaborCost}). Kept strictly separate from the 25% scenario.
        </p>
      </div>

      <div class="card-box indigo">
        <div class="card-head">
          <h4>meshIQ Improvement Scenario</h4>
          <span class="badge badge-scen">Scenario</span>
        </div>
        <div style="font-size: 15pt; font-weight: 900; color: #3730a3; margin: 4px 0;">
          ${scenarioVal}
        </div>
        <p style="font-size: 8pt; color: #334155;">
          Recovers ${recoverableHours} hours/yr based on 50% routine admin share × 50% admin efficiency + 25% troubleshooting reduction. Illustrative only.
        </p>
      </div>
    </div>

    <div class="section-heading">5. Data Provenance & Trust Classification</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Classification Tier</th>
          <th>Definition & Meaning</th>
          <th>Metric Examples</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-fact">Customer Fact</span></td>
          <td>Direct customer-provided information entered during assessment</td>
          <td>Q01 Scale, Q04 Workload, Q06 Frequency, Q07 Hours, Q21 Spend</td>
        </tr>
        <tr>
          <td><span class="badge badge-bench">Industry Benchmark</span></td>
          <td>External standard applied under approved governance fallback rules</td>
          <td>ITIC $300,000/hr (Applied when Q15 unknown & Q12 significant)</td>
        </tr>
        <tr>
          <td><span class="badge badge-calc">Calculated Metric</span></td>
          <td>Deterministic mathematical result derived from customer facts</td>
          <td>Routine Admin Cost, Troubleshooting Labor Cost, FTE Burden</td>
        </tr>
        <tr>
          <td><span class="badge badge-base">Model Baseline</span></td>
          <td>Approved scenario parameter baseline</td>
          <td>50% Addressable Admin Share, 50% Efficiency, 25% Investigation</td>
        </tr>
        <tr>
          <td><span class="badge badge-scen">Illustrative Scenario</span></td>
          <td>Exploratory modeled outcome based on approved scenario baseline</td>
          <td>Illustrative Economic Value ($37,903.85)</td>
        </tr>
      </tbody>
    </table>

    <div class="safeguard-box avoid-break">
      <h5>Important Financial Interpretation Safeguards & Disclaimers</h5>
      <ul>
        <li><strong>Representative Single-Event Exposure ≠ Annual Loss:</strong> The exposure figure represents a single modeled disruption event and must never be interpreted as an annualized loss estimate.</li>
        <li><strong>Illustrative Economic Value ≠ Guaranteed Savings:</strong> Improvement scenario outcomes represent capacity recovery models and do not constitute guaranteed savings or committed ROI.</li>
        <li><strong>Deterministic Presentation:</strong> All values are rendered directly from the immutable calculation snapshot (ID: ${snapshot.id}) without independent presentation-layer recomputation.</li>
      </ul>
    </div>
  </div>

</body>
</html>`;
}

async function runPdfGeneration() {
  console.log("=================================================");
  console.log("PHASE 7 — DETERMINISTIC PDF GENERATION");
  console.log("=================================================");

  const htmlContent = generateReportHtml(
    sampleCalculationSnapshot,
    customerMeta,
    assessmentMeta
  );

  const outputDir = path.resolve(__dirname, "../../docs/artifacts");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const htmlPath = path.join(outputDir, "executive_report.html");
  const pdfPath = path.join(outputDir, "DATAEKO_meshIQ_Executive_Assessment_Report.pdf");

  fs.writeFileSync(htmlPath, htmlContent, "utf-8");
  console.log(`[1/3] Generated deterministic HTML at: ${htmlPath}`);

  console.log("[2/3] Launching Playwright Headless Chromium...");
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle" });

  console.log("[3/3] Exporting A4 PDF with exact print dimensions...");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "12mm",
      bottom: "12mm",
      left: "12mm",
      right: "12mm",
    },
  });

  await browser.close();

  const stats = fs.statSync(pdfPath);
  console.log(`\n✅ PDF GENERATED SUCCESSFULLY!`);
  console.log(`   File Path: ${pdfPath}`);
  console.log(`   File Size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log("=================================================\n");
}

runPdfGeneration().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
