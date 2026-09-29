# DATAEKO × meshIQ Partner Dashboard

> **Enterprise IBM MQ Economic Cost & Efficiency Assessment Platform**  
> Modernizing and standardizing enterprise messaging economic assessments with deterministic calculations, immutable provenance, executive-ready reporting, role-aware workspaces, and customer-scoped governance.

---

## 1. Overview

The **DATAEKO × meshIQ Partner Dashboard** is an enterprise-grade digital platform designed to digitize, modernize, and automate the **IBM MQ Economic Cost & Efficiency Assessment** workflow.

By replacing complex, error-prone spreadsheets with a secure, auditable, and deterministic web application, the platform enables Dataeko consultants and meshIQ specialists to evaluate enterprise messaging environments, quantify operational friction, model controlled improvement scenarios, and deliver audit-grade executive business cases for C-level leadership.

### High-Level End-to-End Workflow

```text
Corporate Login (Role-Aware)
    │
    ▼
Customer / Session Context Selection
    │
    ▼
Assessment Intake (Q01–Q22 across 7 Thematic Sections)
    │
    ├── Auto-Save / Save & Resume (Draft / In-Progress State)
    │
    ▼
Pre-Flight Review Summary & Pre-Submission Validation
    │
    ▼
Final Submission Orchestration (State Transition → SUBMITTED)
    │
    ▼
Deterministic Backend Calculation Execution (Pure Python Decimal Engine)
    │
    ▼
Persisted Immutable CalculationSnapshot
    │
    ├── Executive Dashboard (KPI Summaries, Effort Allocation, Impact Gauges)
    ├── Scenario Sandbox (Controlled Efficiency & Incident Reduction Modeling)
    ├── Consultant Economic Assessment Summary (12-Section Discovery & ROI Breakdown)
    └── Executive PDF / CSV Deliverables (Boardroom-Ready Artifacts)
```

### Key Platform Capabilities
- **Structured Customer Assessment**: 22 standardized intake questions (Q01–Q22) organized into 7 canonical thematic sections.
- **Deterministic Economic Calculation Engine**: Pure Python calculation engine utilizing `Decimal` arithmetic with 10/10 validated Golden Master reference scenarios.
- **Role-Aware Application Workspaces**: Dedicated, context-isolated navigation and views for Platform Administrators, Partner Administrators, Consultants, Customer Administrators, and Clients.
- **Individual Client Assessment Ownership**: Strict author ownership ensuring Client users only access assessments they created.
- **Customer-Scoped Governance**: Hierarchical customer and tenant administration with strict boundaries preventing cross-customer data leakage.
- **Secure Invitation & Credential Lifecycle**: Cryptographically secure token-based user invitations and password resets with SHA-256 hashing, expiration, and replay defense.
- **Authoritative Economic Reporting**: 12-section economic summary and Executive Dashboard backed exclusively by immutable backend calculation snapshots.
- **Executive Reporting & PDF Generation**: Deterministic report view and automated headless Chromium PDF generation for executive presentations.

---

## 2. Current Project Status & Checkpoint

The platform is under active development on the **`dev`** branch. The latest Enterprise UI and top-navigation refinements have been completed, followed by a comprehensive read-only End-to-End Product Validation pass.

### Current Checkpoint Summary

| Attribute | Current Value |
| :--- | :--- |
| **Current Git Checkpoint** | `f0e1e96` (`fix: preserve dataeko header attribution visibility`) |
| **Development Branch** | `dev` |
| **Implementation Stage** | **Enterprise UI Refinement & Read-Only E2E Product Validation** |
| **Next Planned Work** | **Controlled Remediation Batch: P0 Authentication Boundary & P1 Save/Resume Persistence** |
| **Next Work Status** | **PLANNED — NOT STARTED** (Remediation intentionally paused; deferred to next controlled batch) |
| **Deployment Status** | **Deferred** (Local development only; no production deployment performed) |
| **Email Status** | **Headless / Isolated** (`EMAIL_ENABLED=False`; real email delivery deferred) |

---

### ENTERPRISE TOP NAVIGATION & HEADER SCALE REFINEMENT

**Status:** COMPLETE / VERIFIED  
**Implementation Commits:**
- `5aa9fc5`: `feat: refine enterprise header scale`
- `f0e1e96`: `fix: preserve dataeko header attribution visibility`

#### Implemented Features & Refinements:
- **Enterprise Header Scale**: Expanded header height to an authoritative, spacious enterprise scale (~77px desktop / ~73px mobile) across all authenticated persona views (Client, Consultant, Platform Admin).
- **Brand Identity & Typography**: Refined meshIQ wordmark and brand mark scaling to balance confident presentation with crisp alignment.
- **Role/Workspace Context**: Context badge refined to `text-xs font-semibold uppercase tracking-wider` with a subtle divider dot separating brand mark from role context.
- **Top-Right DATAEKO Attribution**: Restored full visibility of the official DATAEKO wordmark asset (`dataeko-logo.png`) in the top navigation bar, protected from clipping or truncation across all viewports.
- **Responsive Navigation Verification**: Tested across 1440px, 1280px, 1024px, 768px, and 390px viewports with zero horizontal page overflow.
- **Asset Integrity**: Official meshIQ and DATAEKO logo assets remain unmodified and displayed at high fidelity.

---

### COMPREHENSIVE READ-ONLY E2E PRODUCT VALIDATION

**Status:** VALIDATION COMPLETE / DEFECT DISCOVERY CHECKPOINT  
**Validation Pass:** Phases 0 through 9 (Client, Consultant, Executive, Platform Admin, Isolation, State Transitions, Provenance, Responsive, Security)  
**Safety Principle:** Strict read-only pass. **Zero** application code, database schema, configuration, or test files were modified during this pass. No commits were created, no pushes made, and no deployments performed.

#### Verified Passing Functional & Operational Areas:
- **Consultant Workflow**: Portfolio table, search filtering, status filtering (`ALL`, `SUBMITTED`, `DRAFT`), 12-section discovery & ROI economic summary view, and discovery response inspection all operating correctly.
- **Executive Dashboard & Output**: Headline KPI tiering (`F_TOTAL`, `F_ADMIN`, `F_TROUBLESHOOTING`, `F_OUTAGE`, `F_FTE`), dynamic provenance badges, and clean executive vs. consultant audit view toggles verified.
- **Scenario Sandbox**: Interactive sliders initialize to model assumptions (50%, 50%, 25%, 10%); moving sliders dynamically recalculates benefits without mutating persistent assessment state; clicking "Reset" restores baseline identically.
- **Executive Report View**: Report preview renders customer identity, assessment title, headline metrics, and branding attribution accurately without modifying underlying assessment data.
- **Platform Admin Governance**: Governance views for Users (92 seeded accounts), Customers, Assessments, and Audit Log (50 events) operational with role-scoped filtering and modal inspection.
- **Finalization & Immutability**: Submitted assessments transition to `SUBMITTED` state, inputs become read-only, and backend API strictly rejects subsequent mutation attempts with HTTP 409 Conflict.
- **Calculation & Provenance Consistency**: Mathematical engine adheres to pure Python `Decimal` precision; formula provenance and industry benchmarks (`ITIC $300k/hr`) are immutably captured in `CalculationSnapshot`.
- **Responsive Smoke**: 1440, 1280, 1024, 768, and 390px viewports verified across Login, Client, Consultant, and Admin workspaces with 0 horizontal page overflow and visible DATAEKO attribution.
- **Authentication & Session Smoke**: Invalid and tampered JWT tokens strictly rejected (HTTP 401); login brute force rate limiting active and verified (HTTP 429 at 5 attempts/minute); `POST /auth/logout` clears session cookies.
- **Automated Test Baseline**:
  - Backend Suite: **139/139 PASSED** (`pytest`)
  - Calculation Golden Masters: **10/10 PASSED** (`TC-01`–`TC-10`)
  - Frontend Test Suite: **111/111 PASSED** (`vitest`)
  - TypeScript Static Check: **0 ERRORS** (`tsc --noEmit`)
  - Production Bundle: **CLEAN BUILD** (`next build`)

#### Blocking Findings (Remediation NOT YET Started):

> [!CAUTION]
> The following findings are defect-discovery items identified during the read-only validation pass. Remediation has **not** started and will be addressed in a controlled implementation batch.

1. **P0 — Critical: Unauthenticated Assessment API Access**
   - **Route / Endpoints**: `GET /api/v1/assessments` and `GET /api/v1/assessments/{assessment_id}`
   - **Observation**: Anonymous callers without authentication credentials or session cookies can list all tenant assessments and fetch full assessment details, customer metadata, and the complete calculation snapshot (`latest_snapshot`), including proprietary financial formulas.
   - **Root Cause**: Endpoints use `Depends(get_current_user_optional)` with fallback to `DEFAULT_TENANT_ID`, while ownership checks only evaluate `CUSTOMER_USER` roles.
   - **Planned Next Action**: Secure assessment listing and detail endpoints using mandatory authentication dependencies (`get_current_user`) and strict tenant boundaries.

2. **P1 — High: Client Save/Resume Persistence Mismatch**
   - **Route / Component**: `/` (Assessment Wizard — `page.tsx` / `api.ts`)
   - **Observation**: When a client user answers discovery questions (e.g., Q01 Scale, Q04 Weekly Admin Hours) and saves draft progress, refreshing or reopening the assessment resets questions to empty/unselected values (`""`).
   - **Root Cause**: Key mapping discrepancy between wizard state, `raw_responses`, and backend schema fields (`state.q01_scale` vs `q03_environment_scale`) causes deserialization failure upon reload.
   - **Planned Next Action**: Trace and align client response payload mapping between frontend state and backend schemas without modifying calculation semantics.

#### Deferred Findings (Excluded From Next Batch):

1. **P2 — Medium: Client Customer Selection UX**
   - **Observation**: Client users see all tenant customer organizations in the initial customer selection modal. Although backend authorization correctly rejects unauthorized creation with HTTP 403 Forbidden, the UI should auto-bind or restrict the list to the client's assigned organization.
   - **Status**: Deferred to subsequent UX refinement pass.

2. **P3 — Low: Section Navigation Discoverability**
   - **Observation**: Assessment wizard sections E, F, and G overflow horizontally on viewports <= 1280px without an explicit scrollbar or visual affordance arrows.
   - **Status**: Deferred to subsequent UX refinement pass.

#### Next Development Step:
The next implementation batch is strictly limited to:
1. **P0 Authentication Boundary Correction**: Enforce strict authentication on `GET /api/v1/assessments` and `GET /api/v1/assessments/{id}`.
2. **P1 Save/Resume Persistence Correction**: Align frontend/backend response field mapping so draft answers persist and reload reliably.

*The P2 and P3 UI findings are explicitly excluded from the upcoming remediation batch.*

#### Safety & Deployment Status:
- **Production Deployment**: **NOT PERFORMED**.
- **Production Services**: **NOT ACCESSED** during validation (all testing conducted against local development services on `localhost:3001` and `localhost:8000`).
- **Readiness**: The platform remains in local development state on branch `dev`. Production readiness is explicitly withheld pending P0 and P1 remediation.

---

### BATCH 5A — EXECUTIVE DASHBOARD & RESULTS EXPERIENCE

**Status:** COMPLETE / READY FOR REMOTE CHECKPOINT  
**Implementation Commit:** `12593a77d828ff84cc72da9be80859fc8ccc051a`  
**Scope:** Executive Dashboard and Results Experience presentation refinement.

#### Implemented Features & Refinements:
- **Executive KPI Hierarchy Refinement**: Restructured dashboard Overview tab into three logical tiers:
  - **Tier A (Primary Economic Headline)**: Total Annual Waste card (`F_TOTAL`) and Cumulative 5-Year Impact prominently elevated with metric provenance badges.
  - **Tier B (Secondary Economic Indicators)**: 3-column metric cards detailing Annual Operational Waste (`F_ADMIN` + `F_TROUBLESHOOTING`), Annual Downtime Waste (`F_OUTAGE`), and Operational Capacity Drag (`F_FTE`).
  - **Tier C (Controlled meshIQ Improvement Scenario)**: Model-projected potential reclaim value and recoverable hours clearly separated from baseline facts.
- **Controlled meshIQ Improvement Scenario Visual Separation**: Explicit visual distinction between immutable baseline calculation outputs and hypothetical/illustrative scenario projections with clear disclaimer tags (*not guaranteed cash savings or fixed ROI*).
- **Provenance Badges & Context on Dashboard Charts**: Clear visual tags (`CALCULATED_RESULT`, `CUSTOMER_FACT`, `INDUSTRY_BENCHMARK`, `SCENARIO_PROJECTION`, `MODEL_ASSUMPTION`) applied to charts and metrics.
- **Accessibility Improvements**: Added semantic ARIA landmark roles (`role="region"`), accessible labels (`aria-label`), and contrast-compliant typography to chart panels and data grids.
- **Executive vs. Consultant Audit View Presentation Refinement**: Clean business labels for client executives (`viewMode === "customer"`) while preserving internal formula codes (`F_TOTAL`, `F_ADMIN`, `F_TROUBLESHOOTING`, `F_OUTAGE`, `F_FTE`) in the Consultant Audit View (`viewMode === "consultant"`).
- **Responsive Presentation Refinements**: Fully responsive layout adjustments across mobile, tablet, and desktop viewports.
- **Draft & Unavailable State Handling Preserved**: Robust loading skeleton, error recovery banners, and draft-state explanations preserved.

#### Files Changed by Batch 5A:
- `frontend/src/components/ExecutiveDashboard.tsx`
- `frontend/src/components/DashboardCharts.tsx`
- `frontend/src/test/dashboardAndScenario.test.tsx`

#### Architectural & Safety Verification:
- **Authoritative Provenance Architecture Maintained**:
  ```text
  Q01–Q22 Inputs
      │
      ▼
  Calculation Engine (Pure Python Decimal)
      │
      ▼
  CalculationSnapshot (Immutable Database Record)
      │
      ▼
  ReportDataAdapter (Type-Safe Transformation)
      │
      ▼
  Executive / Consultant Presentation Layer
  ```
- **Financial Logic Review**: All frontend financial arithmetic expressions (`adminHoursVal * 0.25`, `trbHoursVal * 0.25`, `adminHoursVal + trbHoursVal`) were audited and verified as **SAFE PRESENTATION-ONLY** decompositions; they do not alter, recalculate, or persist authoritative economic outputs.
- **Frozen Areas Untouched**: Batch 5A introduced **ZERO** changes to the Calculation Engine, Golden Master tests (10/10), Q01–Q22 semantics, `CalculationSnapshot` schemas, backend API contracts, RBAC, tenant/customer isolation, Client ownership, authentication session invalidation, Email/SMTP, or database migrations.

---

### BATCH 4E — AUTHENTICATION SESSION HARDENING & SESSION INVALIDATION

**Status:** COMPLETE / IMPLEMENTED & VERIFIED  
**Implementation Commit:** `d08bb450d70235ce7ac6fd602e3d038f94f1b9cf`  
**Scope:** Lightweight, per-user authentication versioning (`auth_version`) to instantly invalidate active JWT sessions upon credential changes.

- **`User.auth_version` Invariant**: Integer counter embedded into JWT payload claims (`auth_version`) upon authentication.
- **Instant Revocation**: Password reset, password change, and credential invalidation atomically increment `auth_version`, instantly invalidating all pre-existing JWT tokens without requiring server-side session stores or Redis.
- **Migration 0006**: Added `auth_version` column to `users` table (`backend/alembic/versions/0006_user_auth_version.py`).

---

---

## 3. Personas & Role-Based Access Control (RBAC)

The platform implements five canonical backend roles mapped to distinct product-facing personas with strict server-side authorization:

| Backend Role | Product Persona | Scope & Governance Authority | Assessment Access Scope |
| :--- | :--- | :--- | :--- |
| `PLATFORM_ADMIN` | Platform Administrator | Authorized cross-tenant and platform-wide governance. Can manage all tenants, customers, and users. | Full read/write across all platform assessments. |
| `PARTNER_ADMIN` | Partner Administrator | Partner/tenant-scoped governance. Can manage customers and users within their assigned partner tenant. | Full read/write across tenant assessments. |
| `CONSULTANT` | Consultant | Partner-scoped assessment portfolio management, discovery probing, and economic review. | Authorized tenant assessment portfolio and economic summaries. |
| `CUSTOMER_ADMIN` | Customer Administrator | Customer-scoped organization governance. Can manage and invite users within their assigned customer entity. | Customer-level administrative oversight. |
| `CUSTOMER_USER` | Client / Customer User | Customer-member individual contributor performing self-service discovery. | **Strictly own assessments** created by the user. |

### Critical Ownership & Governance Rules
1. **Client Individual Ownership**: `CUSTOMER_USER` (Client) access is governed by individual assessment authorship (`created_by_user_id`). Membership in a customer organization does **not** grant access to assessments created by other users within the same customer.
2. **Customer Admin Isolation**: `CUSTOMER_ADMIN` users are strictly scoped to their assigned `customer_id`. They can list users in their organization and provision/invite new `CUSTOMER_USER` accounts within their customer only.
3. **Tenant Invariant**: A user's `customer_id` must strictly belong to the user's `tenant_id`. Cross-tenant customer assignment is rejected at the schema and database constraint levels.

---

## 4. Assessment Model & Lifecycle

### Seven Canonical Assessment Sections (Q01–Q22)

| Section | Title | Questions | Discovery Scope & Economic Drivers |
| :--- | :--- | :--- | :--- |
| **Section A** | Environment & Cost Baseline | Q01–Q05 | Organization scale, industry vertical, queue manager fleet size, weekly administration hours, and team role distribution. |
| **Section B** | Troubleshooting Economics | Q06–Q08 | Incident frequency, labor hours spent per investigation, and average disruption duration. |
| **Section C** | Operational Complexity & Productivity | Q09–Q11 | Dominant incident categories, problem types, and proactive monitoring maturity. |
| **Section D** | Business Consequence & Financial Exposure | Q12–Q15 | Severity tier, business impact classification, annual outage frequency, disruption duration, and financial consequence per downtime hour. |
| **Section E** | Cost Reduction & Organizational Pressure | Q16–Q17 | Configuration management methodology and compliance audit frequency. |
| **Section F** | Cybersecurity & Remediation | Q18–Q19 | Audit preparation effort and security documentation burden. |
| **Section G** | Economic Inputs & Timing | Q20–Q22 | Loaded annual employee cost, customer-reported annual MQ spend, and modernization/migration timelines. |

### Assessment Lifecycle States
1. **`DRAFT` / `IN_PROGRESS`**: Intake responses auto-saved via `PUT /api/v1/assessments/{id}/responses`. Client can resume at any time.
2. **Review & Pre-Flight**: Pre-submission review screen verifies completeness, highlights missing inputs, and flags customer overrides.
3. **`SUBMITTED`**: Client submits assessment via `POST /api/v1/assessments/{id}/submit`. State transitions to `SUBMITTED`, triggering calculation and delivery notifications.
4. **`CALCULATED` (CalculationSnapshot)**: Pure Python calculation engine runs deterministically (`POST /api/v1/assessments/{id}/calculate`) and persists an append-only, immutable `CalculationSnapshot`.
5. **Reporting & Deliverables**: Authoritative calculation outputs drive the Executive Dashboard, Scenario Sandbox, Consultant Economic Summary, and PDF/CSV export deliverables.

---

## 5. Consultant Workspace & Economic Summary

Consultant users operate in a specialized workspace designed for advisory and economic review:

- **Assessment Portfolio**: Searchable, filterable portfolio of all assessments within their partner tenant scope.
- **Read-Only Discovery Review**: Complete inspection of customer responses across Q01–Q22 with visual indicators for customer facts and baseline values.
- **12-Section Economic Summary**: Comprehensive financial breakdown covering:
  1. Executive Summary & Core ROI Metrics
  2. Operational Labor Cost Baseline (Admin + Troubleshooting)
  3. Troubleshooting Friction & Efficiency Recovery (10% & 25% Scenarios)
  4. Outage & Disruption Financial Exposure (Single-Event vs. Annual Risk)
  5. Security, Compliance & Remediation Effort
  6. Configuration & Tooling Overhead
  7. modern MQ Migration & Modernization Velocity
  8. FTE Allocation & Operational Capacity Modeling
  9. 3-Year & 5-Year Cumulative Value Trajectory
  10. meshIQ Strategic Value Proposition Alignment
  11. Recommended Implementation Roadmap & Phasing
  12. Complete Audit & Calculation Provenance
- **Backend-Driven Fidelity**: The frontend does not independently compute financial metrics. All rendered figures originate from the backend calculation engine snapshot.

---

## 6. Admin Governance & User Lifecycle

### Governance Architecture (Batches 4A–4C)
- **Customer Directory & Assessment Registry**: Administrative oversight over registered organizations, active assessments, and completion progress.
- **User Governance**: Role-aware listing, creation, and activation/deactivation of user accounts.
- **Hierarchical Scoping**:
  - `PLATFORM_ADMIN`: Full cross-tenant customer and user administration.
  - `PARTNER_ADMIN`: Tenant-bounded customer and user administration.
  - `CUSTOMER_ADMIN`: Scoped exclusively to own customer organization (`customer_id`). Can provision `CUSTOMER_USER` accounts.

### Secure Invitation & Credential Lifecycle (Batch 4D)
- **Inactive Provisioning**: New users provisioned via invitations are created with `is_active=False` and no usable initial password.
- **Cryptographic Token Generation**: 32-byte URL-safe tokens generated via `secrets.token_urlsafe(32)`.
- **SHA-256 Token Hashing at Rest**: Raw tokens are never stored in the database. Only SHA-256 hashes (`invitation_token_hash`, `password_reset_token_hash`) are persisted.
- **Token Expiration**:
  - Invitation tokens expire in **24 hours**.
  - Password reset tokens expire in **1 hour**.
- **Replay Protection**: Single-use enforcement—tokens are cleared immediately upon successful acceptance or reset.
- **Zero-Enumeration Password Reset**: The forgot-password endpoint returns an identical generic acknowledgment regardless of whether the email exists.
- **Audit Logging**: All invitation generation, acceptance, reset requests, and password updates record sanitized audit events.
- **Email Delivery Integration**: Integrated via `EmailService` supporting asynchronous delivery and headless test-mode isolation (`EMAIL_ENABLED=False`).

---

## 7. Security Architecture

The platform enforces layered enterprise security controls across authentication, authorization, and data isolation:

- **JWT Authentication**: JWT sessions transported via `HttpOnly`, `Secure`, `SameSite=Strict` cookies (`access_token`) and optional Bearer header authorization.
- **Password Hashing**: Bcrypt password hashing (work factor 12).
- **Token Security**: Cryptographically secure randomness (`secrets`), SHA-256 hashing at rest, expiration, and single-use replay protection.
- **Strict Multi-Tenant Isolation**: Anti-IDOR enforcement on all queries ensuring records are isolated by `tenant_id`. Cross-tenant requests return `404 Not Found`.
- **Customer Isolation**: Non-platform administrators are confined to their organizational boundaries.
- **Individual Client Assessment Ownership**: `CUSTOMER_USER` accounts are restricted to assessments where `created_by_user_id == current_user.id`.
- **Append-Only Immutability**: Persisted calculation snapshots cannot be modified or deleted.
- **Rate Limiting**: Sliding-window rate limiter protecting login, invitation acceptance, and password reset endpoints against brute force.
- **Audit Logging & Sanitization**: Comprehensive security audit trail with payload sanitization ensuring credentials and raw tokens are never logged.
- **Fail-Closed Configuration**: Server startup validation rejects weak keys, default credentials, or insecure configurations in production mode.

---

## 8. Database Schema & Migration History

The database schema is managed via asynchronous Alembic migrations:

| Migration | Identifier | Summary & Scope |
| :--- | :--- | :--- |
| `0001` | `0001_initial_schema.py` | Baseline schema: tenants, users, customers, assessments, responses, calculation snapshots, audit events. |
| `0002` | `0002_calc_snapshots_idx.py` | Calculation snapshots optimization and foreign key indexing. |
| `0003` | `0003_assessment_created_by.py` | Assessment ownership: adds `created_by_user_id` foreign key on assessments. |
| `0004` | `0004_user_customer_id.py` | Customer scoping: adds `customer_id` foreign key on users for `CUSTOMER_ADMIN` / `CUSTOMER_USER`. |
| `0005` | `0005_user_credential_tokens.py` | Credential lifecycle: adds token hashes and expiration timestamps for invitations and password resets. |
| `0006` | `0006_user_auth_version.py` | Session hardening: adds `auth_version` integer column on users for instant JWT session invalidation. |

---

## 9. Technology Stack

### Frontend
- **Framework**: [Next.js 16.3.6](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19.2.8](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React 1.48.0](https://lucide.dev/)
- **Testing**: [Vitest 5.0.2](https://vitest.dev/), [React Testing Library 16.3.3](https://testing-library.com/)
- **E2E & PDF**: [Playwright 1.63.0](https://playwright.dev/)

### Backend
- **Framework**: [FastAPI 0.115+](https://fastapi.tiangolo.com/)
- **Runtime**: Python 3.11+ (Python 3.14 fully supported)
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & Pydantic Settings
- **ORM & Database**: [SQLAlchemy 2.0 Async](https://www.sqlalchemy.org/), [Alembic](https://alembic.sqlalchemy.org/)
- **Async Database Drivers**: `asyncpg` (PostgreSQL) / `aiosqlite` (Local Development)
- **Security & Crypto**: `passlib` (Bcrypt), `pyjwt`, `python-multipart`
- **Testing**: [pytest 9.1+](https://docs.pytest.org/), pytest-asyncio, pytest-cov

---

## 10. Automated Testing & Verification Status

### Verified Test Suite Results (Batch 5A Checkpoint)

```text
================================================================================
                         AUTOMATED TEST SUITE SUMMARY
================================================================================
1. Backend & Calculation Suite (pytest 9.1):
   • 10/10 Golden Master Reference Scenarios (TC-01–TC-10)               PASSED
   • 11/11 Calculation Engine Precision & Boundary Tests                 PASSED
   • 10/10 API Integration & Submission Orchestration Tests              PASSED
   • 13/13 Observability, Health Probes & Structured Logging Tests       PASSED
   • 95/95 Security & Governance Tests                                   PASSED
           - Auth, RBAC, IDOR, Rate Limiting, Bootstrap Admin
           - Customer Scoping & Client Assessment Ownership (Batch 4C)
           - User Invitation & Password Reset Lifecycle (Batch 4D)
           - Authentication Session Hardening & Invalidation (Batch 4E)
   -----------------------------------------------------------------------------
   Total Backend Suite: 139/139 PASSED (100%)

2. Frontend Test Suite (Vitest 5.0):
   • 17/17 Test Files                                                    PASSED
   • 111/111 Component, Wizard, Governance & Security Tests             PASSED
   -----------------------------------------------------------------------------
   Total Frontend Suite: 111/111 PASSED (100%)

3. Static Analysis & Build:
   • TypeScript Static Typecheck (`tsc --noEmit`):                       0 ERRORS
   • Next.js Production Turbopack Build (`next build`):                  PASSED

4. Browser QA & Smoke Verification (Chromium):
   • Multi-Persona Smoke Tests (Admin, Consultant, Client, Expiry):      5/5 PASSED
   • Critical Console Errors:                                            0 ERRORS

5. Database Migration Lifecycle:
   • Alembic Upgrade (0001 -> 0006):                                     PASSED
   • Alembic Downgrade (0006 -> 0001):                                   PASSED
   • Alembic Re-Upgrade (0001 -> 0006):                                  PASSED
================================================================================
```

---

## 11. Git Checkpoint History

| Batch / Feature | Commit | Description | Scope |
| :--- | :--- | :--- | :--- |
| **Batch 1** | `1ca1182` | `feat: add session isolation and customer switching` | Multi-tenant session safeguards and customer draft switching. |
| **Batch 2** | `995a3ea` | `feat: enhance branding and accessibility` | Official brand assets, WCAG AA contrast, and shell attribution. |
| **Batch 3** | `26846c1` | `feat: refine assessment interaction and save clarity` | Autosave states, QuestionCard density, and modal ergonomics. |
| **Batch 4** | `2fe74d7` | `feat: improve calculation and results accessibility` | In-page accessible calculation errors, retry flow, tab keyboarding. |
| **Branding** | `de43fe9` | `feat: refine dataeko brand visibility` | Exact asset scaling and footer wordmark attribution. |
| **Section Nav** | `cdb4114` | `feat: show canonical section names in assessment navigation` | Dynamic Q01–Q22 section titles and responsive navigation. |
| **Batch 3A** | `b3c50ff` | `feat: orchestrate assessment submission delivery` | State transition to SUBMITTED, async notifications, delivery record. |
| **Batch 3A.1** | `7c46628` | `fix: clarify submission delivery failure handling` | Fault-tolerant submission delivery state clarity. |
| **Batch 3B** | `d2bdb0c` | `feat: add client assessment ownership and role visibility` | Client individual ownership and role-aware navigation. |
| **Batch 3B.1** | `c2a1016` | `feat: establish role-aware application workspaces` | Role-specific dashboard layouts and workspace routing. |
| **Batch 3C** | `1ed7eaf` | `feat: add consultant assessment portfolio` | Searchable/filterable assessment portfolio for consultants. |
| **Batch 3C.1** | `634a058` | `feat: add consultant economic assessment summary` | 12-section discovery & ROI economic summary view. |
| **Batch 4A** | `e3b8b5a` | `feat: add admin governance registry` | Customer directory, assessment registry, and user directory. |
| **Batch 4B** | `8726245` | `feat: add user and customer governance mutations` | Customer create/edit, user create, activation/deactivation. |
| **Batch 4C** | `0c4c3fb` | `feat: add customer-scoped user governance` | `User.customer_id`, customer admin scoping, invariant enforcement. |
| **Batch 4D** | `7504964` | `feat: add secure user invitation lifecycle` | Invitation tokens, SHA-256 token hashing, password reset, rate limits. |
| **Batch 4E** | `d08bb45` | `feat: harden authentication session invalidation` | Per-user `auth_version`, token claim, instant credential revocation. |
| **Batch 5A** | `12593a7` | `feat: refine executive dashboard and results experience` | Executive KPI hierarchy, scenario separation, chart provenance badges. |
| **Phase 1 UI** | `f2e73aa` | `feat: establish enterprise ui refinement foundation` | Enterprise UI design foundation, spatial grid, and color palette tokens. |
| **Phase 2 UI** | `0e51a94` | `feat: refine enterprise workflow interactions` | Interaction ergonomics, modal layouts, and section step progress. |
| **Login UI** | `07e2b72` | `feat: refine enterprise login presentation` | Light-theme enterprise login card and brand mark alignment. |
| **Micro UI** | `77c1110` | `fix: clarify assessment section progress label` | Numeric section progress indicators ("Section 1 of 7"). |
| **Header Scale** | `5aa9fc5` | `feat: refine enterprise header scale` | Spacious ~77px enterprise header scale and brand mark scaling. |
| **Header Fix** | `f0e1e96` | `fix: preserve dataeko header attribution visibility` | Top-right DATAEKO logo protected against horizontal clipping. |

---

## 12. Planned Next Increments & Deferred Work

### Current Checkpoint: Enterprise UI & E2E Validation Checkpoint (`f0e1e96`)
- **Status**: **VALIDATION COMPLETE / DEFECT DISCOVERY CHECKPOINT**.
- **Scope**: Comprehensive read-only end-to-end product validation across all roles, workflows, calculation pipelines, and viewports.

### Next Planned Increment: Controlled Remediation Batch (P0 & P1)
- **Scope**:
  1. **P0 Authentication Boundary**: Enforce mandatory authentication on `GET /api/v1/assessments` and `GET /api/v1/assessments/{id}` to prevent unauthenticated assessment and snapshot leakage.
  2. **P1 Save/Resume Persistence**: Correct client response field mapping between frontend state and backend schemas so draft responses persist and reload reliably.
- **Status**: **PLANNED — NOT STARTED** (Development intentionally paused after validation checkpoint).
- **Deferred**: P2 (Client customer selection UX) and P3 (Section navigation discoverability) are explicitly deferred and excluded from this batch.

### Production Deployment Status
- **Status**: **DEFERRED**.
- **Branch**: `dev`.
- Container topology definitions (`docker-compose.prod.yml`) and Nginx configurations (`nginx/default.conf`) are maintained in the repository for production readiness, but live deployment is intentionally deferred.

### Email Delivery Status
- **Status**: **HEADLESS / TEST-MODE ISOLATED** (`EMAIL_ENABLED=False`). Real SMTP delivery remains deferred until explicitly authorized.

---

## 13. Local Development Guide

### Prerequisites
- **Python**: 3.11+ (Python 3.14 tested)
- **Node.js**: 20.x or 22.x LTS and npm
- **Docker & Docker Compose**: (Optional, for PostgreSQL / containerized workflow)

### 1. Backend Setup (Local Development)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup (Local Development)
```bash
cd frontend
npm install
npm run dev
```

### 3. Verification & Health Probes
- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Base**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **Liveness Probe**: [http://localhost:8000/api/v1/health/live](http://localhost:8000/api/v1/health/live)
- **Readiness Probe**: [http://localhost:8000/api/v1/health/ready](http://localhost:8000/api/v1/health/ready)

### Pre-Configured Development Credentials
When running in `ENVIRONMENT=development`, pre-seeded development accounts are available:
- **Platform Admin**: `admin@dataeko.ai` / `AdminPass123!`
- **Partner Admin**: `partner@dataeko.ai` / `PartnerPass123!`
- **Consultant**: `consultant@dataeko.ai` / `Consultant123!`
- **Customer Admin**: `customer_admin@dataeko.ai` / `CustAdmin123!`
- **Customer User (Client)**: `customer_user@dataeko.ai` / `CustUser123!`

---

## 14. Branding & Visual Identity

The dashboard implements the modern **meshIQ visual identity** combined with enterprise **DATAEKO** platform branding:

- **Color Palette**: meshIQ Green (`#00D26A` / `#059669`) action signals, Black/Dark Charcoal (`#0B0F17` / `#111827`) structural surfaces, and clean light neutral cards.
- **Official Logos**: Official meshIQ and DATAEKO logo assets prominently placed in the application header. Official logos are not recolored or modified.
- **Attribution**: "Powered by DATAEKO.AI" subtle application shell badge and footer attribution.
- **Visual Fact Differentiation**: Standardized assessment responses are clearly distinguished from exact customer facts/overrides.

---

## 15. Licensing & Governance

Confidential and proprietary to **DATAEKO.AI** and **meshIQ**. All rights reserved.