# 17. AI Review and Evaluation Guide

> **Authoritative Scope**: Standard evaluation protocol, mandatory proposal schema, priority ranking system, constraint enforcement for any AI system reading this knowledge base.  
> **Status**: MANDATORY AI OPERATING INSTRUCTIONS

---

## 1. Operating Instructions for AI Agents

When an AI system is asked to review, enhance, debug, or architect features for the **DATAEKO × meshIQ** repository, it **MUST** adhere to the following rules:

1. **Never Invent Features**: Rely strictly on the evidence documented in `docs/ai-context/`. If a feature is not documented, label it `UNKNOWN — REQUIRES VERIFICATION`.
2. **Never Touch Protected Logic**: Treat the calculation engine, Q01–Q22 semantics, Q04 quarterly rule, Decimal math, and Golden Master benchmarks as immutable.
3. **Always Check Role Boundaries**: Verify whether a proposed change impacts `CUSTOMER_USER`, `CONSULTANT`, `CUSTOMER_ADMIN`, `PARTNER_ADMIN`, or `PLATFORM_ADMIN`.
4. **Enforce Tenant Isolation**: Ensure all database queries and endpoints enforce `customer_id` scoping.
5. **Distinguish Facts from Demo Values**: Never treat demo client values (e.g., from `CLIENT_EXPERIENCE.html` or seed scripts) as customer facts.

---

## 2. Priority Classification Framework

All recommendations produced by an AI **MUST** be ranked using this standardized priority model:

* **P0 — Critical Security / Data / Business Risk**:
  * Cross-tenant data leakage, IDOR vulnerabilities, calculation formula corruption, session hijacking risks.
* **P1 — High-Value / Architectural Improvement**:
  * Asynchronous report generation, enterprise SSO integration, token blacklist hardening, test suite gaps.
* **P2 — Important Feature / UX Polish**:
  * Inline validation feedback, multi-assessment trends, skeleton loaders, accessibility improvements.
* **P3 — Nice-to-Have Polish**:
  * Micro-animations, theme toggles, subtle copy improvements, non-blocking telemetry enhancements.

---

## 3. Mandatory Proposal Schema

Every AI recommendation for this repository **MUST** be structured according to the following 14-field specification:

| Field | Description / Requirement |
|:---|:---|
| **1. Recommendation** | Concise title of the proposed change. |
| **2. Problem Statement** | Detailed explanation of the gap, bug, or inefficiency being resolved. |
| **3. Repository Evidence** | Specific file paths, schemas, or tests establishing the current state. |
| **4. Affected Role(s)** | Specific user roles affected (`CUSTOMER_USER`, `CONSULTANT`, etc.). |
| **5. Affected Files / Modules** | Exact file paths requiring modification or creation. |
| **6. Security Impact** | Impact on authentication, authorization, tenant isolation, or data exposure. |
| **7. UX Impact** | Impact on user workflows, layout, responsiveness, or clarity. |
| **8. Data Impact** | Impact on database schemas, migrations, or snapshot records. |
| **9. Business Logic Impact** | Explicit confirmation of whether calculation math is touched. (Must be "None"). |
| **10. Regression Risk** | Likelihood of breaking existing features, tests, or APIs (Low/Medium/High). |
| **11. Protected Area Conflict** | Explicit statement verifying NO conflict with Category A protected areas. |
| **12. Implementation Complexity**| Estimated technical complexity (Low / Medium / High). |
| **13. Priority Level** | Assigned priority rating (`P0`, `P1`, `P2`, `P3`). |
| **14. Suggested Validation Test**| Exact command line test or unit test required to verify the change. |

---

## 4. Standard AI Response Template

When responding to an enhancement prompt, use this template:

```markdown
### [P1] Async Queue for PDF Report Generation

* **Problem**: PDF generation currently runs synchronously inside the FastAPI request thread via Playwright, causing latency spikes under load.
* **Evidence**: `backend/app/services/pdf_service.py` line execution in `backend/app/api/v1/endpoints/calculations.py`.
* **Affected Roles**: `CONSULTANT`, `CUSTOMER_ADMIN`.
* **Affected Modules**: `backend/app/services/pdf_service.py`, `backend/app/tasks/worker.py`.
* **Security Impact**: Neutral.
* **UX Impact**: Eliminates browser timeout errors on slow connections.
* **Data Impact**: Adds task ID tracking to database schema.
* **Business Logic Impact**: NONE. CalculationSnapshot metrics are passed directly to template without modification.
* **Regression Risk**: Low.
* **Protected Area Conflict**: NONE. (Category C task - requires investigation).
* **Priority**: P1.
* **Validation Test**: `PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/services/test_pdf_worker.py`
```
