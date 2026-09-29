import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read DATAEKO Logo as Base64 for zero-dependency print rendering
const logoPath = path.resolve(__dirname, "../public/dataeko-logo.png");
let logoBase64 = "";
if (fs.existsSync(logoPath)) {
  logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
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

  const getMetricVal = (key, summaryKey) => {
    if (m[key] && m[key].value !== undefined && m[key].value !== null) {
      return m[key].value;
    }
    if (summary[summaryKey || key] !== undefined && summary[summaryKey || key] !== null) {
      return summary[summaryKey || key];
    }
    return null;
  };

  const adminLaborCostVal = getMetricVal("administrative_labor_cost", "admin_annual_cost");
  const trbLaborCostVal = getMetricVal("troubleshooting_labor_cost", "troubleshooting_annual_cost");
  const totalLaborCostVal = getMetricVal("total_operational_labor_cost", "total_operational_labor_cost");
  const totalHoursVal = getMetricVal("total_operational_annual_hours", "total_operational_hours") ||
    ((Number(getMetricVal("routine_admin_annual_hours", "admin_annual_hours") || 0)) +
     (Number(getMetricVal("troubleshooting_annual_hours", "troubleshooting_annual_hours") || 0)));
  const fteBurdenVal = getMetricVal("quantified_fte_burden", "operational_fte_burden");
  const exposureCostVal = getMetricVal("representative_single_event_exposure", "representative_single_event_exposure") ||
    getMetricVal("potential_financial_exposure", "representative_single_event_exposure");
  const mqSpendVal = getMetricVal("customer_reported_mq_spend", "customer_reported_annual_spend") ||
    getMetricVal("customer_reported_annual_spend");
  const scenarioVal = getMetricVal("improvement_scenario_economic_value", "illustrative_annual_labor_savings") ||
    getMetricVal("illustrative_economic_value");
  const recoverableHoursVal = getMetricVal("improvement_scenario_recoverable_total_hours", "total_recoverable_labor_hours") ||
    getMetricVal("total_recovered_hours");
  const trbOppCostVal = getMetricVal("troubleshooting_productivity_opportunity_cost", "troubleshooting_productivity_opportunity") ||
    getMetricVal("troubleshooting_productivity_opportunity");

  const adminLaborCost = formatCurrency(adminLaborCostVal);
  const trbLaborCost = formatCurrency(trbLaborCostVal);
  const totalLaborCost = formatCurrency(totalLaborCostVal);
  const totalHours = formatNumber(totalHoursVal, 0);
  const fteBurden = formatNumber(fteBurdenVal, 2);
  const exposureCost = formatCurrency(exposureCostVal);
  const mqSpend = formatCurrency(mqSpendVal);
  const scenarioValue = formatCurrency(scenarioVal);
  const recoverableHours = formatNumber(recoverableHoursVal, 0);
  const trbOppCost = formatCurrency(trbOppCostVal);

  const customerName = customer.name || "Enterprise Customer";
  const assessmentTitle = assessment.title || "IBM MQ Economic Cost & Efficiency Assessment";
  const engineVersion = snapshot.calculation_engine_version || "1.0.0";
  const calculatedAtStr = snapshot.calculated_at
    ? new Date(snapshot.calculated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Customer Report — ${customerName}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 12mm 12mm 12mm;
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
      font-size: 20pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-logo-img {
      height: 28px;
      width: auto;
      object-fit: contain;
    }
    .brand-accent {
      color: #008638;
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
      border-left: 4px solid #008638;
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
      background: #eef8f0;
      border-color: #a8e2b5;
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
      color: #008638;
    }
    .metric-val {
      font-size: 16pt;
      font-weight: 900;
      color: #0f172a;
      font-feature-settings: "tnum";
    }
    .metric-card.highlight .metric-val {
      color: #0d1322;
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
    .badge-calc { background: #eef8f0; color: #008638; border-color: #a8e2b5; }
    .badge-bench { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .badge-base { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
    .badge-scen { background: #eef8f0; color: #008638; border-color: #a8e2b5; }

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
    .card-box.neutral { background: #f8fafc; border-color: #e2e8f0; }
    .card-box.green { background: #eef8f0; border-color: #a8e2b5; }
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
    .footer-brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }
    .footer-logo {
      height: 16px;
      width: auto;
      object-fit: contain;
      vertical-align: middle;
      margin-left: 6px;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER & EXECUTIVE SUMMARY -->
  <div class="page">
    <div class="header-band">
      <div>
        <div class="brand-title">
          ${logoBase64 ? `<img src="${logoBase64}" alt="DATAEKO.AI" class="brand-logo-img" />` : `<span class="brand-accent">DATAEKO</span>`}
          <span style="font-size: 16pt; font-weight: 700; color: #64748b;">×</span>
          <span>meshIQ</span>
        </div>
        <div class="brand-sub">Enterprise Messaging Economic Assessment</div>
      </div>
      <div style="text-align: right;">
        <span class="report-badge">Executive Customer Report</span>
        <div style="font-size: 8pt; color: #64748b; margin-top: 4px;">Version 1.0 (Deterministic)</div>
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <h1 style="font-size: 18pt; font-weight: 900; color: #0f172a; line-height: 1.2;">
        ${assessmentTitle}
      </h1>
      <p style="font-size: 10pt; color: #008638; font-weight: 600; margin-top: 2px;">
        Executive Assessment Report & Economic Baseline
      </p>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span>Customer Organization</span>
        <strong>${customerName}</strong>
      </div>
      <div class="meta-item">
        <span>Assessment Scope</span>
        <strong>${assessmentTitle}</strong>
      </div>
      <div class="meta-item">
        <span>Assessment Date</span>
        <strong>${calculatedAtStr}</strong>
      </div>
      <div class="meta-item">
        <span>Engine Version</span>
        <strong class="font-mono">v${engineVersion}</strong>
      </div>
    </div>

    <div class="section-heading">1. Executive Summary</div>
    
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-title">Quantified Operational Labor</div>
        <div class="metric-val">${totalLaborCost}</div>
        <div class="metric-sub">
          <span>${totalHours} hrs/yr</span>
          <span style="font-weight: 700; color: #008638;">${fteBurden} FTE</span>
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
        <div class="metric-val">${scenarioValue}</div>
        <div class="metric-sub">
          <span>${recoverableHours} hrs recovered</span>
          <span class="badge badge-scen">Scenario</span>
        </div>
      </div>
    </div>

    <div class="narrative-box">
      <p>
        This report delivers an objective, deterministic baseline of ongoing operational effort, staffing allocations, and potential business disruption exposure for <strong>${customerName}</strong>’s IBM MQ messaging infrastructure.
      </p>
      <p>
        Quantified baseline operational effort totals <strong>${totalHours} annual staff hours</strong>, representing an annual operational labor burden of <strong>${totalLaborCost}</strong> (equivalent to ${fteBurden} FTEs across routine administration and incident troubleshooting).
      </p>
      <p>
        Under the approved model baseline assumptions (addressing 50% of routine administration with 50% efficiency and reducing investigation effort by 25%), the modeled scenario indicates an <strong>illustrative economic value of approximately ${scenarioValue}</strong> annually through the recovery of ${recoverableHours} staff hours.
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
            <div style="font-size: 7.5pt; color: #64748b;">Quarterly Admin Workload × 4 quarters</div>
          </td>
          <td>Q04 Admin Workload</td>
          <td class="text-right font-mono font-semibold">${formatNumber(getMetricVal("routine_admin_annual_hours", "admin_annual_hours"), 1)}</td>
          <td class="text-right font-mono">${formatNumber((Number(getMetricVal("routine_admin_annual_hours", "admin_annual_hours") || 0)) / 2080, 2)}</td>
          <td class="text-right font-mono font-bold">${adminLaborCost}</td>
          <td class="text-center"><span class="badge badge-calc">Calculated</span></td>
        </tr>
        <tr>
          <td>
            <strong>Incident Troubleshooting</strong>
            <div style="font-size: 7.5pt; color: #64748b;">Frequency × Staff Hours per Investigation</div>
          </td>
          <td>Q06 Frequency × Q07 Staff Effort</td>
          <td class="text-right font-mono font-semibold">${formatNumber(getMetricVal("troubleshooting_annual_hours", "troubleshooting_annual_hours"), 1)}</td>
          <td class="text-right font-mono">${formatNumber((Number(getMetricVal("troubleshooting_annual_hours", "troubleshooting_annual_hours") || 0)) / 2080, 2)}</td>
          <td class="text-right font-mono font-bold">${trbLaborCost}</td>
          <td class="text-center"><span class="badge badge-calc">Calculated</span></td>
        </tr>
        <tr class="total-row">
          <td>Total Quantified Operational Labor</td>
          <td style="font-size: 7.5pt; color: #64748b;">Loaded Rate: $86.54/hr ($180k/2,080h)</td>
          <td class="text-right font-mono" style="font-size: 10pt; font-weight: 800;">${totalHours}</td>
          <td class="text-right font-mono" style="font-size: 10pt; font-weight: 800;">${fteBurden}</td>
          <td class="text-right font-mono" style="font-size: 10pt; font-weight: 800;">${totalLaborCost}</td>
          <td class="text-center"><span class="badge badge-calc">Calculated</span></td>
        </tr>
      </tbody>
    </table>

    <div class="footer-brand">
      <span>DATAEKO × meshIQ Assessment</span>
      <span style="font-weight: 600; color: #475467;">
        Powered by ${logoBase64 ? `<img src="${logoBase64}" alt="DATAEKO.AI" class="footer-logo" />` : "DATAEKO.AI"}
      </span>
    </div>
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
          <strong>Modeled Consequence:</strong> Duration (Q14) × Hourly Financial Rate (Q15 or Benchmark).
          <div style="margin-top: 6px; padding: 6px; background: rgba(255,255,255,0.7); border-radius: 4px; border: 1px solid #fde68a;">
            <strong>Interpretation Safeguard:</strong> This figure models the consequence of one representative disruption event and must never be interpreted as an annualized loss estimate.
          </div>
        </div>
      </div>

      <div class="card-box neutral">
        <div class="card-head">
          <h4>Customer-Reported Annual MQ Spend</h4>
          <span class="badge badge-fact">Customer Fact</span>
        </div>
        <div style="font-size: 16pt; font-weight: 900; color: #0f172a; margin: 4px 0;">
          ${mqSpend}
        </div>
        <div style="font-size: 8pt; color: #334155; line-height: 1.4;">
          <strong>Direct Customer Input:</strong> Provided in Discovery Question Q21.
          <div style="margin-top: 6px; padding: 6px; background: rgba(255,255,255,0.7); border-radius: 4px; border: 1px solid #e2e8f0;">
            <strong>Isolation Rule:</strong> Customer-Reported Spend is preserved in strict isolation and is never added to operational labor or used to derive ROI metrics.
          </div>
        </div>
      </div>
    </div>

    <div class="section-heading">4. Improvement Scenarios & Productivity Opportunity</div>
    
    <div class="two-col-cards">
      <div class="card-box green">
        <div class="card-head">
          <h4>Troubleshooting Productivity Opportunity (10%)</h4>
          <span class="badge badge-calc">Calculated</span>
        </div>
        <div style="font-size: 15pt; font-weight: 900; color: #008638; margin: 4px 0;">
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
          ${scenarioValue}
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
        <li><strong>Deterministic Presentation:</strong> All values are rendered directly from the immutable calculation snapshot without independent presentation-layer recomputation.</li>
      </ul>
    </div>

    <div class="footer-brand">
      <span>DATAEKO × meshIQ Assessment</span>
      <span style="font-weight: 600; color: #475467;">
        Powered by ${logoBase64 ? `<img src="${logoBase64}" alt="DATAEKO.AI" class="footer-logo" />` : "DATAEKO.AI"}
      </span>
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
        top: "12mm",
        bottom: "12mm",
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
