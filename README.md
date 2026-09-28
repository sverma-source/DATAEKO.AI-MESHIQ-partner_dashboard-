# DATAEKO × meshIQ Partner Dashboard

> **Enterprise IBM MQ Economic Cost & Efficiency Assessment Platform**  
> Modernizing and standardizing enterprise messaging economic assessments with deterministic calculations, immutable provenance, executive-ready reporting, and consultant-led workflows.

---

## 1. Overview

The **DATAEKO × meshIQ Partner Dashboard** is an enterprise-grade digital platform designed to digitize, modernize, and automate the legacy **IBM MQ Economic Cost & Efficiency Assessment** workflow.

By replacing complex, error-prone spreadsheets with a secure, auditable, and deterministic web application, the platform enables Dataeko consultants and meshIQ specialists to evaluate enterprise messaging environments, quantify operational friction, model controlled improvement scenarios, and deliver audit-grade executive business cases for C-level leadership.

### Key Capabilities
- **Structured Customer Assessment**: 22 standardized intake questions (Q01–Q22) organized into 7 thematic sections.
- **Deterministic Economic Calculation Engine**: Pure Python calculation engine utilizing `Decimal` arithmetic with 10/10 validated Golden Master reference scenarios.
- **Interactive Executive Dashboard**: Real-time KPI summaries, operational effort distribution, and multi-dimensional analysis.
- **Scenario Sandbox**: Dynamic, controlled modeling of operational efficiency improvements and incident reduction.
- **Executive Reporting & PDF Generation**: Deterministic report view and automated headless Chromium PDF generation for boardroom presentation.
- **Consultant Workflow**: Save/resume drafts, exact customer fact overrides, consultant probing guidance, and multi-tenant access control.

---

## 2. Current Project Status

The project is under active development on the **`dev`** branch. Core calculation engine engineering, security hardening, full-stack API integration, and five targeted UX/branding/accessibility refinement batches have been completed and checkpointed:

### Completed Refinements
1. **Batch 1 — Session Isolation** (`1ca1182`):
   - Active customer switching isolation with confirmation dialog.
   - Distinct handling of anonymous draft adoption vs. active customer switching.
   - Comprehensive multi-tenant session isolation safeguards.
2. **Batch 2 — Branding & Accessibility** (`995a3ea`):
   - Official DATAEKO and meshIQ brand assets on Login and Main Shell.
   - Persistent "Powered by DATAEKO.AI" shell attribution.
   - WCAG AA-compliant primary action button contrast treatment (`#008638`).
   - Visual styling alignment between Executive Dashboard, Executive Report, and PDF export.
3. **Batch 3 — Assessment Interaction & State Clarity** (`26846c1`):
   - Save-state lifecycle clarity ("Draft initialized" → "Unsaved changes" → "Progress saved").
   - CustomerModal dialog ergonomics, autofocus, and Esc/backdrop dismiss.
   - QuestionCard layout density, helper text accessibility, and numeric scroll-wheel input safeguards.
   - SectionNavigation responsive keyboard accessibility.
4. **Batch 4 — Calculation & Results Accessibility UX** (`2fe74d7`):
   - Replaced browser `alert()` on calculation failure with accessible in-page error state (`role="alert"`, `aria-live="assertive"`) and explicit "Retry Calculation" flow.
   - Accessible in-progress calculation status feedback (`aria-live="polite"`, `aria-busy="true"`).
   - Removed unused `CalculationStatusView` import from `page.tsx` while keeping canonical dashboard views.
   - Accessible ExecutiveDashboard tabs (`role="tablist"`, `role="tab"`, `role="tabpanel"`, ArrowLeft/ArrowRight/Home/End keyboard navigation).
   - Accessible ScenarioSandbox sliders (`role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, and `#008638` focus rings).
5. **Branding Refinement** (`de43fe9`):
   - Enhanced DATAEKO logo visibility in application header with exact asset scaling.
   - Official DATAEKO wordmark attribution in footer and Executive Report view.
6. **Section Navigation Refinement** (`cdb4114`):
   - Replaced generic "Section A/B/C/D/E/F/G" labels with canonical section titles sourced dynamically from the question catalog (`sec.title`):
     - **A. Environment & Cost Baseline**
     - **B. Troubleshooting Economics**
     - **C. Operational Complexity & Productivity**
     - **D. Business Consequence & Financial Exposure**
     - **E. Cost Reduction & Organizational Pressure**
     - **F. Cybersecurity & Remediation**
     - **G. Economic Inputs & Timing**
   - Preserved responsive horizontal navigation across mobile (`390 × 844`), tablet (`768 × 1024`), and desktop (`1280 × 800`) without page-level horizontal overflow.
   - Maintained full accessibility semantics (`role="tablist"`, `role="tab"`, `aria-current`, visible `#008638` focus rings, keyboard navigation, and descriptive `aria-label`s with completion status).
   - Strict architectural isolation: zero modifications to backend calculation engine, database migrations, REST API contracts, security/auth, or question-catalog semantics.

### Current Checkpoint & Phase
- **Current Git Checkpoint**: `cdb4114` (`feat: show canonical section names in assessment navigation`)
- **Development Branch**: `dev`
- **Validation Status**: All 73 frontend unit/integration tests pass, 102 backend tests pass (10/10 Golden Masters), TypeScript compiles with 0 errors, production build succeeds, and browser QA passed across mobile (`390 × 844`), tablet (`768 × 1024`), and desktop (`1280 × 800`).

> [!IMPORTANT]
> **Pre-Deployment Development Phase**: The application is currently in an active local development and pre-deployment review phase on the `dev` branch. Production deployment is intentionally **deferred**, cloud infrastructure has not yet been provisioned, and all validation remains in local pre-deployment state.

---

## 3. Core Assessment Structure (Q01–Q22)

The discovery model is structured into seven authoritative sections:

| Section | Title | Questions | Focus & Scope |
| :--- | :--- | :--- | :--- |
| **Section A** | Environment & Cost Baseline | Q01–Q05 | Organization scale, industry vertical, queue manager fleet size, weekly administration hours, and team role distribution. |
| **Section B** | Troubleshooting Economics | Q06–Q08 | Incident frequency, labor hours spent per investigation, and average disruption duration. |
| **Section C** | Operational Complexity & Productivity | Q09–Q11 | Dominant incident categories, problem types, and proactive monitoring maturity. |
| **Section D** | Business Consequence & Financial Exposure | Q12–Q15 | Severity tier, business impact classification, annual outage frequency, disruption duration, and financial consequence per downtime hour. |
| **Section E** | Cost Reduction & Organizational Pressure | Q16–Q17 | Configuration management methodology and compliance audit frequency. |
| **Section F** | Cybersecurity & Remediation | Q18–Q19 | Audit preparation effort and security documentation burden. |
| **Section G** | Economic Inputs & Timing | Q20–Q22 | Loaded annual employee cost, customer-reported annual MQ spend, and modernization/migration timelines. |

### Assessment Workflow
1. **Intake & Draft Storage**: Consultants capture responses with autosave (`PUT /api/v1/assessments/{id}/responses`).
2. **Review & Pre-Flight Validation**: Review summary screen validates completeness, highlights missing inputs, and flags customer overrides.
3. **Calculation Execution**: Engine executes upon submission (`POST /api/v1/assessments/{id}/calculate`) and generates an immutable calculation snapshot.
4. **Analysis & Presentation**: View results in the Executive Dashboard, explore what-if scenarios in the Sandbox, and export the Executive PDF Report.

---

## 4. Calculation Model & Provenance

The calculation engine enforces exact mathematical fidelity with validated enterprise specifications:

### Operational Labor & Efficiency Formulas
* **Loaded Hourly Rate**: Derived from Q20 (`Annual Loaded Salary / 2,080 working hours`) using unrounded `Decimal` arithmetic.
* **Annual Administration Effort**: Quantified from weekly administrator hours (Q04) scaled to an annual baseline (`Weekly Admin Hours × 52`).
* **Annual Troubleshooting Effort**: Computed as `Annual Incident Frequency (Q06) × Investigation Hours (Q07)`.
* **Total Operational Labor**: Sum of Annual Administration Cost and Annual Troubleshooting Cost.
* **FTE Labor Burden**: Total operational labor hours divided by 2,080 annual working hours.
* **10% Troubleshooting Productivity Opportunity**: Baseline operational friction recovery potential.
* **25% Investigation Efficiency Scenario**: meshIQ specialized investigation acceleration scenario (decomposed as 50% admin addressability × 50% efficiency + 25% investigation reduction).

### Financial Invariants & Semantic Safeguards
* **Representative Single-Event Exposure ≠ Annual Loss**: Modeled as `Disruption Duration (Q14) × Financial Impact/Hour (Q15)` (using customer override or industry vertical benchmark). Represents the estimated financial exposure of an individual disruption; it is **not** an annualized recurring loss.
* **Illustrative Economic Value ≠ Guaranteed Savings**: Modeled operational improvements reflect illustrative efficiency gains based on industry benchmarks and customer inputs; they do not constitute contractual guarantees.
* **Annual MQ Spend Isolation**: Customer-reported annual MQ spend (Q21) is tracked strictly as an independent contextual baseline and is never added to or conflated with calculated labor costs.
* **Explicit Unknowns**: Missing or uncertain data is preserved as structured unmapped states rather than being silently coerced into zero.

### 5-Tier Provenance Taxonomy
Every metric rendered in the application carries explicit provenance badging:
1. `CUSTOMER_FACT`: Direct customer-provided input or exact numeric override.
2. `BENCHMARK`: Authoritative industry vertical or operational benchmark data.
3. `CALCULATED`: Deterministic output generated by the calculation engine.
4. `SCENARIO`: Dynamic value modeled within the Scenario Sandbox.
5. `DEMO_DATA`: Synthetic data clearly labeled for demonstration purposes.

---

## 5. Technology Stack

### Frontend
- **Framework**: [Next.js 16.3.6](https://nextjs.org/) (App Router, Turbopack)
- **UI Library**: [React 19.2.8](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React 1.48.0](https://lucide.dev/)
- **Unit & Component Testing**: [Vitest 5.0.2](https://vitest.dev/), [React Testing Library 16.3.3](https://testing-library.com/)
- **E2E & PDF Generation**: [Playwright 1.63.0](https://playwright.dev/)

### Backend
- **Framework**: [FastAPI 0.115+](https://fastapi.tiangolo.com/)
- **Runtime**: Python 3.11+ (Python 3.14 fully supported)
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **Data Validation & Settings**: [Pydantic v2](https://docs.pydantic.dev/) & Pydantic Settings
- **ORM & Database**: [SQLAlchemy 2.0 Async](https://www.sqlalchemy.org/), [Alembic](https://alembic.sqlalchemy.org/)
- **Async Database Drivers**: `asyncpg` (PostgreSQL) / `aiosqlite` (Local Development)
- **Testing**: [pytest 9.1+](https://docs.pytest.org/), pytest-asyncio, pytest-cov

### Infrastructure & Deployment
- **Containerization**: Docker & Docker Compose (`docker-compose.prod.yml`)
- **Reverse Proxy & Ingress**: Nginx (reverse proxy, SSL termination, security headers, rate limiting)
- **Database**: PostgreSQL 16
- **CI/CD**: GitHub Actions Multi-Stage Workflow (`.github/workflows/ci.yml`)

---

## 6. Repository Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml                 # 10-stage CI/CD pipeline with release gating & provenance
├── backend/
│   ├── alembic/                   # Database schema migrations
│   ├── app/
│   │   ├── api/                   # REST API routes (auth, customers, assessments, health, audit)
│   │   ├── calculation_engine/    # Standalone deterministic calculation engine
│   │   ├── core/                  # Security, RBAC, database, audit, and middleware
│   │   ├── models/                # SQLAlchemy async domain entities
│   │   ├── schemas/               # Pydantic v2 DTOs and API contracts
│   │   ├── services/              # Business logic and persistence orchestration
│   │   ├── config.py              # Application settings and environment validation
│   │   └── main.py                # FastAPI entrypoint and middleware assembly
│   ├── scripts/
│   │   └── bootstrap_admin.py     # Production platform admin bootstrap utility
│   ├── tests/
│   │   ├── api/                   # REST API and persistence integration tests
│   │   ├── calculation_engine/    # Golden Master and math verification tests
│   │   ├── observability/         # Health probe and logging tests
│   │   └── security/              # Auth, RBAC, IDOR, immutability, and config tests
│   ├── Dockerfile                 # Backend container definition
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── public/                    # Static assets, meshIQ and DATAEKO logos
│   ├── scripts/                   # Playwright PDF export script (generate_pdf.mjs)
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages (login, assessment wizard)
│   │   ├── components/            # Wizard cards, dashboard, charts, navigation, reports
│   │   ├── context/               # React AuthContext and state providers
│   │   ├── data/                  # Authoritative Q01–Q22 discovery catalog
│   │   ├── services/              # API client and deterministic report adapter
│   │   ├── test/                  # Vitest automated test suite (58 unit tests)
│   │   └── types/                 # TypeScript interfaces and data models
│   ├── Dockerfile                 # Next.js standalone container definition
│   └── package.json               # Node.js dependencies and build scripts
├── docs/
│   ├── architecture/              # Architecture Decision Records (ADRs)
│   ├── artifacts/                 # Generated executive report PDF artifacts
│   ├── business-spec/             # Calculation engine specifications & Golden Masters
│   ├── security/                  # Threat models and security verification checklists
│   └── PRODUCTION_DEPLOYMENT_GUIDE.md # Production operator deployment manual
├── nginx/
│   ├── default.conf               # Nginx reverse proxy configuration (HTTP/HTTPS)
│   └── ssl.conf.template          # TLS/SSL template with strict security headers
└── docker-compose.prod.yml        # Multi-container production topology definition
```

---

## 7. Local Development Guide

### Prerequisites
- **Python**: 3.11 or higher (Python 3.14 tested)
- **Node.js**: 20.x or 22.x LTS and npm
- **Docker & Docker Compose**: (Optional, for PostgreSQL / containerized workflow)

### 1. Backend Setup (Local Development)
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (defaults to local SQLite database on port 8000)
PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup (Local Development)
```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start Next.js development server (runs on port 3000)
npm run dev
```

### 3. Verification & Health Probes
- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Base**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **Liveness Probe**: [http://localhost:8000/api/v1/health/live](http://localhost:8000/api/v1/health/live)
- **Readiness Probe**: [http://localhost:8000/api/v1/health/ready](http://localhost:8000/api/v1/health/ready)

### Pre-Configured Development Credentials
When running in `ENVIRONMENT=development`, pre-seeded development accounts are available:
- **Consultant**: `consultant@dataeko.ai` / `Consultant123!`
- **Platform Admin**: `admin@dataeko.ai` / `AdminPass123!`
- **Partner Admin**: `partner@dataeko.ai` / `PartnerPass123!`
- **Customer Admin**: `customer_admin@dataeko.ai` / `CustAdmin123!`
- **Customer User**: `customer_user@dataeko.ai` / `CustUser123!`

---

## 8. Automated Testing & Verification

The test suite validates calculations, API contracts, security boundaries, UI components, and build artifacts:

### Test Execution Commands

```bash
# 1. Run all backend tests (Unit, Integration, Security, Golden Masters)
cd backend
PYTHONPATH=. .venv/bin/pytest tests/ -v

# 2. Run Golden Master reference calculations only
PYTHONPATH=. .venv/bin/pytest tests/calculation_engine/test_golden_masters.py -v

# 3. Run frontend Vitest test suite
cd ../frontend
npm test

# 4. Run TypeScript type check
npx tsc --project tsconfig.json --noEmit

# 5. Compile production frontend build
npm run build

# 6. Generate Executive Report PDF artifact
npm run generate:pdf
```

### Verified Test Summary

```text
================================================================================
                         AUTOMATED TEST SUITE SUMMARY
================================================================================
1. Backend & Calculation Suite (pytest 9.1):
   • 10/10 Golden Master Reference Scenarios (TC-01–TC-10)               PASSED
   • 11/11 Calculation Engine Precision & Boundary Tests                 PASSED
   • 7/7 API Integration & Database Migration Tests                      PASSED
   • 13/13 Observability, Health Probes & Structured Logging Tests       PASSED
   • 61/61 Security Tests (Auth, RBAC, IDOR, Rate Limiter, Bootstrap)    PASSED
   -----------------------------------------------------------------------------
   Total Backend Suite: 102/102 PASSED (100%)

2. Frontend Test Suite (Vitest 5.0):
   • 10/10 Question Catalog & Discovery Tests                            PASSED
   • 5/5 Comprehensive 7-Section Intake Workflow Tests                   PASSED
   • 18/18 Wizard Components & ReviewSummary Accessibility Tests         PASSED
   • 9/9 Executive Dashboard Tabs & Scenario Sandbox Slider Tests        PASSED
   • 7/7 Report Data Adapter & Executive Report Tests                    PASSED
   • 12/12 AuthContext, LoginPage & ProtectedRoute Tests                 PASSED
   • 5/5 API Service Layer Tests                                         PASSED
   • 5/5 Full AssessmentWizardPage Integration Tests                     PASSED
   • 2/2 Executive Report View Component Tests                           PASSED
   -----------------------------------------------------------------------------
   Total Frontend Suite: 73/73 PASSED (11 test files)

3. Automated Browser QA Suite (Playwright Chromium):
   • 39/39 End-to-End QA Assertions across Mobile, Tablet, & Desktop     PASSED
   • Real-browser flow (Review → Error → Retry → Dashboard → Sandbox)    PASSED

4. Static Analysis & Build:
   • TypeScript Static Typecheck (`tsc --noEmit`):                       0 ERRORS
   • Next.js Production Turbopack Build (`next build`):                  PASSED
================================================================================
```

---

## 9. Security Architecture

The platform enforces multi-layered server-side security controls:

- **Stateless JWT Authentication**: Tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies (`access_token`). Password hashing with Bcrypt (cost factor 12).
- **Role-Based Access Control (RBAC)**: Strict permission enforcement across 5 roles (`PLATFORM_ADMIN`, `PARTNER_ADMIN`, `CONSULTANT`, `CUSTOMER_ADMIN`, `CUSTOMER_USER`).
- **Tenant Isolation & Anti-IDOR**: All database queries enforce `tenant_id == current_user.tenant_id`. Cross-tenant requests return `404 Not Found` with zero metadata leakage.
- **Fail-Closed Production Configuration**: Server refuses to start in `ENVIRONMENT=production` if default passwords, weak JWT secrets, or insecure wildcard origins are detected.
- **Trusted Proxy IP Resolution**: Validates upstream proxy IPs against configured CIDR blocks to prevent `X-Forwarded-For` spoofing.
- **Rate Limiting & Abuse Defense**: In-memory sliding-window rate limiter enforcing 5 req/min on `/api/v1/auth/login` and 120 req/min general API throttling.
- **Request Size Limiting**: `RequestSizeLimiterMiddleware` enforces a strict 10MB payload cap (`413 Request Entity Too Large`).
- **Snapshot Immutability**: Persisted calculation snapshots are append-only; update/delete operations are permanently disabled.
- **Audit Logging**: Security-relevant events (authentication, calculations, report generation, admin actions) are logged to the `audit_events` table.
- **Security Headers**: Ingress and application enforce `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Error Sanitization**: Tracebacks and internal exceptions are redacted in responses; client receives clean error messages correlated by `X-Request-ID`.

---

## 10. Production Topology & Architecture

The containerized deployment topology provides network-level isolation between ingress, application, and database tiers:

```text
                                 INTERNET
                                    │
                                    ▼ [HTTPS :443 / HTTP :80]
                    ┌───────────────────────────────┐
                    │      Nginx Reverse Proxy      │
                    │   (SSL, Headers, Rate Limit)  │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼ [meshiq_internal_net]         ▼ [meshiq_internal_net]
        ┌───────────────────────┐       ┌───────────────────────┐
        │   Next.js Frontend    │       │    FastAPI Backend    │
        │   (Port 3000 / Node)  │       │  (Port 8000 / Uvicorn)│
        └───────────────────────┘       └───────────┬───────────┘
                                                    │
                                                    ▼ [meshiq_db_net]
                                        ┌───────────────────────┐
                                        │ PostgreSQL 16 Database│
                                        │      (Port 5432)      │
                                        └───────────────────────┘
```

### Architecture Specifications
- **Ingress Layer**: Nginx terminates TLS/SSL, handles static compression, and proxies `/api/` traffic to FastAPI and all other routes to Next.js.
- **Network Isolation**: PostgreSQL resides on an isolated database network (`meshiq_db_net`) accessible only to the FastAPI backend.
- **Non-Root Execution**: Backend and frontend containers run as dedicated non-root users (`appuser` / `nextjs`).

### Implemented Configuration vs. Operator Dependencies

| Component | Implemented in Repository | Operator / Cloud Infrastructure Dependency |
| :--- | :--- | :--- |
| **Reverse Proxy** | `nginx/default.conf`, `ssl.conf.template` | Public DNS records (A/AAAA) pointing to server |
| **TLS/SSL** | Strict TLS 1.2/1.3 cipher config & templates | Valid CA-signed TLS certificates (e.g. Let's Encrypt) |
| **Application Topology** | `docker-compose.prod.yml` | Container runtime host (Docker / ECS / Kube) |
| **Secrets & Config** | Fail-closed validation logic | Production secret injection via `.env` / secret manager |
| **Database** | SQLAlchemy async schema & Alembic migrations | Managed PostgreSQL (RDS/Cloud SQL) with backups & PITR |
| **Admin Provisioning** | `bootstrap_admin.py` CLI script | Initial execution by system operator |

---

## 11. CI/CD Workflow

The repository includes a comprehensive 10-job multi-stage GitHub Actions pipeline (`.github/workflows/ci.yml`):

1. **`backend-tests`**: Runs full pytest suite across API, engine, and observability.
2. **`golden-masters`**: Strict gate verifying 10/10 reference customer calculation scenarios.
3. **`frontend-tests`**: Runs Vitest component, catalog, and workflow tests.
4. **`frontend-typecheck`**: Strict TypeScript typechecking (`tsc --noEmit`).
5. **`security-prod-config`**: Validates security settings, RBAC, and fail-closed controls.
6. **`frontend-build`**: Compiles standalone Next.js production build.
7. **`docker-build-check`**: Validates multi-service container builds and compose files.
8. **`e2e-browser-suite`**: Full-stack Playwright browser E2E test suite.
9. **`report-pdf-gate`**: Validates headless Chromium PDF generation.
10. **`release-gate`**: Aggregates upstream jobs and enforces release quality standards.

### Release & Publication Sequence
- **Production Artifact Publishing**: Restricted to release tags (`refs/tags/v*`) or manual `workflow_dispatch` on `main`.
- **Image Digest Provenance**: Docker images are built, tagged, pushed, and verified via registry manifest digests with uploaded SHA-256 provenance artifacts.
- **Deployment Webhook**: Fail-closed deployment hook triggered only after all validation gates and image verification pass.

---

## 12. Branding & Enterprise Visual Identity

The dashboard implements the modern **meshIQ visual identity** combined with enterprise **DATAEKO** platform branding:

- **Color Palette**: meshIQ Green (`#00D26A` / `#059669`) action signals, Black/Dark Charcoal (`#0B0F17` / `#111827`) structural surfaces, and clean light neutral cards.
- **Brand Balance**: Official meshIQ and DATAEKO logo assets prominently placed in the application header.
- **High-Density Question Layout**: Streamlined cards prioritizing question text and context while reducing vertical whitespace.
- **Visual Fact Differentiation**: Standardized assessment responses are clearly distinguished from exact customer facts/overrides.
- **Engine Impact Indicators**: Compact information banners indicating baseline context vs. financial multiplier participation.
- **Attribution**: "Powered by DATAEKO.AI" subtle application shell badge.

---

## 13. Important Development Boundaries

To preserve architectural integrity, the following components are **FROZEN** and must not be altered during UI/UX iterations:

- **Calculation Engine**: Math formulas, rounding rules, `Decimal` operations, and lookup tables.
- **Golden Master Tests**: 10 reference scenarios in `tests/calculation_engine/test_golden_masters.py`.
- **Question Semantics**: Q01–Q22 catalog definitions, options, weights, and mappings.
- **Database Schema & Migrations**: Existing database models, relationships, and Alembic versions.
- **Authentication & RBAC**: JWT cookie transport, password hashing, and role permission matrices.
- **Tenant Isolation**: Multi-tenant database query filtering and anti-IDOR checks.
- **CI/CD Pipeline**: GitHub Actions quality gates and release criteria.

---

## 14. Developer Handoff & Synchronization

A new developer joining the project can immediately run the application locally by cloning the repository and following these steps:

1. **Clone Repository & Switch to Development Branch**:
   ```bash
   git clone <repository_url>
   cd DATAEKO.AI-MESHIQ-partner_dashboard-
   git checkout dev
   # Current local checkpoint: cdb4114 (feat: show canonical section names in assessment navigation)
   ```

2. **Start Backend**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   PYTHONPATH=. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

3. **Start Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Verify Health**:
   - Access [http://localhost:3000](http://localhost:3000)
   - Log in using `consultant@dataeko.ai` / `Consultant123!`

---

## 15. Known Deployment Dependencies

Before production release, the following infrastructure dependencies must be provisioned by the infrastructure operator:

1. **Public Domain & DNS**: Route53 / Cloudflare DNS records pointing to the ingress reverse proxy.
2. **TLS/SSL Certificates**: Valid certificates provisioned via Let's Encrypt Certbot or AWS ACM.
3. **Production Secrets**: Securely generated `JWT_SECRET_KEY`, `POSTGRES_PASSWORD`, and `BOOTSTRAP_ADMIN_PASSWORD`.
4. **Managed PostgreSQL Instance**: AWS RDS / Cloud SQL PostgreSQL 16 instance with automated daily snapshots and PITR.
5. **Container Registry**: Authenticated GHCR / ECR repository with published immutable image digests.
6. **Deployment Webhook Target**: Automated listener or orchestration service receiving signed deployment payloads.

---

## 16. Licensing & Governance

Confidential and proprietary to **DATAEKO.AI** and **meshIQ**. All rights reserved.