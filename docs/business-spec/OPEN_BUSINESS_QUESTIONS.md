# Open Business Questions & Clarification Register

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`

---

## 1. Overview

This register catalogs the formal business, financial, domain, and workflow questions requiring explicit stakeholder resolution before the calculation engine and report builder are constructed in Phase 3.

---

## 2. Business & Calculation Open Questions

| Question ID | Domain | Open Question Description | Impact on Engine / Application | Stakeholder |
| :--- | :--- | :--- | :--- | :--- |
| **OBQ-01** | **Q07 Mapping** | How should the selection `"Varies significantly"` for Q07 (staff hours per investigation) be processed by the Calculation Engine? | Prevents lookup error `#N/A`. Dictates whether to prompt for a numeric override or evaluate to `INSUFFICIENT_DATA`. | meshIQ SME / Business Analyst |
| **OBQ-02** | **Q08 Context vs Math** | Is Q08 (Elapsed Investigation Clock Time / MTTD) strictly qualitative context for the report narrative, or should it multiply downtime exposure formulas in future rule sets? | Determines whether to add an MTTR clock-time calculation rule. | Product Owner |
| **OBQ-03** | **10% vs 25% Levers** | Are the 10% Troubleshooting Productivity Opportunity and 25% Investigation Effort Reduction intentionally separate metrics or legacy iterations? | Clarifies whether both metrics are displayed on the executive dashboard or consolidated. | meshIQ Specialist / Sales Lead |
| **OBQ-04** | **Partial Admin Inputs** | If Q04 (Quarterly Admin Hours) is marked `Unknown`, should the system allow the consultant to view the Troubleshooting/Outage sections with partial totals, or block total labor calculations? | Governs partial KPI dashboard state vs complete block. | Consulting Practice Lead |
| **OBQ-05** | **Cost Target Input Mode** | Should Q17 (OpEx reduction target) support both categorical range bands (`10–20%`) and precise customer percentage overrides (`15.5%`)? | Defines intake wizard input schema. | Product Designer |
| **OBQ-06** | **Working Session Trigger** | What exact threshold of assessment findings should trigger the automated recommendation for the **60-Minute meshIQ Working Session** on the final slide? | Defines the business rule for the CTA card (e.g., $C_{total} > \$50k$ or Outage Impact = Critical). | Sales Ops / meshIQ Lead |
| **OBQ-07** | **Report Narrative Generation** | Which textual paragraphs in the Customer Report should be dynamically assembled via template interpolation vs static product copy? | Dictates report compiler template architecture. | Marketing / Consulting Lead |
| **OBQ-08** | **Co-Branding Requirements** | Should the report generation engine support uploading custom customer logos to render alongside Dataeko and meshIQ brand assets on the PDF cover slide? | Dictates report asset storage and upload pipeline. | Product Owner |
| **OBQ-09** | **Benchmark Customization** | Should administrators have the ability to update the default ITIC ($300k/hr) and Loaded Labor ($180k/yr) benchmarks globally across tenant organizations? | Dictates admin settings UI and database benchmark catalog schema. | System Architect |
| **OBQ-10** | **Historical Versioning Policy**| When calculation rules or benchmark constants are updated in a future release (`v1.1.0`), should existing finalized assessments strictly retain their original calculation snapshot or support "Upgrade and Recalculate"? | Governs version migration and audit state machine. | Lead Architect |
