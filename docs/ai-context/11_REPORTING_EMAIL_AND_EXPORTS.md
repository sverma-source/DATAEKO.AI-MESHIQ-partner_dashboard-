# 11. Reporting, PDF Generation & Email Service Architecture

> **Status**: IMPLEMENTED  
> **Source Directory**: [`backend/app/services/`](file:///Users/roop/DATAEKO.AI-MESHIQ-partner_dashboard-/backend/app/services/), [`frontend/scripts/`](file:///Users/roop/DATAEKO.AI-MESHIQ-partner_dashboard-/frontend/scripts/)

---

## 1. Executive PDF Report Deliverable

The boardroom-ready 3-page executive PDF report is compiled via **Playwright Headless Chromium** (`frontend/scripts/render_report_pdf.mjs`).

### Architectural Invariants:
1. **Strict Presentation-Only**: The PDF generator reads authoritative values strictly from `CalculationSnapshot.computed_metrics` and `summary_metrics`. It **never** recalculates math, averages, or proportions.
2. **Fixed 3-Page Structure**:
   - **Page 1: Cover & Executive Summary**: meshIQ logo, dark navy hero banner, metadata strip, 4 primary KPI cards (Quantified Operational Labor, Single-Event Exposure, Customer-Reported MQ Spend, Illustrative Economic Value), executive economic synthesis, and provenance guidance.
   - **Page 2: Effort Decomposition & Business Exposure**: Neutral workload decomposition table (Routine Administration vs Incident Troubleshooting), Show the Math formula container ($C_{	ext{TOTAL}} = C_{	ext{ADMIN}} + C_{	ext{TRB}}$), and single-event exposure cards.
   - **Page 3: Scenarios, Governance & Architect CTA**: Troubleshooting productivity opportunity (10%), meshIQ improvement scenario, 5-tier provenance matrix, governance safeguards, and contact CTA.
3. **Zero Synthetic Numbers**: If discovery data is incomplete, the PDF renders authoritative `—` placeholders and explanatory notes; it never synthesizes midpoint values.

---

## 2. Dual-Email Delivery Architecture (`EmailService.py`)

Email delivery is powered by the **Google Gmail REST API** using OAuth 2.0 (`https://www.googleapis.com/auth/gmail.send`).

```mermaid
flowchart TD
    SubmitEvent["Assessment Submitted Event"] --> EmailSvc["EmailService.send_submission_notifications()"]
    
    EmailSvc --> BuildClient["Build Client Confirmation Email"]
    EmailSvc --> BuildAdvisor["Build Internal Advisor Notification"]

    subgraph ClientContract["Client Email Privacy Contract"]
        BuildClient --> ClientCheck["Verify Zero Attachments"]
        ClientCheck --> ClientCheck2["Verify Zero Economics / Snapshots"]
        ClientCheck2 --> ClientSend["Dispatch to Authenticated Client<br/>Subject: DATAEKO × meshIQ Assessment Submission Confirmation: {title}"]
    end

    subgraph AdvisorContract["Internal Advisor Contract"]
        BuildAdvisor --> GenPDF["Attach 3-Page Executive PDF"]
        GenPDF --> GenCSV["Attach Assessment CSV Dump"]
        GenCSV --> AdvisorSend["Dispatch to Advisory Recipients<br/>Subject: [Assessment Submission] {customer_name} - {title}"]
    end
```

### Strict Client Privacy Invariants:
- **Zero Attachments**: Client emails have `attachments = []`.
- **Zero Financial Data**: Contains no `CalculationSnapshot`, no dollar figures, no loaded labor rates, and no internal recipient addresses.
- **Data Scope**: Displays strictly the customer's submitted Q01–Q22 answers for record-keeping.

---

## 3. CSV Dataset Export Architecture

- Generated on-demand via `GET /api/v1/assessments/{id}/deliverables/csv`.
- Output columns include: Question Code, Title, Category Theme, Selected Response, Exact Override Value, Calculation Feeder Flag, Formula Impact Note, and Provenance Tier.

---
