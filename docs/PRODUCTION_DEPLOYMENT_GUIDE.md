# DATAEKO × meshIQ Partner Dashboard — Production Deployment Guide

**Document Version**: 2.2.0  
**Phase**: Phase 10.4.2 — Production CI/CD Pipeline & Ingress Hardening Remediation  
**Target Architecture**: Hardened Containerized Application (FastAPI + Next.js + PostgreSQL 16 + Nginx Ingress)  

---

## 1. Production Architecture & Topology

The production deployment employs an enterprise same-origin reverse proxy ingress topology. All client browser requests flow over HTTPS to a hardened Ingress / Reverse Proxy (Nginx or Cloud Load Balancer) that performs TLS termination, enforces security headers, and routes traffic cleanly based on path prefixes:

```text
Browser (Client)
      |
      | HTTPS (Port 443 / TLS 1.2+ with HSTS)
      v
Ingress / Reverse Proxy (Nginx / ALB)
      |
      +-----------------------------------------+
      | (Path: /)                               | (Path: /api/v1/*)
      v                                         v
Next.js Frontend Service                  FastAPI Backend Service
(Internal: meshiq_prod_network:3000)      (Internal: meshiq_prod_network:8000)
                                                |
                                                | asyncpg (TCP 5432)
                                                v
                                          PostgreSQL 16 Database
                                          (Internal: meshiq_prod_network:5432)
```

### Key Architectural Invariants
1. **Same-Origin API Routing**: Client browser traffic connects to a single domain (e.g. `https://partner.meshiq.com`). The frontend requests the backend using relative path `/api/v1` without cross-origin complexity or hardcoded hostnames.
2. **Zero Public Database/App Exposure**: Neither the PostgreSQL database (`5432`), the FastAPI backend (`8000`), nor the Next.js server (`3000`) publish ports to the public host interface. All inter-service communication is confined to the private Docker bridge network (`meshiq_prod_network`).
3. **Fail-Closed Security**: Missing production secrets, insecure cookies, wildcard CORS, or untrusted proxies prevent application startup.
4. **Zero Automatic Data/Credential Mutation**: Startup does not alter the schema or seed credentials in production mode.

---

## 2. Ingress & Reverse Proxy Configuration

The repository provides production-ready Nginx configurations under the `nginx/` directory:

| File | Purpose | Notes |
| :--- | :--- | :--- |
| `nginx/default.conf` | Plain HTTP reverse proxy configuration | Used behind an external TLS terminator (e.g. AWS ALB, Cloudflare, Traefik). |
| `nginx/ssl.conf.template` | Full HTTPS/TLS termination template | Modern ciphers, TLS 1.2/1.3, HTTP-to-HTTPS redirect, HSTS header. |

### Header Forwarding & Proxy Invariants
The reverse proxy forwards essential headers required for backend audit logs, request tracing, and client IP extraction:
* `Host $host`: Preserves incoming host header.
* `X-Real-IP $remote_addr`: Forwarded client IP address.
* `X-Forwarded-For $proxy_add_x_forwarded_for`: Appends client and intermediary proxy IPs.
* `X-Forwarded-Proto https` (or `$scheme`): Informs FastAPI that client connected via HTTPS.
* `X-Request-ID $req_id`: Assigns or preserves end-to-end correlation ID for distributed logging.
* `client_max_body_size 10M`: Enforces payload limits at proxy layer matching backend `MAX_REQUEST_BODY_BYTES`.
* `proxy_buffering off`: Ensures immediate streaming for calculations and downloads.

---

## 3. Same-Origin Routing & Cookie Security

### Frontend API URL Resolution
In `frontend/src/services/api.ts`, API endpoint resolution is governed by `getApiBaseUrl()`:
* **Production Mode (`NODE_ENV === "production"`)**: Defaults to same-origin relative path `"/api/v1"`.
* **Development/Test Mode (`NODE_ENV !== "production"`)**: Defaults to `"http://localhost:8000/api/v1"`.
* **Explicit Override (`NEXT_PUBLIC_API_URL`)**: If specified, trims trailing slashes and overrides default.

### Cookie Security & HTTPS
Because frontend and backend share the exact same origin under Nginx:
* Cookies are set with `Secure; HttpOnly; SameSite=Strict`.
* Strict SameSite protection prevents CSRF attacks.
* `credentials: "include"` in fetch requests seamlessly passes session cookies without CORS preflight blocks.
* **Important**: Over plain HTTP in production, `SECURE_COOKIES=true` causes browsers to drop session cookies. HTTPS is strictly required.

---

## 4. Trusted Proxy Configuration

To prevent client IP spoofing in audit logs and rate-limiting buckets, the FastAPI backend only honors `X-Forwarded-For` headers from trusted proxy IP ranges configured via `TRUSTED_PROXY_IPS`:

```ini
# Example: Trust internal Docker bridge subnet and load balancer IP
TRUSTED_PROXY_IPS=["127.0.0.1", "172.16.0.0/12", "10.0.0.0/8"]
```

* Untrusted clients attempting to forge `X-Forwarded-For` will be identified by their direct TCP peer IP.
* Malformed CIDRs, invalid IP strings, or overly permissive wildcards will fail closed during backend startup.

---

## 5. Production Database Migrations

Database schema migrations are decoupled from application startup.

### Executing Migrations with Alembic
Before starting the backend containers:

```bash
# In backend container or release task
cd backend
alembic upgrade head
```

### Migration History
* `0001_initial_schema`: Relational schema (tenants, users, audit_events, customers, assessments, assessment_responses, calculation_snapshots).
* `0002_calc_snapshots_idx`: Composite index `(assessment_id, created_at DESC)` for calculation snapshots.

---

## 6. Initial Administrative Bootstrap CLI

Initial platform administrators are created using the standalone CLI script `backend/scripts/bootstrap_admin.py`.

### Interactive Mode (Recommended for Operators)
Prompts for password securely without terminal echo:
```bash
PYTHONPATH=backend python3 backend/scripts/bootstrap_admin.py \
    --email admin@enterprise.com \
    --full-name "Platform Administrator" \
    --role PLATFORM_ADMIN
```

### Automated Non-Interactive Mode (CI / Infrastructure as Code)
Passes password via environment variable:
```bash
BOOTSTRAP_ADMIN_PASSWORD="StrongEnterprisePassword2026!#" \
PYTHONPATH=backend python3 backend/scripts/bootstrap_admin.py \
    --email admin@enterprise.com \
    --full-name "Platform Administrator" \
    --role PLATFORM_ADMIN \
    --non-interactive
```

---

## 7. Database Connection Pool Configuration

SQLAlchemy async connection pool settings are externalized:

| Variable | Default | Valid Range | Operational Guidance |
| :--- | :---: | :---: | :--- |
| `DB_POOL_SIZE` | `5` | `1 – 100` | Steady-state connection count. Sized according to backend replica count vs PostgreSQL `max_connections`. |
| `DB_MAX_OVERFLOW` | `10` | `0 – 100` | Additional burst connection headroom. |
| `DB_POOL_TIMEOUT` | `30` | `1 – 300` | Connection acquisition timeout in seconds before throwing an error. |

---

## 8. Health & Readiness Probes

The backend provides two distinct endpoints for health monitoring:

| Endpoint | Purpose | Intended Probe | Fail Condition |
| :--- | :--- | :--- | :--- |
| `/api/v1/health/live` | Process liveness probe | Ingress / K8s Liveness Probe | Returns `500` if the process is unresponsive. |
| `/api/v1/health/ready` | Operational readiness probe | Ingress / Load Balancer Target Health | Executes `SELECT 1` on PostgreSQL. Returns `503` if DB is unavailable. |

---

## 9. Production Runbook (Step-by-Step Launch)

### Step 1: Prepare Environment File (`.env.production`)
Create a secure production environment file on the target host (never commit to Git):

```ini
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql+asyncpg://meshiq_user:YOUR_STRONG_DB_PASSWORD@db:5432/meshiq
POSTGRES_DB=meshiq
POSTGRES_USER=meshiq_user
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD
JWT_SECRET=YOUR_SECURE_RANDOM_SECRET_KEY_MINIMUM_32_CHARS
CORS_ORIGINS=["https://partner.meshiq.com"]
SECURE_COOKIES=true
COOKIE_SAMESITE=strict
TRUSTED_PROXY_IPS=["127.0.0.1","172.16.0.0/12","10.0.0.0/8"]
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
```

### Step 2: Launch Database & Execute Migrations
```bash
# Start PostgreSQL container
docker compose -f docker-compose.prod.yml up -d db

# Wait for DB healthy status, then run Alembic migrations
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

### Step 3: Bootstrap Administrator User
```bash
docker compose -f docker-compose.prod.yml run --rm backend \
  python3 scripts/bootstrap_admin.py \
    --email admin@meshiq.com \
    --full-name "meshIQ Administrator" \
    --role PLATFORM_ADMIN
```

### Step 4: Start Ingress, Frontend & Backend
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Step 5: Verify Deployment
```bash
# Verify all containers healthy
docker compose -f docker-compose.prod.yml ps

# Check readiness endpoint via Ingress
curl -fsSL http://localhost/api/v1/health/ready
```

---

## 10. Repository Configuration vs Deployment-Operator Parameters

To maintain strict boundaries, repository configurations are cleanly separated from infrastructure parameters:

### Implemented in Repository
* Nginx reverse proxy configuration (`nginx/default.conf` and `nginx/ssl.conf.template`).
* Hardened production compose topology (`docker-compose.prod.yml`).
* Frontend same-origin relative API path resolution (`frontend/src/services/api.ts`).
* Backend fail-closed startup validation, trusted proxy verification, and database connection pooling.
* Multi-stage non-root Dockerfiles for frontend (`1001:nextjs`) and backend (`10001:appuser`).
* Database migration suite and operator bootstrap utility.
* Automated CI/CD pipeline with 10 quality gates, immutable action pinning, auditable build provenance, and fail-closed image publication.

### Deployment-Operator Parameters (Must be Supplied by Operator)
1. **Domain Name & DNS**: Domain registration and DNS A/CNAME records (e.g. `partner.meshiq.com`).
2. **TLS / SSL Certificates**: Valid PEM-encoded certificate chain and private key mounted at `/etc/nginx/certs/`.
3. **Production Secrets**: Strong cryptographically random `JWT_SECRET` (>= 32 chars) and PostgreSQL passwords.
4. **Trusted Proxy Subnets**: Actual CIDR blocks or IP addresses of upstream load balancers / cloud gateways.
5. **Worker Count & Sizing**: Uvicorn worker process count tuned for host CPU/RAM capabilities.
6. **Backup Infrastructure**: PostgreSQL automated snapshot, WAL archiving, and disaster recovery strategy.
7. **Container Registry Secrets**: `REGISTRY_SERVER`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD` configured in CI secret store.
8. **Deployment Webhook**: `DEPLOY_WEBHOOK_URL` configured in CI secret store for automated deployment dispatch.

---

## 11. Production CI/CD Pipeline & Release Lifecycle

The CI/CD workflow defined in `.github/workflows/ci.yml` enforces automated quality, security, and release gates:

### Pipeline Stages

```text
Pull Request / Branch Push
  │
  ├── 1. backend-tests (102 tests)
  ├── 2. golden-masters (10 strict calculations)
  ├── 3. frontend-tests (58 Vitest tests)
  ├── 4. frontend-typecheck (tsc)
  ├── 5. security-prod-config (Fail-closed guards)
  ├── 6. frontend-build (Standalone Next.js)
  ├── 7. docker-build-check (dev & prod compose validation)
  ├── 8. e2e-browser-suite (Playwright real-stack)
  └── 9. report-pdf-gate (Deterministic PDF validation)
  │
  ▼
10. Consolidated Quality Release Gate
  │
  ▼
11. Build Provenance & Metadata Packaging (build-metadata.json)
  │
  ▼ (Only on release tags 'v*' or explicit workflow_dispatch on main)
12. Publish Production Images (Fail-closed registry validation, immutable tags, image-provenance.json)
  │
  ▼ (Only on release tags 'v*' or explicit deploy dispatch on main)
13. Production Deployment Hook (Provider-neutral configuration diagnostics & webhook dispatch)
```

### Immutable Action Pinning
All third-party GitHub Actions are pinned to full 40-character commit SHAs (e.g. `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`) with version comments to eliminate supply-chain tampering.

### Fail-Closed Publication & Ref Authorization Policy
* **Authorized Release Refs**: Production container image publishing and deployment are strictly restricted to Git release tags (`refs/tags/v*`) and the `main` branch. Attempts to publish from feature or dev branches fail closed immediately.
* **Fail-Closed Registry Audit**: If publication is requested without `REGISTRY_SERVER`, `REGISTRY_USERNAME`, or `REGISTRY_PASSWORD`, the job fails with exit code 1. It never produces an ambiguous dry-run success.
* **Image Provenance**: Upon successful container push, `image-provenance.json` records verified remote registry manifest digests (`^sha256:[0-9a-f]{64}$`), commit SHAs, and release tags as an artifact.
