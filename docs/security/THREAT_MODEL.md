# THREAT MODEL — DATAEKO × meshIQ PARTNER DASHBOARD

**Document Version**: 1.0  
**Phase**: Phase 8 — Production Readiness, Security, Identity & Multi-Tenant Hardening  
**Date**: September 25, 2026  
**Status**: APPROVED & IMPLEMENTED  

---

## 1. OBJECTIVE & SCOPE

The purpose of this Threat Model is to identify security assets, threat actors, trust boundaries, attack vectors, and defense-in-depth mitigations for the **DATAEKO × meshIQ Partner Dashboard** platform.

This model specifically addresses the multi-tenant SaaS environment where proprietary customer messaging configurations, sensitive operational financials (loaded labor rates, downtime consequences, annual MQ licensing spend), and deterministic economic calculation snapshots must be isolated and protected.

---

## 2. ACTORS & IDENTITY PERSONAS

| Actor / Persona | Role Definition | Trust Level | Implemented Status |
| :--- | :--- | :--- | :--- |
| **Unauthenticated Internet User** | Any anonymous request hitting public HTTP endpoints. | Zero Trust (Untrusted) | Implemented (Blocked from all resource endpoints) |
| **Customer User** | Operational staff from an enterprise customer completing Q01–Q22 assessments. | Authenticated (Tenant Isolated) | Implemented |
| **Customer Admin** | Customer leadership managing tenant users and viewing executive reports. | Authenticated (Tenant Admin) | Implemented |
| **Consultant** | DATAEKO / meshIQ engagement specialist managing multiple customer assessments and auditing snapshots. | Authenticated (Multi-Tenant Consultant) | Implemented |
| **Partner Admin** | Lead consultant / practice manager managing customer engagements and tenant policies. | Authenticated (Partner Admin) | Implemented |
| **Platform Admin** | Platform engineering / DevOps superuser managing global system configuration and tenant lifecycle. | High Trust (System Admin) | Implemented |
| **Backend Worker / System Process** | Internal asynchronous task runner (e.g. headless PDF export, scheduled audit reconciliation). | Machine Trust | Implemented |

---

## 3. PRIMARY ASSETS & SENSITIVITY CLASSIFICATION

| Asset | Description | Sensitivity | Protection Requirement |
| :--- | :--- | :--- | :--- |
| **Customer Financial Inputs** | Q15 (Financial impact/hr), Q20 (Loaded labor rate), Q21 (Annual MQ spend). | **HIGH (Confidential)** | Strict tenant isolation, anti-IDOR, encrypted in transit, never logged in plain text. |
| **Assessment Responses** | 22-question discovery responses detailing estate scale, tech debt, staffing, and friction. | **HIGH (Confidential)** | Tenant boundary isolation, object-level authorization, validation constraints. |
| **Calculation Snapshots** | Immutable mathematical outputs from Phase 3 Headless Engine. | **HIGH (Confidential)** | Append-only / immutable, tenant isolated, tamper-evident. |
| **Executive Reports & PDFs** | Formal executive deliverables containing economic baselines and scenario values. | **HIGH (Confidential)** | Authorized generation/download, ephemeral server handling, no predictable URLs. |
| **User Credentials & Sessions** | Passwords (bcrypt hashed), JWT session tokens, refresh tokens. | **CRITICAL** | Bcrypt (cost 12), HTTP-only Secure SameSite=Strict cookies, secret rotation. |
| **Audit Log Trail** | Record of all state transitions, logins, calculations, and report generation events. | **HIGH (Compliance)** | Append-only, immutable, tenant-bound, zero user-level modification. |
| **Calculation Rules & Constants** | Phase 3 business rules, ITIC benchmarks, standard 2,080h denominator. | **MEDIUM (Proprietary)** | Versioned code repository, deterministic runtime enforcement. |

---

## 4. TRUST BOUNDARIES & ARCHITECTURE DATA FLOW

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Trust Boundary 0: Public Internet]                                             │
│  User Browser (Next.js SPA)                                                     │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ HTTPS / TLS 1.3
                                         │ Cookie: access_token (HTTP-only, SameSite=Strict)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Trust Boundary 1: Application Gateway & Security Middleware]                   │
│  FastAPI Security Headers Middleware (CSP, HSTS, X-Frame, X-Content-Type)       │
│  CORS Middleware (Explicit Trusted Origins, Credentials Restricted)             │
│  Exception Sanitizer (Zero Traceback or SQL Disclosure)                         │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Validated & Sanitized Request
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Trust Boundary 2: Identity, Authentication & RBAC Layer]                       │
│  JWT Verification (Secret Key, Expiry, Signature)                               │
│  Tenant Context Resolver (User-Bound Tenant ID, Anti-IDOR Enforcement)         │
│  Permission Gate (Role-Based Action Verification)                               │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Authorized & Tenant-Scoped Context
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Trust Boundary 3: Domain Services & Deterministic Calculation Engine]          │
│  Assessment Service / Calculation Service / Audit Service                       │
│  Phase 3 Deterministic Engine (Pure In-Memory Python / Decimal)                 │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Parameterized Queries (Asyncpg / SQLAlchemy)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Trust Boundary 4: Data Persistence Layer]                                      │
│  PostgreSQL (Multi-Tenant FK Isolation, Immutable Snapshots, Append-Only Audit) │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. THREAT CATEGORIES, ATTACK SURFACES & MITIGATIONS

| Threat / Vulnerability | Attack Surface | Impact | Mitigation Strategy | Implemented Status |
| :--- | :--- | :--- | :--- | :--- |
| **Cross-Tenant Access (Multi-Tenant Breach)** | REST API endpoints (`/customers`, `/assessments`, `/snapshots`) | Critical: Tenant A accesses Tenant B's confidential financials. | Server-side tenant scoping bound to JWT claims; client `X-Tenant-ID` header ignored for standard tenants. | **IMPLEMENTED & TESTED** |
| **Insecure Direct Object Reference (IDOR)** | Direct UUID guessing in `/assessments/{id}`, `/snapshots/{id}` | High: Unauthorized access to specific assessment records. | Object-level authorization verifying resource tenant ownership before returning data (returns 404/403). | **IMPLEMENTED & TESTED** |
| **Snapshot Tampering / Metric Mutation** | API manipulation of completed calculation snapshots | High: Falsification of official baseline results. | Snapshots are strictly immutable; no `PUT`/`PATCH` endpoints exist; engine output saved once per run. | **IMPLEMENTED & TESTED** |
| **Scenario Mutation of Official Baseline** | Scenario sandbox manipulating persisted responses | High: Sandbox sliders altering official customer facts. | Scenario calculations execute in-memory or return transient projections; never mutate persisted DB responses. | **IMPLEMENTED & TESTED** |
| **Session Theft / Credential Leakage** | Browser localStorage / XSS token exfiltration | Critical: Hijacked user account. | Authentication tokens stored exclusively in `HTTP-only`, `Secure`, `SameSite=Strict` cookies. | **IMPLEMENTED & TESTED** |
| **Cross-Site Request Forgery (CSRF)** | State-changing POST/PUT requests from malicious origins | High: Unauthorized assessment submission. | `SameSite=Strict` cookie enforcement combined with explicit CORS origin whitelisting. | **IMPLEMENTED & TESTED** |
| **Sensitive Error Disclosure** | Unhandled exceptions in FastAPI backend | Medium: Leaks database schemas, SQL statements, file paths. | Global exception handlers intercept all uncaught errors, logging tracebacks server-side and returning clean JSON. | **IMPLEMENTED & TESTED** |
| **Audit Log Tampering / Repudiation** | User deleting or modifying calculation audit events | Medium: Loss of compliance and non-repudiation. | Audit table is strictly append-only; no update or delete routes exist. | **IMPLEMENTED & TESTED** |
| **Financial Parameter Injection** | Negative or malformed inputs in Q15, Q20, Q21 | Medium: Engine crash or skewed financial calculations. | Pydantic v2 schemas enforce strict non-negative bounds and numeric type constraints. | **IMPLEMENTED & TESTED** |
| **PDF Path Traversal / Arbitrary File Access** | Report export generation scripts | High: Server filesystem compromise. | Report generator operates on in-memory HTML strings rendered to fixed, sanitized output paths. | **IMPLEMENTED & TESTED** |

---

## 6. VERIFICATION & VALIDATION SUMMARY

All threat mitigations are validated via automated tests in:
* `backend/tests/security/test_authentication.py`
* `backend/tests/security/test_authorization_and_rbac.py`
* `backend/tests/security/test_tenant_isolation_and_idor.py`
* `backend/tests/security/test_snapshot_immutability.py`
* `backend/tests/security/test_scenario_isolation.py`
* `backend/tests/security/test_audit_logging.py`
* `backend/tests/security/test_error_sanitization.py`
