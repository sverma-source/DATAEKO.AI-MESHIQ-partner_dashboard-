# Open Questions & Clarification Backlog

> **Document Status**: `FOUNDATION PHASE 0B`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`

---

## 1. Overview

`[CONFIRMED]` This document catalogs all critical open questions, missing business rules, and technical uncertainties requiring explicit stakeholder clarification before feature implementation commences.

---

## 2. Business & Calculation Open Questions

| ID | Domain | Open Question | Stakeholder | Impact on Implementation |
| :--- | :--- | :--- | :--- | :--- |
| `OQ-01` | **Workbook Formulas** | What are the exact mathematical formulas, weightings, and baseline equations utilized in the legacy IBM MQ Excel workbook? | Business Analyst / meshIQ SME | **Blocking**: Required to implement the Calculation Engine. |
| `OQ-02` | **Industry Benchmarks** | What default benchmark values (e.g., blended MQ Admin hourly rate, average MTTR, incident frequency per 100 queues) should be pre-loaded into the system, and what is their provenance? | meshIQ Specialist / Product Owner | High: Needed for default assumption tables. |
| `OQ-03` | **Scenario Levers** | What are the exact efficiency lever dimensions modeled in the business case (e.g., MTTR reduction %, configuration automation %, alert noise reduction %)? | meshIQ Specialist | High: Defines scenario modeling UI and calculation engine. |
| `OQ-04` | **Multi-Currency** | Is multi-currency support required in Phase 1 (e.g., live/static FX conversion across USD, EUR, GBP, AUD, JPY), or will all calculations operate in a single selected engagement currency? | Product Owner | Medium: Affects data model and presentation formatting. |
| `OQ-05` | **Co-Branding** | Should reports support custom co-branding (e.g., Customer Logo + Dataeko Logo + meshIQ Logo) dynamically uploaded per assessment? | Marketing / Sales Ops | Medium: Affects report generation pipeline. |

---

## 3. Architecture & User Access Open Questions

| ID | Domain | Open Question | Stakeholder | Impact on Implementation |
| :--- | :--- | :--- | :--- | :--- |
| `OQ-06` | **Customer Direct Access** | Will enterprise customer stakeholders log in directly to complete questionnaires self-service in Phase 1, or is the application strictly consultant-operated during guided sessions? | Product Owner | High: Determines external authentication and self-service UX scope. |
| `OQ-07` | **Authentication Provider** | What is the preferred authentication strategy: Built-in email/password with MFA, Google Workspace / Microsoft Entra SSO, or external IdP (Okta / Auth0)? | Security / Enterprise Architect | High: Dictates auth module architecture. |
| `OQ-08` | **Report Export Formats** | In addition to interactive Web Reports and PDF exports, is editable PowerPoint (`.pptx`) export required? | Sales / Consulting Team | Medium: Dictates export library dependencies. |
| `OQ-09` | **Historical Data Migration** | Are there legacy completed Excel assessments that must be imported into the new platform, or is the system strictly for greenfield assessments? | Dataeko Operations | Low to Medium: Dictates whether an Excel import parser is needed. |
| `OQ-10` | **Approval Lifecycle** | Is a formal multi-stage approval workflow required (e.g., Consultant Draft → meshIQ SME Sign-off → Delivered) before a report is locked? | Consulting Practice Lead | Medium: Affects assessment state machine transitions. |

---

## 4. Resolution Protocol

When answers to these questions are provided in subsequent specifications:
1. The resolution will be documented in [`DECISIONS.md`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/DECISIONS.md) as an Architecture Decision Record (ADR).
2. The corresponding domain documents (`CALCULATION_RULES.md`, `DATA_MODEL.md`, etc.) will be updated, transitioning tags from `[OPEN QUESTION]` to `[CONFIRMED]`.
