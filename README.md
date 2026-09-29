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

The platform is under active development on the **`dev`** branch. Implementation and rigorous verification through **Batch 4D** are complete.

### Current Checkpoint Summary

| Attribute | Current Value |
| :--- | :--- |
| **Current Git Checkpoint** | `7504964` (`feat: add secure user invitation lifecycle`) |
| **Development Branch** | `dev` |
| **Implementation Stage** | **Batch 4D — Secure User Invitation & Credential Lifecycle** (Complete) |
| **Next Planned Work** | **Batch 4E — Authentication Session Hardening & Token Invalidation** |
| **Batch 4E Status** | **PLANNED — NOT STARTED** (Explicitly deferred to next increment) |
| **Deployment Status** | **Deferred** (Local development and pre-deployment validation only) |

> [!IMPORTANT]
> **Stateless JWT Session Characteristic**: Current authentication uses stateless JWT sessions. Credential reset updates the user's password and prevents future authentication with the old credential. Explicit invalidation of already-issued JWT sessions is planned for Batch 4E and has not yet been implemented.

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

### Verified Test Suite Results (Batch 4D Checkpoint)

```text
================================================================================
                         AUTOMATED TEST SUITE SUMMARY
================================================================================
1. Backend & Calculation Suite (pytest 9.1):
   • 10/10 Golden Master Reference Scenarios (TC-01–TC-10)               PASSED
   • 11/11 Calculation Engine Precision & Boundary Tests                 PASSED
   • 10/10 API Integration & Submission Orchestration Tests              PASSED
   • 13/13 Observability, Health Probes & Structured Logging Tests       PASSED
   • 89/89 Security & Governance Tests                                   PASSED
           - Auth, RBAC, IDOR, Rate Limiting, Bootstrap Admin
           - Customer Scoping & Client Assessment Ownership (Batch 4C)
           - User Invitation & Password Reset Lifecycle (Batch 4D)
   -----------------------------------------------------------------------------
   Total Backend Suite: 133/133 PASSED (100%)

2. Frontend Test Suite (Vitest 5.0):
   • 17/17 Test Files                                                    PASSED
   • 109/109 Component, Wizard, Governance & Security Tests             PASSED
   -----------------------------------------------------------------------------
   Total Frontend Suite: 109/109 PASSED (100%)

3. Static Analysis & Build:
   • TypeScript Static Typecheck (`tsc --noEmit`):                       0 ERRORS
   • Next.js Production Turbopack Build (`next build`):                  PASSED

4. Browser QA & Smoke Verification (Chromium):
   • Multi-Persona Smoke Tests (Admin, Consultant, Client, Invitations)   PASSED
   • Critical Console Errors:                                            0 ERRORS

5. Database Migration Lifecycle:
   • Alembic Upgrade (0001 -> 0005):                                     PASSED
   • Alembic Downgrade (0005 -> 0001):                                   PASSED
   • Alembic Re-Upgrade (0001 -> 0005):                                  PASSED
================================================================================
```

---

## 11. Git Checkpoint History

| Batch | Commit | Description | Scope |
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

---

## 12. Planned Next Increments & Deferred Work

### Next Planned Increment: Batch 4E
- **Scope**: Authentication Session Hardening & Password-Reset Token Invalidation.
- **Key Deliverables**:
  - JWT session versioning / token revocation timestamps (`token_valid_after`).
  - Explicit invalidation of active sessions upon password reset or credential revocation.
  - Server-side token blacklisting / session revocation checks in authentication middleware.
- **Status**: **PLANNED — NOT STARTED**.

### Production Deployment Status
- **Status**: **DEFERRED**.
- **Branch**: `dev`.
- Container topology definitions (`docker-compose.prod.yml`) and Nginx configurations (`nginx/default.conf`) are maintained in the repository for production readiness, but live deployment is intentionally deferred.

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