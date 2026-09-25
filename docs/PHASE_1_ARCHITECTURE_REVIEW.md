# Phase 1 Architecture Review & Human Approval Gate

> **Document Status**: `FINAL ARCHITECTURE REVIEW`  
> **Review Date**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[ARCHITECTURE DECISION REQUIRED]`

---

## 1. Executive Summary

This document concludes **Phase 1 (Enterprise Technical Architecture)** for the **DATAEKO × meshIQ Partner Dashboard**.

We have established a comprehensive, enterprise-grade architecture designed for maximum maintainability, absolute data provenance, strict tenant boundary isolation, and independent testability of business calculations.

> `[CONFIRMED]` **In accordance with Phase 1 constraints, zero application code, frontend components, database tables, or backend services have been built.**
>
> All architectural recommendations and decisions are documented and awaiting stakeholder review and human approval.

---

## 2. Recommended System Architecture

* **Layered Separation**: Presentation (Next.js 14+) → API Security Gateway (FastAPI / Pydantic) → Application Services → Pure Computational Core (Zero-dependency Python package) → Data Persistence (PostgreSQL 16).
* **Decoupled Calculation Engine**: The computational engine is 100% headless and deterministic, enabling independent unit testing with $\ge 95\%$ coverage and Golden Master regression testing before UI construction.
* **6-Tier Provenance Tracking**: Clear differentiation across Customer Facts, Model Assumptions, Industry Benchmarks, Calculated Baselines, Illustrative Scenarios, and Demo Data.
* **Controlled Incomplete States**: Explicit handling of `UNKNOWN`, `NOT_PROVIDED`, and `N/A` answers; zero runtime spreadsheet errors (`#VALUE!`, `#DIV/0!`).
* **Multi-Tenant Data Isolation**: Hybrid tenant scoping via middleware + repository filters + PostgreSQL Row-Level Security (RLS) + anti-IDOR checks.

---

## 3. Technology Choices & Evaluation Summary

| Layer | Recommended Choice | Primary Rationale | Alternative Evaluated | Why Alternative Not Selected |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | **Next.js 14+ (React / TS)** | Rich financial chart ecosystem, SSR for reports, enterprise type safety. | Vite React SPA | Lacks built-in SSR for consistent server-side PDF generation. |
| **Backend** | **Python 3.11+ / FastAPI** | Superior analytical calculation ergonomics, Pydantic typing, auto OpenAPI. | Node.js / NestJS | Weaker numerical / analytical calculation libraries compared to Python. |
| **Database** | **PostgreSQL 16** | Relational integrity, native JSONB for snapshots, Row-Level Security (RLS). | MongoDB | Lacks strict relational constraints needed for tenant and customer ownership. |
| **Persistence** | **SQLAlchemy 2.0 / Alembic** | Mature async ORM, robust migration tracking, type safety. | Tortoise ORM | Less mature ecosystem and smaller community. |
| **Reporting** | **Headless Chromium (Playwright)** | Renders shared React presentation components directly to high-res PDF. | ReportLab | Difficult and expensive to match modern web CSS design aesthetics. |
| **Testing** | **pytest + Playwright** | Parameterized unit tests for math, Golden Masters for regressions, full E2E. | Jest / Cypress | Pytest is faster for Python; Playwright is superior for multi-browser & PDF testing. |

---

## 4. Major Architecture Decision Records (ADRs)

Detailed records created in [`docs/architecture/`](file:///Users/sumit/Desktop/DATAEKO.AI-MESHIQ-partner_dashboard-/docs/architecture):
* **ADR-001**: Frontend Framework Selection (Next.js 14+ / React / TypeScript).
* **ADR-002**: Backend Framework Selection (Python 3.11+ / FastAPI / Pydantic).
* **ADR-003**: Database & Persistence Selection (PostgreSQL 16 / SQLAlchemy 2.0 / Alembic).
* **ADR-004**: Application Architecture Pattern (Modular Monolith).
* **ADR-005**: Decoupled Headless Pure Calculation Engine (`core/calculation_engine`).
* **ADR-006**: Authentication & Multi-Tenant Authorization Strategy (Signed JWT in HTTP-Only Cookies + Anti-IDOR).
* **ADR-007**: Comprehensive Multi-Tier Testing Strategy (Unit + Golden Masters + E2E).

---

## 5. Open Architecture Questions

1. **`OQ-01` (Blocking)**: What are the exact mathematical formulas, weightings, and baseline equations from the legacy IBM MQ workbook?
2. **`OQ-02`**: What verified industry benchmark defaults should be pre-loaded into the system?
3. **`OQ-03`**: What specific efficiency levers are modeled in the business case (MTTR reduction, automation %, etc.)?
4. **`OQ-04`**: Will Customer Users have direct self-service portal access in Phase 1, or is the platform consultant-operated only?
5. **`OQ-05`**: Is multi-currency live/static FX conversion required in Phase 1?
6. **`OQ-06`**: Which identity provider is preferred (Built-in Auth with MFA, Azure AD / Microsoft Entra, Google Workspace SSO, or Okta)?
7. **`OQ-07`**: Is editable PowerPoint (`.pptx`) export required in addition to PDF?

---

## 6. Technical, Security & Data Model Risks

* **Technical**: Mathematical discrepancies with legacy Excel model (Mitigation: Golden Master regression test fixtures).
* **Security**: Cross-tenant data leakage and IDOR attacks (Mitigation: Tenant middleware + RLS + Object-level checks).
* **Data Model**: Premature database schema commitment (Mitigation: Phased implementation; building calculation engine before database models).

---

## 7. Scalability & Deployment Strategy

* **Local Development**: Docker Compose running PostgreSQL, FastAPI backend, and Next.js frontend with hot reload.
* **Production Packaging**: Multi-stage Docker containers with non-root security profiles.
* **Horizontal Scalability**: Stateless API containers behind a load balancer; PostgreSQL with read replicas if assessment volume scales.

---

## 8. 🚪 Human Approval Gate (Decisions Requiring Approval)

Before proceeding to technical implementation, the following decisions require formal human review and approval:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ DECISION ITEMS REQUIRING HUMAN APPROVAL                                │
├────────────────────────────────────────────────────────────────────────┤
│ [ ] 1. Frontend Framework: Next.js 14+ / React / TypeScript            │
│ [ ] 2. Backend Framework: Python 3.11+ / FastAPI / Pydantic            │
│ [ ] 3. Database: PostgreSQL 16 (Relational + JSONB + RLS)              │
│ [ ] 4. Application Pattern: Modular Monolith                           │
│ [ ] 5. Calculation Architecture: Pure Headless Python Module           │
│ [ ] 6. Auth & Security: Signed JWT in HTTP-Only Cookies + RBAC        │
│ [ ] 7. Reporting Engine: Headless Chromium (Playwright) PDF Export     │
│ [ ] 8. Phase 1 Implementation Roadmap & Phasing Sequence               │
└────────────────────────────────────────────────────────────────────────┘
```
