# Requirement Traceability Matrix (RTM)

> **Document Status**: `VALIDATION PHASE 0C`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`, `[CONFLICT]`, `[MISSING INFORMATION]`

---

## 1. Traceability Overview

This matrix establishes end-to-end traceability across business objectives, source architecture documents, functional modules, and verification coverage.

---

## 2. Requirement Traceability Matrix

| ID | Requirement Statement | Source Document | Type | Related Module | Test Coverage Strategy | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | Digitize & improve IBM MQ Economic Assessment process from legacy spreadsheets into an enterprise web app | `PROJECT_OVERVIEW.md` | `[CONFIRMED]` | Core Application / Platform | E2E Engagement Flow | Covered |
| **REQ-002** | Strict architectural decoupling between Calculation Engine, UI, and storage layers | `PROJECT_OVERVIEW.md`, `CALCULATION_RULES.md`, `DECISIONS.md` (ADR-001) | `[CONFIRMED]` | Calculation Engine / Core | Unit Test (Headless) | Covered |
| **REQ-003** | Enforce 6-tier data classification (Customer Facts, Assumptions, Benchmarks, Calculations, Scenarios, Demo) | `BUSINESS_RULES.md`, `DECISIONS.md` (ADR-002) | `[CONFIRMED]` | Data Layer / Calculation Engine | Unit & Integration Schema Tests | Covered |
| **REQ-004** | Prohibit silent replacement or overwriting of customer-provided inputs with model assumptions | `BUSINESS_RULES.md`, `DECISIONS.md` (ADR-002) | `[CONFIRMED]` | Assessment Intake / Data Layer | Unit Test (Input Immutability) | Covered |
| **REQ-005** | Support explicit `UNKNOWN`, `NOT_PROVIDED`, and `N/A` answer states without defaulting to zero | `ASSESSMENT_QUESTIONS.md`, `BUSINESS_RULES.md` | `[CONFIRMED]` | Assessment Wizard / Normalization | Unit & UI Wizard Tests | Covered |
| **REQ-006** | Handle missing/incomplete inputs with controlled application states (`INSUFFICIENT_DATA`), forbidding spreadsheet errors (`#VALUE!`) | `CALCULATION_RULES.md`, `DECISIONS.md` (ADR-003) | `[CONFIRMED]` | Calculation Engine | Unit Edge Case Tests | Covered |
| **REQ-007** | Deterministic calculation engine ensuring identical inputs produce bit-for-bit identical metric snapshots | `PROJECT_OVERVIEW.md`, `CALCULATION_RULES.md` | `[CONFIRMED]` | Calculation Engine | Golden Master Regression Suite | Covered |
| **REQ-008** | Multi-tenant customer and organization data boundary isolation | `SECURITY_REQUIREMENTS.md` | `[CONFIRMED]` | Auth / Data Layer / Multi-tenancy | Security Penetration Tests | Covered |
| **REQ-009** | Object-level authorization preventing Insecure Direct Object Reference (IDOR) attacks | `SECURITY_REQUIREMENTS.md` | `[CONFIRMED]` | API Gateway / Middleware | Security IDOR Test Suite | Covered |
| **REQ-010** | Immutable Calculation Snapshots linked to specific assessment and rule version instances | `DATA_MODEL.md`, `DECISIONS.md` (ADR-004) | `[CONFIRMED]` | Calculation Engine / Persistence | Integration Snapshot Tests | Covered |
| **REQ-011** | Comprehensive append-only audit logging capturing actor, timestamp, previous value, new value, and IP | `SECURITY_REQUIREMENTS.md`, `DATA_MODEL.md` | `[CONFIRMED]` | Audit Subsystem | Integration Audit Log Tests | Covered |
| **REQ-012** | Semantic versioning of question sets, calculation rules, assumptions, and benchmark catalogs | `CALCULATION_RULES.md`, `ASSESSMENT_QUESTIONS.md` | `[CONFIRMED]` | Calculation Engine / Schema | Regression Versioning Tests | Covered |
| **REQ-013** | Customer-facing executive reports must visually and textually separate facts, assumptions, benchmarks, and projections | `REPORT_REQUIREMENTS.md` | `[CONFIRMED]` | Reporting Engine | UI & Document Snapshot Tests | Covered |
| **REQ-014** | Display standardized legal and commercial disclaimers on illustrative scenario projections | `REPORT_REQUIREMENTS.md`, `BUSINESS_RULES.md` | `[CONFIRMED]` | Reporting Engine / UI | UI Compliance Checks | Covered |
| **REQ-015** | Interactive calculation provenance modal/drawer exposing formula, inputs, tiers, and rule versions | `UI_UX_REQUIREMENTS.md` | `[CONFIRMED]` | Results Dashboard / UI | UI Component Tests | Covered |
| **REQ-016** | Zero secrets in Git repository; secrets managed via environment variables and cloud key management | `SECURITY_REQUIREMENTS.md` | `[CONFIRMED]` | DevOps / CI-CD | Pre-commit & CI Secret Scanners | Covered |
| **REQ-017** | Encryption in transit (TLS 1.3/HTTPS) and at rest (AES-256) for databases and report artifacts | `SECURITY_REQUIREMENTS.md` | `[CONFIRMED]` | Infrastructure / Storage | Security & Transport Audits | Covered |
| **REQ-018** | End-to-end 8-stage assessment lifecycle state machine (Draft to Archived/Locked) | `BUSINESS_PROCESS.md` | `[CONFIRMED]` | Assessment Management | State Machine Integration Tests | Covered |
| **REQ-019** | Exact mathematical formulas for IBM MQ Economic TCO and Efficiency calculations | `CALCULATION_RULES.md`, `OPEN_QUESTIONS.md` | `[OPEN QUESTION]` | Calculation Engine | Pending Business Spec | Pending Spec |
| **REQ-020** | Pre-loaded industry benchmark values and data sources (hourly rates, MTTR, incident rates) | `OPEN_QUESTIONS.md`, `BUSINESS_RULES.md` | `[OPEN QUESTION]` | Calculation Engine / Benchmarks | Pending Business Spec | Pending Spec |
| **REQ-021** | Standard assessment questionnaire schema, specific question wording, and section sequence | `ASSESSMENT_QUESTIONS.md`, `OPEN_QUESTIONS.md` | `[OPEN QUESTION]` | Assessment Intake Wizard | Pending Business Spec | Pending Spec |
| **REQ-022** | Proposed role profiles (Admin, Dataeko Consultant, meshIQ Specialist, Customer User) and RBAC matrix | `USER_ROLES.md` | `[RECOMMENDATION]` | User Management / RBAC | RBAC Integration Tests | Proposed |
| **REQ-023** | Customer self-service direct access in Phase 1 vs consultant-led assessment delivery only | `USER_ROLES.md`, `OPEN_QUESTIONS.md` | `[OPEN QUESTION]` | Auth / Assessment Wizard | Acceptance Criteria Test | Pending Spec |
| **REQ-024** | Multi-currency selection and live/static FX conversion across USD, EUR, GBP, AUD, JPY | `OPEN_QUESTIONS.md`, `DATA_MODEL.md` | `[OPEN QUESTION]` | Calculation Engine / UI | Multi-Currency Unit Tests | Pending Spec |
| **REQ-025** | High-resolution PDF export for executive presentations | `REPORT_REQUIREMENTS.md` | `[RECOMMENDATION]` | Reporting Engine | PDF Generation & Visual Diffs | Proposed |
| **REQ-026** | Editable PowerPoint (`.pptx`) export for consulting deck assembly | `OPEN_QUESTIONS.md`, `REPORT_REQUIREMENTS.md` | `[OPEN QUESTION]` | Reporting Engine | Export Format Tests | Pending Spec |
| **REQ-027** | Custom co-branding upload (Customer Logo + Dataeko Logo + meshIQ Logo) on report artifacts | `OPEN_QUESTIONS.md`, `REPORT_REQUIREMENTS.md` | `[OPEN QUESTION]` | Reporting Engine / UI | Asset Rendering Tests | Pending Spec |
| **REQ-028** | Enterprise Single Sign-On (SAML 2.0 / OIDC / Azure AD / Okta / Google Workspace) | `SECURITY_REQUIREMENTS.md`, `OPEN_QUESTIONS.md` | `[RECOMMENDATION]` | Auth Module | SSO Integration Tests | Proposed |
| **REQ-029** | Legacy Excel completed assessment data import parser | `OPEN_QUESTIONS.md` | `[OPEN QUESTION]` | Data Ingestion | Data Migration Tests | Pending Spec |
| **REQ-030** | Formal multi-stage approval workflow (Consultant Draft → meshIQ SME Sign-off → Delivered) | `OPEN_QUESTIONS.md`, `BUSINESS_PROCESS.md` | `[OPEN QUESTION]` | Assessment Management | Workflow Engine Tests | Pending Spec |
