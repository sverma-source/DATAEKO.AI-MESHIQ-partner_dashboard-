import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read DATAEKO & meshIQ Logos as Base64 for zero-dependency print rendering
const logoPath = path.resolve(__dirname, "../public/dataeko-logo.png");
let logoBase64 = "";
if (fs.existsSync(logoPath)) {
  logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
}

const meshiqLogoPath = path.resolve(__dirname, "../public/meshiq-logo.png");
let meshiqLogoBase64 = "";
if (fs.existsSync(meshiqLogoPath)) {
  meshiqLogoBase64 = `data:image/png;base64,${fs.readFileSync(meshiqLogoPath).toString("base64")}`;
}

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

export function generateReportHtml(snapshot, customer = {}, assessment = {}) {
  const m = snapshot.computed_metrics || {};
  const summary = snapshot.summary || snapshot.summary_metrics || {};

  const getCanonicalMetricVal = (canonicalKey, legacyKeys = [], summaryKeys = []) => {
    if (m[canonicalKey] && m[canonicalKey].value !== undefined && m[canonicalKey].value !== null) {
      return m[canonicalKey].value;
    }
    for (const sk of summaryKeys) {
      if (summary[sk] !== undefined && summary[sk] !== null) {
        return summary[sk];
      }
    }
    for (const lk of legacyKeys) {
      if (m[lk] && m[lk].value !== undefined && m[lk].value !== null) {
        return m[lk].value;
      }
    }
    return null;
  };

  const getMetricState = (canonicalKey, legacyKeys = []) => {
    if (m[canonicalKey] && m[canonicalKey].state) {
      return m[canonicalKey].state;
    }
    for (const lk of legacyKeys) {
      if (m[lk] && m[lk].state) {
        return m[lk].state;
      }
    }
    return "VALID";
  };

  const totalLaborCostVal = getCanonicalMetricVal(
    "total_quantified_labor_cost",
    ["total_operational_labor_cost"],
    ["total_quantified_labor_cost", "total_operational_labor_cost"]
  );
  const adminLaborCostVal = getCanonicalMetricVal(
    "annual_admin_labor_cost",
    ["administrative_labor_cost"],
    ["annual_admin_labor_cost", "admin_annual_cost"]
  );
  const trbLaborCostVal = getCanonicalMetricVal(
    "annual_troubleshooting_labor_cost",
    ["troubleshooting_labor_cost"],
    ["annual_troubleshooting_labor_cost", "troubleshooting_annual_cost"]
  );
  const loadedRateVal = getCanonicalMetricVal("loaded_hourly_rate", [], ["loaded_hourly_rate"]);
  const fteBurdenVal = getCanonicalMetricVal(
    "operational_fte_burden",
    ["quantified_fte_burden"],
    ["operational_fte_burden", "quantified_fte_burden"]
  );

  const exposureCostVal = getCanonicalMetricVal(
    "potential_financial_exposure",
    ["representative_single_event_exposure"],
    ["potential_financial_exposure", "representative_single_event_exposure"]
  );
  const repDurationVal = getCanonicalMetricVal(
    "representative_duration_hours",
    ["representative_incident_duration_hours"],
    ["representative_duration_hours"]
  );
  const appRateVal = getCanonicalMetricVal(
    "applicable_financial_rate",
    ["revenue_impact_per_hour"],
    ["applicable_financial_rate"]
  );

  const scenarioVal = getCanonicalMetricVal(
    "illustrative_economic_value",
    ["improvement_scenario_economic_value"],
    ["illustrative_economic_value", "illustrative_annual_labor_savings"]
  );
  const recoverableHoursVal = getCanonicalMetricVal(
    "total_recovered_hours",
    ["improvement_scenario_recoverable_total_hours"],
    ["total_recovered_hours", "total_recoverable_labor_hours"]
  );
  const trbOppCostVal = getCanonicalMetricVal(
    "troubleshooting_productivity_opportunity",
    ["troubleshooting_productivity_opportunity_cost"],
    ["troubleshooting_productivity_opportunity", "troubleshooting_productivity_opportunity_cost"]
  );
  const mqSpendVal = getCanonicalMetricVal(
    "customer_reported_mq_spend",
    ["customer_reported_annual_spend"],
    ["customer_reported_mq_spend", "customer_reported_annual_spend"]
  );

  const adminHoursVal = getCanonicalMetricVal(
    "annual_admin_hours",
    ["routine_admin_annual_hours", "admin_annual_hours"],
    ["admin_annual_hours"]
  );
  const trbHoursVal = getCanonicalMetricVal(
    "annual_troubleshooting_hours",
    ["troubleshooting_annual_hours"],
    ["troubleshooting_annual_hours"]
  );
  const totalHoursVal = getCanonicalMetricVal(
    "total_operational_annual_hours",
    [],
    ["total_operational_annual_hours", "total_operational_hours"]
  );

  const laborState = getMetricState("total_quantified_labor_cost", ["total_operational_labor_cost"]);
  const exposureState = getMetricState("potential_financial_exposure", ["representative_single_event_exposure"]);
  const scenarioState = getMetricState("illustrative_economic_value", ["improvement_scenario_economic_value"]);

  const adminLaborCost = formatCurrency(adminLaborCostVal);
  const trbLaborCost = formatCurrency(trbLaborCostVal);
  const totalLaborCost = formatCurrency(totalLaborCostVal);
  const adminHoursFormatted = adminHoursVal !== null && adminHoursVal !== undefined ? formatNumber(adminHoursVal, 0) : "—";
  const trbHoursFormatted = trbHoursVal !== null && trbHoursVal !== undefined ? formatNumber(trbHoursVal, 0) : "—";
  const totalHoursFormatted = totalHoursVal !== null && totalHoursVal !== undefined ? formatNumber(totalHoursVal, 0) : "—";
  const fteBurden = fteBurdenVal !== null && fteBurdenVal !== undefined ? Number(fteBurdenVal).toFixed(2) : "—";
  const exposureCost = formatCurrency(exposureCostVal);
  const mqSpend = formatCurrency(mqSpendVal);
  const scenarioValue = formatCurrency(scenarioVal);
  const recoverableHours = recoverableHoursVal !== null && recoverableHoursVal !== undefined ? formatNumber(recoverableHoursVal, 0) : "—";
  const trbOppCost = formatCurrency(trbOppCostVal);

  const customerName = customer.name || "Enterprise Customer";
  const assessmentTitle = assessment.title || "Assessment Intake Session";
  const engineVersion = snapshot.calculation_engine_version || "1.0.0";
  const calculatedAtStr = snapshot.calculated_at
    ? new Date(snapshot.calculated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const effectiveLoadedRate = loadedRateVal ? Number(loadedRateVal) : 86.54;
  const roundedLoadedRate = Math.round(effectiveLoadedRate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Customer Report — ${customerName}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 12mm 10mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.45;
      font-size: 9.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      page-break-after: always;
      height: 275mm;
      max-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      overflow: hidden;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header-logo {
      height: 24px;
      width: auto;
      object-fit: contain;
    }
    .header-right-p1 {
      text-align: right;
    }
    .header-right-p1 .title {
      font-size: 8pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-right-p1 .sub {
      font-size: 7.5pt;
      color: #64748B;
      margin-top: 1px;
    }
    .header-right-subsequent {
      font-size: 8pt;
      color: #64748B;
      text-align: right;
    }
    .header-right-subsequent strong {
      color: #334155;
      font-weight: 600;
    }
    .hero-banner {
      background: #0D1322;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 10px;
      color: #FFFFFF;
    }
    .hero-tag {
      font-size: 7pt;
      font-weight: 800;
      color: #8CC63E;
      text-transform: uppercase;
      letter-spacing: 1.8px;
      margin-bottom: 4px;
    }
    .hero-title {
      font-size: 18pt;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1.2;
      margin-bottom: 2px;
      letter-spacing: -0.3px;
    }
    .hero-sub {
      font-size: 8.5pt;
      color: #94A3B8;
      font-weight: 500;
    }
    .meta-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .meta-col .label {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-col .val {
      font-size: 8pt;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.25;
    }
    .meta-col .val-sub {
      font-size: 7pt;
      font-weight: 500;
      color: #64748B;
    }
    .section-heading {
      font-size: 12.5pt;
      font-weight: 800;
      color: #0F172A;
      border-left: 3.5px solid #008638;
      padding-left: 8px;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .kpi-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .kpi-card.highlight {
      background: #F0FDF4;
      border-color: #BBF7D0;
    }
    .kpi-card-title {
      font-size: 6.5pt;
      font-weight: 800;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .kpi-card.highlight .kpi-card-title {
      color: #008638;
    }
    .kpi-card-value {
      font-size: 16pt;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.1;
      margin-bottom: 4px;
      font-feature-settings: "tnum";
    }
    .kpi-card-sub {
      font-size: 7pt;
      color: #64748B;
      line-height: 1.2;
      min-height: 18px;
      margin-bottom: 6px;
    }
    .kpi-card.highlight .kpi-card-sub {
      color: #15803D;
    }
    .badge {
      display: inline-block;
      font-size: 6.5pt;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid transparent;
    }
    .badge-calc {
      background: #EFF6FF;
      color: #1D4ED8;
      border-color: #BFDBFE;
    }
    .badge-fact {
      background: #ECFDF5;
      color: #047857;
      border-color: #A7F3D0;
    }
    .badge-scen {
      background: #FFFBEB;
      color: #B45309;
      border-color: #FDE68A;
    }
    .badge-bench {
      background: #F8FAFC;
      color: #475569;
      border-color: #CBD5E1;
    }
    .badge-base {
      background: #F8FAFC;
      color: #475569;
      border-color: #CBD5E1;
    }
    .synthesis-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 3.5px solid #008638;
      border-radius: 4px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    .synthesis-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .synthesis-card p {
      font-size: 7.5pt;
      color: #334155;
      line-height: 1.45;
      margin-bottom: 6px;
    }
    .synthesis-card p:last-child {
      margin-bottom: 0;
    }
    .read-guide-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 7px 10px;
      font-size: 7pt;
      color: #64748B;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .read-guide-title {
      font-size: 6.5pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .breakdown-bar-wrap {
      margin-bottom: 10px;
    }
    .breakdown-bar-title {
      font-size: 8pt;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .breakdown-bar-container {
      display: flex;
      gap: 3px;
      border-radius: 4px;
      overflow: hidden;
    }
    .breakdown-bar-segment {
      padding: 5px 10px;
      font-size: 7.5pt;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .breakdown-admin {
      flex: 1;
      background: #008638;
    }
    .breakdown-trb {
      flex: 1;
      background: #2563EB;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 6px;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      overflow: hidden;
    }
    table.data-table th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 6.5pt;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
      text-align: left;
    }
    table.data-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
      color: #0F172A;
      vertical-align: middle;
    }
    table.data-table tr:last-child td {
      border-bottom: none;
    }
    table.data-table tr.total-row td {
      background: #F8FAFC;
      font-weight: 800;
      border-top: 2px solid #CBD5E1;
      border-bottom: none;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .table-note {
      font-size: 6.5pt;
      color: #64748B;
      font-style: italic;
      line-height: 1.35;
      margin-bottom: 10px;
    }
    .math-card {
      background: #F0F9FF;
      border: 1px solid #BAE6FD;
      border-radius: 5px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .math-title {
      font-size: 7pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .math-formula {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 8pt;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .math-formula-sub {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 8pt;
      font-weight: 800;
      color: #008638;
      margin-bottom: 4px;
    }
    .math-inputs {
      font-size: 6.8pt;
      color: #334155;
      line-height: 1.35;
      margin-bottom: 2px;
    }
    .math-engine {
      font-size: 6.5pt;
      color: #64748B;
    }
    .cards-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .feature-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .feature-card.highlight {
      background: #F0FDF4;
      border-color: #BBF7D0;
    }
    .feature-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .feature-card-title {
      font-size: 7pt;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.25;
    }
    .feature-card.highlight .feature-card-title {
      color: #008638;
    }
    .feature-card-val {
      font-size: 17pt;
      font-weight: 900;
      color: #0F172A;
      line-height: 1.1;
      margin-bottom: 4px;
      font-feature-settings: "tnum";
    }
    .feature-card-desc {
      font-size: 7pt;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 6px;
    }
    .feature-card.highlight .feature-card-desc {
      color: #15803D;
    }
    .feature-card-rule {
      background: #F8FAFC;
      border-left: 3px solid #64748B;
      padding: 5px 8px;
      border-radius: 0 4px 4px 0;
      font-size: 6.5pt;
      color: #334155;
      line-height: 1.35;
    }
    .feature-card-rule.amber {
      background: #FFFBEB;
      border-left-color: #F59E0B;
      color: #92400E;
    }
    .safeguards-heading {
      font-size: 8pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .safeguards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 8px;
    }
    .safeguard-item {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 4px;
      padding: 6px 8px;
    }
    .safeguard-item.blue {
      background: #F0F9FF;
      border-color: #BAE6FD;
    }
    .safeguard-title {
      font-size: 6.5pt;
      font-weight: 800;
      color: #B45309;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 0.4px;
    }
    .safeguard-item.blue .safeguard-title {
      color: #0369A1;
    }
    .safeguard-text {
      font-size: 6.2pt;
      color: #78350F;
      line-height: 1.35;
    }
    .safeguard-item.blue .safeguard-text {
      color: #0C4A6E;
    }
    .cta-banner {
      background: #0D1322;
      border-left: 4px solid #008638;
      border-radius: 5px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      color: #FFFFFF;
    }
    .cta-title {
      font-size: 9pt;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 2px;
    }
    .cta-sub {
      font-size: 7pt;
      color: #94A3B8;
    }
    .cta-links {
      text-align: right;
      font-size: 8pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .cta-links a {
      text-decoration: none;
    }
    .cta-link-primary {
      color: #00D26A;
      display: block;
      margin-bottom: 2px;
    }
    .cta-link-secondary {
      color: #E2E8F0;
      display: block;
    }
    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7pt;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      padding-top: 6px;
      margin-top: auto;
    }
    .footer-logo {
      height: 13px;
      width: auto;
      object-fit: contain;
      vertical-align: middle;
      margin-left: 4px;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER & EXECUTIVE SUMMARY -->
  <div class="page">
    <div>
      <div class="header-top">
        <div>
          ${meshiqLogoBase64 ? `<img src="${meshiqLogoBase64}" alt="meshIQ" class="header-logo" />` : `<span style="font-size: 15pt; font-weight: 900; color: #008638;">meshIQ</span>`}
        </div>
        <div class="header-right-p1">
          <div class="title">EXECUTIVE CUSTOMER REPORT</div>
          <div class="sub">Version 1.0 (Deterministic)</div>
        </div>
      </div>

      <div class="hero-banner">
        <div class="hero-tag">ENTERPRISE MESSAGING ECONOMIC ASSESSMENT</div>
        <h1 class="hero-title">${assessmentTitle}</h1>
        <div class="hero-sub">Executive Assessment Report &amp; Economic Baseline</div>
      </div>

      <div class="meta-strip">
        <div class="meta-col">
          <div class="label">CUSTOMER ORGANIZATION</div>
          <div class="val">${customerName}</div>
        </div>
        <div class="meta-col">
          <div class="label">ASSESSMENT SCOPE</div>
          <div class="val">${assessmentTitle}</div>
        </div>
        <div class="meta-col">
          <div class="label">ASSESSMENT DATE</div>
          <div class="val">${calculatedAtStr}</div>
        </div>
        <div class="meta-col">
          <div class="label">ENGINE VERSION</div>
          <div class="val font-mono">v${engineVersion} · calc snapshot</div>
          <div class="val-sub">(immutable)</div>
        </div>
      </div>

      <div class="section-heading">1. Executive Summary</div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-title">QUANTIFIED OPERATIONAL LABOR</div>
          <div class="kpi-card-value">${totalLaborCost}</div>
          <div class="kpi-card-sub">per year · ${fteBurden} FTE</div>
          <div><span class="badge badge-calc">CALCULATED</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-title">SINGLE-EVENT EXPOSURE</div>
          <div class="kpi-card-value" style="color: #C2410C;">${exposureCost}</div>
          <div class="kpi-card-sub">One representative event<br>(not annual)</div>
          <div><span class="badge badge-fact">CUSTOMER FACT</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-title">CUSTOMER-REPORTED MQ SPEND</div>
          <div class="kpi-card-value">${mqSpend}</div>
          <div class="kpi-card-sub">Isolated spend (Q21)</div>
          <div><span class="badge badge-fact">CUSTOMER FACT</span></div>
        </div>

        <div class="kpi-card highlight">
          <div class="kpi-card-title">ILLUSTRATIVE ECONOMIC VALUE</div>
          <div class="kpi-card-value" style="color: #008638;">${scenarioValue}</div>
          <div class="kpi-card-sub">${recoverableHours} staff hours recovered ·<br>per year</div>
          <div><span class="badge badge-scen">SCENARIO</span></div>
        </div>
      </div>

      <div class="synthesis-card">
        <div class="synthesis-title">EXECUTIVE ECONOMIC SYNTHESIS</div>
        <p>
          ${laborState === "NOT_MODELED"
            ? "Quantified operational labor burden has not been modeled for this assessment scope."
            : laborState === "INSUFFICIENT_DATA"
            ? "Quantified operational labor burden cannot be calculated due to insufficient customer data."
            : `Quantified ongoing operational labor reflects an annual investment of <strong>${totalLaborCost}</strong>${fteBurdenVal !== null && fteBurdenVal !== undefined ? ` across <strong>${fteBurden} operational FTEs</strong>` : ""}, split between routine administration (<strong>${adminLaborCost}</strong>) and incident troubleshooting (<strong>${trbLaborCost}</strong>). The loaded hourly rate is established at <strong>$${roundedLoadedRate}/hr</strong>.`}
        </p>
        <p>
          ${exposureState === "NOT_MODELED"
            ? "Single-event financial exposure has not been modeled for this assessment scope."
            : exposureState === "INSUFFICIENT_DATA"
            ? "Single-event financial exposure cannot be calculated because incident duration or financial impact rate data was unprovided."
            : `Potential business exposure from a single representative messaging disruption is estimated at <strong>${exposureCost}</strong>, based on a representative duration of <strong>${formatNumber(repDurationVal, 1)} hours</strong> and an applicable financial rate of <strong>${formatCurrency(appRateVal)}/hr</strong>. Single-event exposure is <strong>not an annualized loss figure</strong> and should not be multiplied across time.`}
        </p>
        <p>
          ${scenarioState === "NOT_MODELED"
            ? "Capacity recovery scenarios have not been modeled for this assessment scope."
            : scenarioState === "INSUFFICIENT_DATA"
            ? "Recoverable capacity opportunity cannot be projected without quantified operational labor baselines."
            : `Under approved baseline scenario assumptions (addressing 50% of routine administration at 50% efficiency, and reducing investigation effort by 25%), the modeled scenario indicates an <strong>illustrative economic value of approximately ${scenarioValue}</strong> annually through the recovery of <strong>${recoverableHours} staff hours</strong>. Illustrative economic value is <strong>not guaranteed cash savings, realized savings, or fixed ROI</strong>.`}
        </p>
      </div>

      <div class="read-guide-card">
        <div class="read-guide-title">HOW TO READ THIS REPORT</div>
        Each figure carries a provenance tag showing where it comes from: <strong>Customer Fact</strong> (entered by the customer), <strong>Calculated</strong> (deterministic result), <strong>Benchmark</strong> (approved external standard) or <strong>Scenario</strong> (illustrative projection). Definitions are in Section 5.
      </div>
    </div>

    <div class="footer-bar">
      <div>© 2026 meshIQ · DATAEKO × meshIQ Assessment · Confidential</div>
      <div>Page 1 of 3</div>
      <div>
        <span>Powered by</span>
        ${logoBase64 ? `<img src="${logoBase64}" alt="DATAEKO" class="footer-logo" />` : `<strong style="color: #0F172A;">DATAEKO</strong>`}
      </div>
    </div>
  </div>

  <!-- PAGE 2: OPERATIONAL EFFORT & LABOR COST DECOMPOSITION -->
  <div class="page">
    <div>
      <div class="header-top">
        <div>
          ${meshiqLogoBase64 ? `<img src="${meshiqLogoBase64}" alt="meshIQ" class="header-logo" />` : `<span style="font-size: 15pt; font-weight: 900; color: #008638;">meshIQ</span>`}
        </div>
        <div class="header-right-subsequent">
          Executive Assessment Report · <strong>${customerName}</strong>
        </div>
      </div>

      <div class="section-heading">2. Operational Effort &amp; Labor Cost Decomposition</div>

      <!-- Neutral non-proportional visual breakdown per strict business guardrail -->
      <div class="breakdown-bar-wrap">
        <div class="breakdown-bar-title">Where the ${totalLaborCost} comes from</div>
        <div class="breakdown-bar-container">
          <div class="breakdown-bar-segment breakdown-admin">
            Routine administration ${adminLaborCost}
          </div>
          <div class="breakdown-bar-segment breakdown-trb">
            Troubleshooting ${trbLaborCost}
          </div>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 27%;">WORKLOAD CATEGORY</th>
            <th style="width: 27%;">CALCULATION DRIVER</th>
            <th class="text-right" style="width: 12%;">ANNUAL<br>HOURS</th>
            <th class="text-right" style="width: 10%;">FTE<br>EQUIV.</th>
            <th class="text-right" style="width: 12%;">LABOR<br>COST</th>
            <th class="text-center" style="width: 12%;">PROVENANCE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Routine Administration</strong>
              <div style="font-size: 6.8pt; color: #64748B;">Quarterly admin workload × 4 quarters</div>
            </td>
            <td>Q04 Admin Workload</td>
            <td class="text-right font-mono">${adminHoursFormatted}</td>
            <td class="text-right font-mono" style="color: #64748B;">—</td>
            <td class="text-right font-mono font-bold">${adminLaborCost}</td>
            <td class="text-center"><span class="badge badge-calc">CALCULATED</span></td>
          </tr>
          <tr>
            <td>
              <strong>Incident Troubleshooting</strong>
              <div style="font-size: 6.8pt; color: #64748B;">Frequency × staff hours per investigation</div>
            </td>
            <td>Q06 Frequency × Q07 Staff Effort</td>
            <td class="text-right font-mono">${trbHoursFormatted}</td>
            <td class="text-right font-mono" style="color: #64748B;">—</td>
            <td class="text-right font-mono font-bold">${trbLaborCost}</td>
            <td class="text-center"><span class="badge badge-calc">CALCULATED</span></td>
          </tr>
          <tr class="total-row">
            <td>
              <strong>Total Quantified Operational Labor</strong>
              <div style="font-size: 6.8pt; color: #64748B; font-weight: normal;">Loaded rate $${roundedLoadedRate}/hr ($180k ÷ 2,080 h)</div>
            </td>
            <td>Admin + Troubleshooting</td>
            <td class="text-right font-mono">${totalHoursFormatted}</td>
            <td class="text-right font-mono font-bold">${fteBurden}</td>
            <td class="text-right font-mono font-bold">${totalLaborCost}</td>
            <td class="text-center"><span class="badge badge-calc">CALCULATED</span></td>
          </tr>
        </tbody>
      </table>
      <div class="table-note">
        Note: Total Operational FTE Burden is provided directly by the authoritative calculation engine (operational_fte_burden). Category-level hours and FTEs are not independently modeled in the snapshot.
      </div>

      <div class="math-card">
        <div class="math-title">SHOW THE MATH · TOTAL QUANTIFIED OPERATIONAL LABOR</div>
        <div class="math-formula">C_TOTAL = C_ADMIN + C_TRB</div>
        <div class="math-formula-sub">${totalLaborCost} = ${adminLaborCost} + ${trbLaborCost}</div>
        <div class="math-inputs">
          <strong>Inputs:</strong> Q04 quarterly admin workload (annualized × 4) · Q06 incident frequency · Q07 staff hours per investigation · Loaded annual labor cost $180,000 ÷ 2,080 hours = $${effectiveLoadedRate.toFixed(2)} (rounded to $${roundedLoadedRate}/hr in narrative).
        </div>
        <div class="math-engine">
          <strong>Engine:</strong> v${engineVersion} · values rendered directly from the immutable calculation snapshot.
        </div>
      </div>

      <div class="section-heading" style="margin-top: 14px;">3. Business Exposure &amp; Isolated MQ Spend</div>

      <div class="cards-2col">
        <div class="feature-card">
          <div>
            <div class="feature-card-head">
              <div class="feature-card-title">REPRESENTATIVE SINGLE-EVENT EXPOSURE</div>
              <span class="badge badge-fact">CUSTOMER FACT</span>
            </div>
            <div class="feature-card-val" style="color: #C2410C;">${exposureCost}</div>
            <div class="feature-card-desc">
              Modeled consequence: duration (Q14) × hourly financial rate (Q15 or benchmark).
            </div>
          </div>
          <div class="feature-card-rule amber">
            <strong>Interpretation safeguard:</strong> models one representative disruption and must never be read as an annualized loss estimate.
          </div>
        </div>

        <div class="feature-card">
          <div>
            <div class="feature-card-head">
              <div class="feature-card-title">CUSTOMER-REPORTED ANNUAL MQ SPEND</div>
              <span class="badge badge-fact">CUSTOMER FACT</span>
            </div>
            <div class="feature-card-val">${mqSpend}</div>
            <div class="feature-card-desc">
              Direct customer input provided in discovery question Q21.
            </div>
          </div>
          <div class="feature-card-rule">
            <strong>Isolation rule:</strong> preserved in strict isolation; never added to operational labor or used to derive ROI metrics.
          </div>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <div>© 2026 meshIQ · DATAEKO × meshIQ Assessment · Confidential</div>
      <div>Page 2 of 3</div>
      <div>
        <span>Powered by</span>
        ${logoBase64 ? `<img src="${logoBase64}" alt="DATAEKO" class="footer-logo" />` : `<strong style="color: #0F172A;">DATAEKO</strong>`}
      </div>
    </div>
  </div>

  <!-- PAGE 3: SCENARIOS, PROVENANCE, SAFEGUARDS & CTA -->
  <div class="page">
    <div>
      <div class="header-top">
        <div>
          ${meshiqLogoBase64 ? `<img src="${meshiqLogoBase64}" alt="meshIQ" class="header-logo" />` : `<span style="font-size: 15pt; font-weight: 900; color: #008638;">meshIQ</span>`}
        </div>
        <div class="header-right-subsequent">
          Executive Assessment Report · <strong>${customerName}</strong>
        </div>
      </div>

      <div class="section-heading">4. Improvement Scenarios &amp; Productivity Opportunity</div>

      <div class="cards-2col">
        <div class="feature-card">
          <div class="feature-card-head">
            <div class="feature-card-title">TROUBLESHOOTING PRODUCTIVITY OPPORTUNITY (10%)</div>
            <span class="badge badge-calc">CALCULATED</span>
          </div>
          <div class="feature-card-val" style="color: #1D4ED8;">${trbOppCost}</div>
          <div class="feature-card-desc">
            Direct 10% productivity opportunity applied to annual troubleshooting labor (${trbLaborCost}).
          </div>
          <div style="font-size: 6.8pt; color: #64748B; margin-top: 4px;">
            Kept strictly separate from the 25% scenario below.
          </div>
        </div>

        <div class="feature-card highlight">
          <div class="feature-card-head">
            <div class="feature-card-title">MESHIQ IMPROVEMENT SCENARIO</div>
            <span class="badge badge-scen">SCENARIO</span>
          </div>
          <div class="feature-card-val" style="color: #008638;">${scenarioValue}</div>
          <div class="feature-card-desc">
            Recovers ${recoverableHours} hours per year: 50% routine admin share × 50% admin efficiency, plus 25% troubleshooting reduction.
          </div>
          <div style="font-size: 6.8pt; color: #15803D; font-weight: 600; margin-top: 4px;">
            Illustrative only. A projection, not a realized result.
          </div>
        </div>
      </div>

      <div class="section-heading">5. Data Provenance &amp; Trust Classification</div>

      <table class="data-table" style="margin-bottom: 8px;">
        <thead>
          <tr>
            <th style="width: 22%;">CLASSIFICATION</th>
            <th style="width: 48%;">DEFINITION &amp; MEANING</th>
            <th style="width: 30%;">METRIC EXAMPLES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-fact">CUSTOMER FACT</span></td>
            <td style="color: #334155;">Direct customer-provided information entered during assessment</td>
            <td style="color: #475569;">Q01 Scale, Q04 Workload, Q06 Frequency, Q07 Hours, Q21 Spend</td>
          </tr>
          <tr>
            <td><span class="badge badge-bench">BENCHMARK</span></td>
            <td style="color: #334155;">External standard applied under approved governance fallback rules</td>
            <td style="color: #475569;">ITIC $300,000/hr (applied when Q15 unknown and Q12 significant)</td>
          </tr>
          <tr>
            <td><span class="badge badge-calc">CALCULATED</span></td>
            <td style="color: #334155;">Deterministic mathematical result derived from customer facts</td>
            <td style="color: #475569;">Routine Admin Cost, Troubleshooting Labor Cost, FTE Burden</td>
          </tr>
          <tr>
            <td><span class="badge badge-base">MODEL BASELINE</span></td>
            <td style="color: #334155;">Approved scenario parameter baseline</td>
            <td style="color: #475569;">50% addressable admin share, 50% efficiency, 25% investigation reduction</td>
          </tr>
          <tr>
            <td><span class="badge badge-scen">SCENARIO</span></td>
            <td style="color: #334155;">Exploratory modeled outcome based on the approved scenario baseline</td>
            <td style="color: #475569;">Illustrative Economic Value (${scenarioValue})</td>
          </tr>
        </tbody>
      </table>

      <div class="safeguards-heading">Model Boundary — Governance &amp; Financial Safeguards</div>

      <div class="safeguards-grid">
        <div class="safeguard-item">
          <div class="safeguard-title">NO GUARANTEED CASH SAVINGS</div>
          <div class="safeguard-text">
            Capacity recovery models operational time returned to engineering teams. It does not automatically reduce headcount, payroll or operating expenditure unless deliberate organizational changes are made. Illustrative economic value is not guaranteed savings, realized savings or fixed ROI.
          </div>
        </div>

        <div class="safeguard-item">
          <div class="safeguard-title">NO ANNUALIZED EXPOSURE</div>
          <div class="safeguard-text">
            Single-event exposure models one representative disruption. Disruption frequency varies widely and cannot be inferred without long-term incident tracking; it is not an annualized loss estimate.
          </div>
        </div>

        <div class="safeguard-item">
          <div class="safeguard-title">NO VENDOR RECOMMENDATION</div>
          <div class="safeguard-text">
            Findings are objective, deterministic economic modeling based on customer-provided facts and approved benchmarks. They are not an endorsement or purchasing recommendation for any specific software product.
          </div>
        </div>

        <div class="safeguard-item blue">
          <div class="safeguard-title">DETERMINISTIC PRESENTATION</div>
          <div class="safeguard-text">
            All values are rendered directly from the immutable calculation snapshot without presentation-layer recomputation, ensuring end-to-end mathematical auditability.
          </div>
        </div>
      </div>

      <div class="cta-banner">
        <div>
          <div class="cta-title">Discuss these findings with a meshIQ architect</div>
          <div class="cta-sub">Walk through the assumptions, validate the baseline against your estate and plan next steps.</div>
        </div>
        <div class="cta-links">
          <a href="https://meshiq.com/contact-us" class="cta-link-primary">meshiq.com/contact-us</a>
          <a href="https://meshiq.com/request-a-demo" class="cta-link-secondary">meshiq.com/request-a-demo</a>
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <div>© 2026 meshIQ · DATAEKO × meshIQ Assessment · Confidential</div>
      <div>Page 3 of 3</div>
      <div>
        <span>Powered by</span>
        ${logoBase64 ? `<img src="${logoBase64}" alt="DATAEKO" class="footer-logo" />` : `<strong style="color: #0F172A;">DATAEKO</strong>`}
      </div>
    </div>
  </div>

</body>
</html>`;
}

export async function renderPdfFromPayload(payload, outputPath) {
  const { snapshot = {}, customer = {}, assessment = {} } = payload;
  const htmlContent = generateReportHtml(snapshot, customer, assessment);

  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const launchOptions = {
    headless: true,
  };
  if (process.env.CHROME_BIN) {
    launchOptions.executablePath = process.env.CHROME_BIN;
  } else if (fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      path: outputPath || undefined,
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "12mm",
        right: "12mm",
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// CLI Execution Support
async function main() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  let payload = {};
  if (inputPath) {
    const raw = fs.readFileSync(inputPath, "utf-8");
    payload = JSON.parse(raw);
  } else {
    // Default fallback sample payload for CLI invocation
    payload = {
      customer: { name: "Global Financial Services Corp", industry: "Banking & Capital Markets" },
      assessment: { title: "IBM MQ Economic Cost & Efficiency Assessment", version: "1.0.0" },
      snapshot: {
        calculation_engine_version: "1.0.0",
        calculated_at: "2026-09-25T12:00:00Z",
        summary_metrics: {
          admin_annual_cost: 16615.38,
          troubleshooting_annual_cost: 134999.99,
          total_operational_labor_cost: 151615.37,
          representative_single_event_exposure: 720000.0,
          customer_reported_annual_spend: 350000.0,
          troubleshooting_productivity_opportunity: 13500.0,
          illustrative_annual_labor_savings: 37903.85,
          total_recoverable_labor_hours: 438.0,
          operational_fte_burden: 0.84,
          admin_annual_hours: 192.0,
          troubleshooting_annual_hours: 1560.0,
        },
      },
    };
    if (!outputPath) {
      const outputDir = path.resolve(__dirname, "../../docs/artifacts");
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      outputPath = path.join(outputDir, "DATAEKO_meshIQ_Executive_Assessment_Report.pdf");
    }
  }

  const pdfBuffer = await renderPdfFromPayload(payload, outputPath);
  if (!outputPath) {
    process.stdout.write(pdfBuffer);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("PDF generation failed:", err);
    process.exit(1);
  });
}
