# Source Inconsistencies & Ambiguity Log

> **Document Status**: `VALIDATION PHASE 0C`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`, `[CONFLICT]`, `[MISSING INFORMATION]`

---

## 1. Overview

This document records ambiguities, terminology variances, and potential conflicting requirements identified across the documentation suite during the Phase 0C validation audit.

> **CRITICAL DIRECTIVE**: These items are logged for formal stakeholder clarification. **No interpretation has been silently selected or implemented in code.**

---

## 2. Inconsistency & Ambiguity Register

### Issue INC-01: Multi-Tenancy Hierarchy & Partner Organization Boundaries
* **Where Found**: [`USER_ROLES.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/USER_ROLES.md#L45-L48) vs [`DATA_MODEL.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/DATA_MODEL.md#L35-L40) vs [`SECURITY_REQUIREMENTS.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/SECURITY_REQUIREMENTS.md#L30-L34)
* **Why It Matters**: Dictates the database schema multi-tenancy architecture, row-level security (RLS) policies, and authorization boundaries.
* **The Ambiguity**: Is the platform a *single-tenant application* shared by Dataeko and meshIQ to evaluate client companies, or a *multi-tenant SaaS platform* where meshIQ, Dataeko, and other third-party partner agencies maintain isolated partner accounts, managing distinct client portfolios?
* **Potential Interpretations**:
  1. *Interpretation A*: Single shared platform tenant (Dataeko × meshIQ) with Customer accounts.
  2. *Interpretation B*: True multi-tenant partner portal where multiple consulting agencies each have their own isolated workspace of customers.
* **Required Clarification**: Business Architect / Product Owner must clarify whether partner-level tenancy isolation is required in Phase 1.

---

### Issue INC-02: Customer Direct Portal Access vs Consultant-Only Entry
* **Where Found**: [`USER_ROLES.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/USER_ROLES.md#L35-L42) (`ROLE_CUSTOMER_USER`) vs [`BUSINESS_PROCESS.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/BUSINESS_PROCESS.md#L15-L20)
* **Why It Matters**: Dictates customer user registration, email invitations, self-service wizard ergonomics, password reset flows, and external public attack surface.
* **The Ambiguity**: `USER_ROLES.md` defines `ROLE_CUSTOMER_USER` with direct login and questionnaire self-service permissions, while `BUSINESS_PROCESS.md` describes the assessment process as a consultant-guided interview engagement.
* **Potential Interpretations**:
  1. *Interpretation A (Consultant-Only)*: Only Dataeko and meshIQ staff log into the system; customer stakeholders receive exported PDFs or view presentations during live screen shares.
  2. *Interpretation B (Hybrid / Direct Access)*: Customer stakeholders receive login credentials to fill out specific technical questionnaire sections before the consulting workshop.
* **Required Clarification**: Product Owner to confirm if Customer User authentication is in scope for Phase 1 release.

---

### Issue INC-03: Assessment Recalculation Trigger & Snapshot Invalidation
* **Where Found**: [`BUSINESS_PROCESS.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/BUSINESS_PROCESS.md#L80-L85) vs [`DATA_MODEL.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/DATA_MODEL.md#L55-L65)
* **Why It Matters**: Determines whether calculation snapshots are created dynamically on-demand, automatically on every auto-save, or manually via an explicit "Calculate / Publish" button.
* **The Ambiguity**: If a user updates an answer in a previously calculated assessment:
  * Does the existing calculation snapshot get flagged as `STALE`?
  * Does the system prevent viewing reports until recalculation is triggered?
  * Or does the calculation engine execute reactively on every field change in real time?
* **Potential Interpretations**:
  1. *Interpretation A (Manual Pipeline)*: Explicit "Run Calculations" action creates snapshot `vN`; modifying inputs marks active calculation as `OUT_OF_DATE`.
  2. *Interpretation B (Reactive Engine)*: Pure calculation runs automatically on every keystroke, generating temporary in-memory previews until an explicit "Finalize Snapshot" event occurs.
* **Required Clarification**: Engineering & Product design alignment on snapshot generation trigger.

---

### Issue INC-04: Report Customization & PowerPoint Export Scope
* **Where Found**: [`REPORT_REQUIREMENTS.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/REPORT_REQUIREMENTS.md#L65-L70) vs [`OPEN_QUESTIONS.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/OPEN_QUESTIONS.md#L30-L33) (`OQ-08`)
* **Why It Matters**: Generating editable PowerPoint presentations (`.pptx`) requires specialized server-side presentation generation libraries (e.g., `pptxgenjs`), whereas PDF generation uses HTML/CSS print engines (e.g., Puppeteer / Playwright).
* **The Ambiguity**: Is PDF export sufficient for Phase 1, or is editable PowerPoint export a mandatory requirement for sales presentations?
* **Potential Interpretations**:
  1. *Interpretation A*: Web Dashboard + Executive PDF export only.
  2. *Interpretation B*: Web Dashboard + PDF export + Editable `.pptx` slide generation.
* **Required Clarification**: Consulting Practice Lead to confirm mandatory export formats for MVP.
