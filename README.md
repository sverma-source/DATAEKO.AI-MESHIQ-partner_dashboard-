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

The platform is under active development on the **`dev`** branch. The critical **P0 Security** and **P1 Save/Resume Persistence** remediation batch has been completed, verified across automated and live browser tests, and pushed to the remote repository.

### Current Checkpoint Summary

| Attribute | Current Value |
| :--- | :--- |
| **Current Git Checkpoint** | `1b03e1a` (`fix: secure assessments and restore draft persistence`) |
| **Authoritative Commit Hash** | `1b03e1a458a476cb26e33caf3a33fb4f1a10de89` |
| **Development Branch** | `dev` (Synchronized with `origin/dev`) |
| **Implementation Stage** | **P0 Security & P1 Save/Resume Remediation Complete** |
| **P0 Authentication Boundary** | **RESOLVED** (`401 Unauthorized` enforced for all unauthenticated assessment API requests) |
| **P1 Save/Resume Persistence** | **RESOLVED** (Reliable multi-cycle response persistence; nested payload stripping; dropdown/override resilience) |
| **Submission Immutability** | **VERIFIED** (Read-only view preserved across reloads; `HTTP 409 Conflict` on post-finalization mutations) |
| **Working Tree** | **Clean** (No uncommitted changes, no unpushed commits) |
| **Next Planned Work** | **Incremental Product Roadmap Features (P2, P3, Defensible Economic Outputs, etc.)** |
| **Deployment Status** | **Deferred** (Local development only; no production deployment performed) |
| **Email Status** | **Headless / Isolated** (`EMAIL_ENABLED=False`; no real customer email has been sent) |

---

### P0 SECURITY & P1 SAVE/RESUME REMEDIATION (BATCH COMPLETE)

**Status:** COMPLETE / VERIFIED / COMMITTED (`1b03e1a`)  
**Scope:** Remediation of the two defects discovered during the read-only E2E validation.

#### 1. P0 — Authentication Boundary (RESOLVED)
- **Vulnerability Remediated**: Replaced `get_current_user_optional` with mandatory dependency `current_user: User = Depends(get_current_user)` across all 13 assessment endpoints in `backend/app/api/v1/assessments.py`.
- **Enforcement Verified**:
  - `GET /api/v1/assessments` without credentials returns `401 Unauthorized` (`{"detail": "Authentication required. Please log in.", "error_type": "AuthenticationError"}`).
  - `GET /api/v1/assessments/{assessment_id}` without credentials returns `401 Unauthorized`.
  - Zero leakage of assessment metadata, customer records, or calculation snapshots to anonymous callers.
  - Authenticated calls by Client, Consultant, and Admin personas return `200 OK` with proper tenant and role scoping.

#### 2. P1 — Client Save/Resume Persistence (RESOLVED)
- **Discrepancy Remediated**:
  - **Recursive Payload Nesting**: Sanitized `saveResponses` in `frontend/src/services/api.ts` to strip nested `raw_responses` before persisting, eliminating recursive nesting across repeated saves.
  - **Unified State Normalization**: Implemented `normalizeResponseState` in `frontend/src/data/questionCatalog.ts` to merge structured database columns with `raw_responses`, preserving all non-feeder fields (`q02_staffing`, `q02_override`, `q04_dropdown`, `q05_tech_debt`, `q13_recent_disruptions`, `q17_opex_reduction`, `q17_override`).
  - **Dropdown Value vs Label Resilience**: Normalization resiliently maps stored option labels and dash/en-dash variations back to canonical option values.
  - **Reactive Numeric Overrides**: Updated `QuestionCard.tsx` so `useOverrideMode` dynamically reflects asynchronously loaded override values without requiring manual button toggling.
  - **Synchronized Loaders**: Replaced fragmented conditional parsing in both `page.tsx` and `ConsultantWorkspace.tsx` with `normalizeResponseState`.
- **Persistence Verified**:
  - Client intake responses for Section A (select options, numeric overrides, free text, booleans) persist across `Save Draft` -> page reload -> edit -> `Save Draft` -> page reload cycles with 100% value fidelity.

#### 3. Finalization & Immutability Regression (VERIFIED)
- Completing assessment intake and confirming submission via the review modal transitions state to `SUBMITTED`.
- Reloading the page with `?assessment_id=<id>` reliably preserves the read-only submitted view.
- Direct API mutation attempts against a submitted assessment (`PUT /api/v1/assessments/{id}/responses`) strictly fail with `HTTP 409 Conflict`.

#### Deferred Findings (Excluded From This Batch):
- **P2 — Medium: Client Customer Selection UX**: Client users see all tenant customer organizations in the initial customer selection modal. Deferred to subsequent incremental pass.
- **P3 — Low: Section Navigation Discoverability**: Assessment wizard sections E, F, and G overflow horizontally on viewports <= 1280px without an explicit scroll affordance. Deferred to subsequent incremental pass.

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

### Verified Test Suite Results (P0/P1 Remediation Checkpoint `1b03e1a`)

```text
================================================================================
                         AUTOMATED TEST SUITE SUMMARY
================================================================================
1. Backend & Calculation Suite (pytest 9.1):
   • 10/10 Golden Master Reference Scenarios (TC-01–TC-10)               PASSED
   • 11/11 Calculation Engine Precision & Boundary Tests                 PASSED
   • 13/13 API Integration & Submission Orchestration Tests              PASSED
           - test_assessments_api.py (unauthorized 401 & auth enforcement)
           - test_submission_orchestration.py (mutation protection & conflicts)
   • 13/13 Observability, Health Probes & Structured Logging Tests       PASSED
   • 94/94 Security & Governance Tests                                   PASSED
           - Auth, RBAC, IDOR, Rate Limiting, Bootstrap Admin
           - Customer Scoping & Client Assessment Ownership (Batch 4C)
           - User Invitation & Password Reset Lifecycle (Batch 4D)
           - Authentication Session Hardening & Invalidation (Batch 4E)
   -----------------------------------------------------------------------------
   Total Backend Suite: 141/141 PASSED (100%)

2. Frontend Test Suite (Vitest 5.0):
   • 18/18 Test Files                                                    PASSED
   • 115/115 Component, Wizard, Governance & Security Tests             PASSED
           - Includes responsePersistence.test.ts (P1 state normalization)
   -----------------------------------------------------------------------------
   Total Frontend Suite: 115/115 PASSED (100%)

3. Static Analysis & Build:
   • TypeScript Static Typecheck (`tsc --noEmit`):                       0 ERRORS
   • Next.js Production Turbopack Build (`next build`):                  PASSED

4. Browser QA & Targeted P0/P1 E2E Verification (Chromium / Playwright):
   • Part 1: Anonymous Assessment API Access (P0) Blocked (HTTP 401):    PASSED
   • Part 2: Client Section A Multi-Cycle Save/Resume Persistence (P1):  PASSED
   • Part 3: Assessment Submission & Immutability (HTTP 409 Conflict):   PASSED
   • Finalization & Read-Only Behavior Across Page Reloads:              PASSED

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
| **P0/P1 Fix** | `1b03e1a` | `fix: secure assessments and restore draft persistence` | Mandatory auth on assessment endpoints, draft state normalization, and anti-nesting. |

---

## 12. Planned Next Increments & Product Roadmap

### Current Authoritative Checkpoint (`1b03e1a`)
- **Authoritative Commit Hash**: `1b03e1a458a476cb26e33caf3a33fb4f1a10de89`
- **Development Branch**: `dev` (Synchronized with `origin/dev`)
- **Working Tree**: Clean (zero uncommitted changes, zero unpushed commits)
- **P0 Status**: **RESOLVED** — Strict authentication dependency on all assessment routes (`401 Unauthorized` on anonymous access).
- **P1 Status**: **RESOLVED** — Client intake response persistence and state normalization verified across multiple save/reload cycles.
- **Submission Finalization**: **VERIFIED** — Read-only state preserved upon submission; post-submission mutations strictly rejected with `HTTP 409 Conflict`.

### Deferred Findings
The following two findings from the initial E2E validation pass remain intentionally deferred and will be addressed in future incremental batches:
1. **P2 — Client Customer Selection / Scoping UX**: Currently, client users can see other customer organizations in the customer selector dropdown. Although backend permissions prevent unauthorized actions, the UI should auto-select and scope to the client's assigned customer organization.
2. **P3 — Section Navigation Discoverability at Narrower Widths**: On screens <= 1280px, wizard sections E, F, and G overflow horizontally without explicit visual scroll arrows or indicators.

### Product Roadmap Direction (Planned Future Capabilities)

> [!NOTE]
> All items listed below represent **planned future direction** to be implemented incrementally in controlled batches. **None of these capabilities are currently implemented in the codebase.**

1. **P2 Customer Selection & Scoping UX**: Dedicated client organization auto-binding, restricting customer selection to the caller's assigned organization context.
2. **P3 Section Navigation Discoverability**: Overflow indicators, chevron scroll buttons, and responsive discoverability enhancements for assessment wizard navigation on narrower viewports.
3. **Defensible Economic Outputs / “Show the Math”**: Interactive mathematical inspectability, per-metric derivation traces, explicit formula decomposition modals, and step-by-step audit provenance directly accessible to users in the UI.
4. **Scenario Analysis**: Advanced sensitivity modeling, multi-scenario side-by-side comparisons (e.g., conservative vs. moderate vs. aggressive efficiency capture), custom target goal-seeking, and parameter variance simulations.
5. **Recommendations / Action Layer**: Contextual, prioritized recommendation engine generating tactical modernization actions, operational quick wins, and risk mitigations tied directly to discovery responses.
6. **Executive Results and Reporting**: Enhanced C-suite reporting formats, interactive boardroom presentation modes, customizable executive summaries, and multi-format deliverable exports.
7. **Consultant Portfolio Intelligence**: Cross-customer analytics, fleet-wide benchmark comparisons, opportunity sizing, engagement scoring, and aggregate pipeline intelligence for consultants.
8. **Workflow & Collaboration**: Multi-stakeholder review workflows, inline commentary and clarification threads on specific questions, change request workflows for finalized assessments, and collaborative sign-offs.
9. **Customer 360**: Unified longitudinal view of a customer organization over time, tracking annual progress, historical assessment versions, value realization metrics, and maturity progression.
10. **Enterprise Integrations & Governance**: SSO / SAML / OIDC enterprise identity provider integrations, external audit webhook streaming, enterprise secret management, and SOC 2 / ISO 27001 compliance reporting.

### Safety, Deployment & Delivery Boundaries

- **Production Deployment Status**: **NOT PERFORMED**. The platform remains in local development state on branch `dev`.
- **Email Delivery Status**: **HEADLESS / TEST-MODE ISOLATED** (`EMAIL_ENABLED=False`). **No real customer email has been sent**.
- **Roadmap Disclaimer**: Future roadmap features are not yet implemented and must not be treated as existing capabilities.

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