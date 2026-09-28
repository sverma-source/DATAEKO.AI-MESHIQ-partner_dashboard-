# DATAEKO × meshIQ Partner Dashboard

> **Enterprise IBM MQ Economic Cost & Efficiency Assessment Platform**  
> Modernizing and standardizing enterprise messaging economic assessments with deterministic calculations, immutable provenance, and executive-ready reporting.

---

## 1. Overview

The **DATAEKO × meshIQ Partner Dashboard** is an enterprise-grade digital platform designed to digitize, modernize, and automate the legacy **IBM MQ Economic Cost & Efficiency Assessment** workflow. 

By replacing complex, error-prone spreadsheets with a secure, auditable, and deterministic web application, the platform enables Dataeko consultants and meshIQ specialists to evaluate enterprise messaging environments, quantify operational friction, model controlled improvement scenarios, and deliver audit-grade executive business cases for C-level leadership.

---

## 2. Product Purpose

The platform provides an end-to-end evaluation lifecycle covering:
* **Customer Assessment Intake**: Capturing environment topology, operational frequency, and financial parameters across 22 standardized questions (Q01–Q22).
* **Operational Effort Quantification**: Modeling baseline administration and troubleshooting labor burden across enterprise queue manager environments.
* **Troubleshooting Economics**: Quantifying staff hours dedicated to incident discovery, diagnostics, and resolution.
* **Productivity Opportunity**: Calculating potential labor recovery under structured efficiency scenarios.
* **Business Consequence & Exposure**: Evaluating representative single-event exposure during messaging disruptions without overstating operational risk.
* **Cybersecurity & Governance Context**: Assessing configuration drift, compliance overhead, and manual verification labor.
* **Executive Decision Support**: Generating interactive dashboards, controlled scenario sandboxes, and boardroom-ready executive PDF reports.

### Safe Financial Terminology & Invariants
* **Representative Single-Event Exposure ≠ Annual Loss**: Single-event exposure reflects estimated financial consequence for an individual outage event; it is not an annualized recurring financial loss.
* **Illustrative Economic Value ≠ Guaranteed Savings**: Modeled efficiency improvements reflect illustrative operational potential based on industry benchmarks and client inputs; they do not constitute guaranteed ROI or contractual savings.
* **Annual MQ Spend Isolation**: Customer-reported annual MQ spend (Q21) is tracked as an independent context metric and is never conflated with or added to calculated operational labor costs.
* **Explicit Unknowns**: Missing or uncertain data is preserved as structured unmapped states rather than being silently coerced into zero.

---

## 3. Core Assessment Structure (Q01–Q22)

The discovery model is structured into seven authoritative sections:

* **Section A: Environment & Cost Baseline (Q01–Q05)**: Organization scale, industry vertical, queue manager fleet size, weekly administration hours, and team role distribution.
* **Section B: Troubleshooting Economics (Q06–Q08)**: Incident frequency, labor hours spent per investigation, and average disruption duration.
* **Section C: Operational Complexity & Productivity (Q09–Q11)**: Dominant incident categories, problem types, and proactive monitoring maturity.
* **Section D: Business Consequence & Financial Exposure (Q12–Q15)**: Severity tier, business impact classification, annual outage frequency, outage duration, and financial consequence per downtime hour.
* **Section E: Cost Reduction & Organizational Pressure (Q16–Q17)**: Configuration management methodology and compliance audit frequency.
* **Section F: Cybersecurity & Remediation (Q18–Q19)**: Audit preparation effort and security documentation burden.
* **Section G: Economic Inputs & Timing (Q20–Q22)**: Loaded annual employee cost, customer-reported annual MQ spend, and modernization/migration timelines.

---

## 4. Architecture

The platform follows a modular-monolith architecture with strict separation between user interface, persistence, security boundaries, and the core calculation engine.

```text
Browser Client (Next.js 16 / React 19)
    │  [HTTP-only / SameSite=Strict Cookies]
    ▼
FastAPI Gateway & Security Middleware (/api/v1)
    │  [JWT Validation, RBAC Enforcement, Tenant Filter, Error Sanitizer]
    ├──► PostgreSQL / SQLAlchemy 2.0 (Persistence, Snapshots, Audit Trail)
    │
    └──► Standalone Deterministic Calculation Engine (In-Memory Python / Decimal Arithmetic)
            │
            ▼
         Immutable Calculation Snapshot
            │
            ├──► Executive KPI Dashboard & Controlled Scenario Sandbox
            │
            └──► Deterministic Report Adapter & Headless Playwright PDF Generator
```

### Technology Stack
* **Frontend**: Next.js 16 (Turbopack), React 19, TypeScript 5, Tailwind CSS 4, Lucide Icons.
* **Backend**: Python 3.14, FastAPI, Pydantic v2 Settings & Schemas, Uvicorn.
* **Database & ORM**: PostgreSQL (Production) / SQLite `aiosqlite` (Local Dev), SQLAlchemy 2.0 Async, Alembic.
* **Calculation Engine**: Standalone, pure Python in-memory computational engine using `Decimal` arithmetic.
* **Reporting & PDF**: Deterministic report adapter, CSS Print Paged Media, Headless Playwright Chromium.
* **Testing & Verification**: Pytest, AsyncIO, Pytest-Cov, Vitest, React Testing Library.

---

## 5. System Data Flow

1. **Intake**: User answers questions Q01–Q22; progress is validated and autosaved via `PUT /api/v1/assessments/{id}/responses`.
2. **Calculation Execution**: `POST /api/v1/assessments/{id}/calculate` passes normalized inputs to the pure calculation engine.
3. **Snapshot Creation**: The engine generates an immutable calculation snapshot persisted with full provenance metadata.
4. **Dashboard**: The Executive Dashboard displays KPI summaries, effort distribution, and controlled scenario sandboxes without recalculating metrics on the client.
5. **Report Generation**: The deterministic `reportDataAdapter` maps snapshots to the executive report schema without altering calculation values.
6. **PDF Export**: Playwright Chromium renders the deterministic print layout and exports an A4 PDF artifact.

---

## 6. Calculation Model & Provenance

The calculation engine enforces exact mathematical fidelity with the validated business specification:

* **Loaded Hourly Employee Rate**: Derived from Q20 (`Annual Salary / 2,080 hours`) using unrounded `Decimal` arithmetic.
* **Annual Administration Effort**: Quantified from weekly administrator hours (Q04) scaled to an annual baseline.
* **Annual Troubleshooting Effort**: Computed as `Annual Incident Frequency (Q06) × Investigation Hours (Q07)`.
* **Total Operational Labor**: Sum of Annual Administration Cost and Annual Troubleshooting Cost.
* **FTE Burden**: Total operational labor hours divided by 2,080 annual working hours.
* **Representative Single-Event Exposure**: Modeled as `Disruption Duration (Q14) × Financial Impact/Hour (Q15)` (using customer override or industry vertical benchmark fallback).
* **10% Troubleshooting Productivity Opportunity**: Baseline metric reflecting operational friction recovery.
* **25% Investigation Efficiency Scenario**: meshIQ specialized investigation acceleration scenario (decomposed as 50% admin addressability × 50% efficiency + 25% investigation reduction).

### 5-Tier Provenance Taxonomy
Every metric rendered in the application carries explicit provenance badging:
1. `CUSTOMER_FACT`: Values provided directly by the customer (e.g., custom labor rate, specific outage count).
2. `BENCHMARK`: Values derived from authoritative industry datasets (e.g., vertical hourly downtime costs).
3. `CALCULATED`: Deterministic outputs of the Phase 3 calculation engine.
4. `SCENARIO`: Exploratory user adjustments modeled in the Scenario Sandbox.
5. `DEMO_DATA`: Synthetic data clearly labeled for demonstration purposes.

---

## 7. Security, Identity & Multi-Tenancy

The platform incorporates server-side security controls:

* **Authentication**: Stateless JSON Web Tokens (JWT) transported via `HTTP-only`, `Secure`, `SameSite=Strict` cookies (`access_token`). Passwords hashed with Bcrypt (cost factor 12).
* **Role-Based Access Control (RBAC)**:
  * `PLATFORM_ADMIN`: System-wide administration and tenant management.
  * `PARTNER_ADMIN`: Partner tenant administration and full assessment authority.
  * `CONSULTANT`: Customer assessment creation, calculation execution, report generation, and audit review.
  * `CUSTOMER_ADMIN`: Organization assessment management, review, and team access.
  * `CUSTOMER_USER`: Organization discovery intake and executive view access.
* **Tenant Isolation & Anti-IDOR**: All database queries enforce `tenant_id == current_user.tenant_id`. Cross-tenant resource requests return `404 Not Found` with zero metadata disclosure.
* **Snapshot Immutability**: Persisted calculation snapshots are append-only; update/delete endpoints are strictly disabled.
* **Append-Only Audit Trail**: All security-relevant actions (login, calculation, customer update, report export) are logged to the `audit_events` table.
* **Defensive Middleware**: Enforces `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and traceback/internal exception sanitization.

*Note: Infrastructure-level controls (HTTPS TLS termination, WAF, automated RDS point-in-time backups) are deployment-environment responsibilities.*

---

## 8. Verification & Automated Test Status

The codebase is validated across unit, integration, Golden Master, security, browser-to-backend E2E, and production build pipelines:

```text
================================================================================
                         AUTOMATED VERIFICATION SUMMARY
================================================================================
1. Backend & Security Suite (pytest):
   • 10/10 Golden Master Reference Scenarios (TC-01–TC-10)               PASSED
   • 11/11 Calculation Engine Edge Cases & Precision Tests               PASSED
   • 8/8 Backend API, Persistence & Database Migration Tests             PASSED
   • 12/12 Security Tests (Auth, RBAC, IDOR, Immutability, Sanitizer)     PASSED
   • 141/141 Total Backend Tests Across Full Test Tree                   PASSED
   -----------------------------------------------------------------------------
   Backend Test Suite: 100% PASS

2. Frontend Test Suite (vitest):
   • 10/10 Question Catalog & Discovery Tests                            PASSED
   • 5/5 Comprehensive 7-Section Intake Workflow Tests                   PASSED
   • 8/8 Wizard Components & Navigation Tests                            PASSED
   • 9/9 Executive Dashboard & Scenario Sandbox Tests                    PASSED
   • 9/9 Report Data Adapter & Executive Report Tests                    PASSED
   • 11/11 AuthContext, LoginPage & ProtectedRoute Tests                 PASSED
   -----------------------------------------------------------------------------
   Frontend Test Suite: 52/52 PASSED (10 test files)

3. Browser-to-Backend E2E Suite (playwright):
   • 4/4 Spec Files / 10 Comprehensive Tests (Auth, RBAC, Intake, PDF)   PASSED (Local)

4. Production Build & PDF Artifact Validation:
   • Next.js Standalone Production Build (`next build`):                 PASSED
   • Playwright Chromium Executive PDF Generator & Structural Check:    PASSED
================================================================================
```

---

## 9. Project Progress & Release Gating Status

* **Project**: **DATAEKO × meshIQ Partner Dashboard**
* **Completed Phases**:
  * **Phase 1–8.1**: Core deterministic calculation engine, 22-question intake wizard, scenario sandbox, executive reporting, Playwright PDF export, JWT HttpOnly security, and RBAC integration.
  * **Phase 9.1**: PostgreSQL boolean schema alignment & database persistence validation (`VERIFIED`).
  * **Phase 9.2**: Production configuration enforcement, secret rotation, and strict production validation (`VERIFIED`).
  * **Phase 9.3**: Production observability, structured JSON logging, and `/health/liveness` + `/health/readiness` probes (`VERIFIED`).
  * **Phase 9.4**: Comprehensive browser-to-backend E2E lifecycle, customer save/resume persistence, and calculation engine provenance audit (`VERIFIED`).
  * **Phase 9.5**: Operational hardening & rate limiting (`VERIFIED WITH FINDINGS`):
    * Rate limiting: `POST /api/v1/auth/login` (5 req/min per resolved IP) and general API throttling (120 req/min).
    * Request body protection: `RequestSizeLimiterMiddleware` (10MB limit enforcement with `413 Request Entity Too Large`).
    * Trusted proxy handling: explicit IP/CIDR validation and spoof-resistant client IP resolution.
    * Security & production error sanitization with `X-Request-ID` correlation.
    * *Finding (P2)*: Process-local in-memory sliding-window limiter retains empty keys across eviction cycles (minor memory footprint; documented single-worker process limitation).

* **Phase 9.6: CI/CD & Release Gates (`IMPLEMENTED — VERIFICATION IN PROGRESS`)**:
  * *Implementation*: 10-job multi-stage GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`):
    1. `backend-tests`: Full canonical backend discovery (`pytest backend/tests`).
    2. `golden-masters`: Strict 10/10 reference scenario calculation gate.
    3. `frontend-tests`: Frontend Vitest component & workflow test suite.
    4. `frontend-typecheck`: Strict TypeScript typechecking (`tsc --project tsconfig.json --noEmit`).
    5. `security-prod-config`: Security middleware, RBAC, error sanitization, and production settings gate.
    6. `frontend-build`: Next.js standalone production build verification.
    7. `docker-build-check`: Multi-service Dockerfile and compose validation.
    8. `e2e-browser-suite`: Real-stack Playwright browser-to-backend E2E test suite (PostgreSQL + FastAPI + Next.js).
    9. `report-pdf-gate`: Headless Chromium executive PDF generation and structural integrity validation.
    10. `release-gate`: Unified release gate running under `if: always()`, evaluating all 9 upstream job results.
  * *Current CI Evidence & Status*:
    * **Run 36317997179**: Frontend Vitest failed using `threads` pool due to an environment-level worker thread conflict with `jsdom`/`undici` on Node 20.
    * **Targeted CI Remediation**: Commit `2bf093f42948890d989977561a32bc146a82bdef` adjusted Vitest CI execution from `threads` to `forks` pool.
    * **Run 36318655727**: In progress / ongoing evaluation.
  * *Note*: Phase 9.6 remains open and is **NOT** marked verified until a clean end-to-end GitHub Actions workflow run completes and all 10 release gates succeed.

---

## 10. Local Development Guide

### Prerequisites
* Python 3.11+ (Python 3.14 supported)
* Node.js 22+ (LTS) and npm
* Chromium (for Playwright PDF export)

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start backend development server (defaults to SQLite on port 8000)
./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server (runs on port 3000)
npm run dev
```

### Running Tests & Builds
```bash
# Run all backend & calculation tests
cd backend && pytest -v

# Run all frontend tests
cd frontend && npm test

# Compile production frontend build
cd frontend && npm run build

# Generate deterministic Executive Report PDF artifact
cd frontend && npm run generate:pdf
```

### Pre-Configured Local Development Credentials
* **Consultant**: `consultant@dataeko.ai` / `Consultant123!`
* **Platform Admin**: `admin@dataeko.ai` / `AdminPass123!`

---

## 11. Repository Structure

```text
.
├── backend/
│   ├── alembic/                 # Database migrations (Alembic)
│   ├── app/
│   │   ├── api/                 # API routers (v1 auth, customers, assessments, audit)
│   │   ├── calculation_engine/  # Deterministic headless calculation package
│   │   ├── core/                # Security, RBAC, database, audit, middleware
│   │   ├── models/              # SQLAlchemy async domain entities
│   │   ├── schemas/             # Pydantic v2 DTOs and API contracts
│   │   ├── services/            # Business orchestration services
│   │   ├── config.py            # Application settings
│   │   └── main.py              # FastAPI application entrypoint
│   └── tests/
│       ├── api/                 # Backend integration tests
│       ├── calculation_engine/  # Golden Master and math verification tests
│       └── security/            # Auth, RBAC, IDOR, audit, and sanitizer tests
├── frontend/
│   ├── public/                  # Static assets and icons
│   ├── scripts/                 # Playwright deterministic PDF export scripts
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/          # Intake wizard, dashboard, charts, report components
│   │   ├── data/                # Authoritative Q01–Q22 discovery catalog
│   │   ├── services/            # API client and report data adapter
│   │   ├── test/                # Vitest automated test suite
│   │   └── types/               # TypeScript data models and interfaces
│   └── package.json
└── docs/
    ├── architecture/            # Architecture Decision Records (ADRs)
    ├── artifacts/               # Generated reports and sample PDF artifacts
    ├── business-spec/           # Audited business rules, math specs, Golden Masters
    ├── security/                # Threat model, security architecture, checklists
    └── PHASE_8_COMPLETION_REPORT.md
```

---

## 12. Licensing & Governance

Confidential and proprietary to **DATAEKO.AI** and **meshIQ**. All rights reserved.