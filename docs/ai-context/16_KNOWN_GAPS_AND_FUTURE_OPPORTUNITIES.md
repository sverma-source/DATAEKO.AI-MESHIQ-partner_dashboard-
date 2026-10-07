# 16. Known Gaps and Future Roadmap Opportunities

> **Authoritative Scope**: Explicit categorization of missing functionality, planned enhancements, architectural gaps, and future roadmap possibilities based on repository evidence.  
> **Status**: ROADMAP & ANALYSIS

---

## 1. Classification Methodology

To prevent speculative drift, all opportunities are classified into four strict categories:
1. **KNOWN GAP**: Functionality that is partially implemented or missing a critical edge-case defense.
2. **FUTURE / PLANNED**: Documented architectural enhancements slated for subsequent phases.
3. **POTENTIAL OPPORTUNITY**: Architectural or UX improvements supported by repository structure.
4. **UNKNOWN / REQUIRES DECISION**: Strategic questions requiring stakeholder alignment.

---

## 2. Categorized Gaps & Enhancement Opportunities

### 2.1 Security & Authentication
* **KNOWN GAP (P1)**: Lack of Redis-backed distributed token blacklist. (Currently mitigated by database `auth_version` check on each request).
* **FUTURE / PLANNED (P1)**: SAML 2.0 / OpenID Connect Enterprise SSO integration for large banking clients.
* **POTENTIAL OPPORTUNITY (P2)**: Implementation of automated Webhook alerting for suspicious authentication failures.
* **UNKNOWN / REQUIRES DECISION**: Decision on magic-link passwordless login vs. traditional password resets.

### 2.2 Client User Experience (UX)
* **FUTURE / PLANNED (P2)**: Multi-contributor assessment collaboration (allowing multiple client users to complete different sections concurrently).
* **POTENTIAL OPPORTUNITY (P2)**: Real-time inline field validation feedback before clicking "Next Section".
* **POTENTIAL OPPORTUNITY (P3)**: Assessment progress bar displaying estimated completion time remaining.

### 2.3 Consultant & Executive Reporting
* **FUTURE / PLANNED (P1)**: Multi-assessment historical comparison & trend analysis across quarterly intake cycles.
* **POTENTIAL OPPORTUNITY (P2)**: Custom scenario parameter tuning (e.g., custom client hourly wage rates in the sandbox).
* **POTENTIAL OPPORTUNITY (P2)**: Automated PDF delivery scheduling to client stakeholders upon assessment finalization.

### 2.4 Data Architecture & Scalability
* **KNOWN GAP (P2)**: Direct Playwright PDF generation executes inside the API worker process. (Should be offloaded to an asynchronous task worker queue like Celery / ARQ for high-volume deployments).
* **FUTURE / PLANNED (P2)**: Migration from SQLite (local dev) to managed AWS RDS PostgreSQL with Read Replicas.
* **POTENTIAL OPPORTUNITY (P3)**: Database query read-through caching for immutable CalculationSnapshots.

### 2.5 Observability & Operations
* **KNOWN GAP (P2)**: Centralized OpenTelemetry tracing across Next.js and FastAPI services.
* **POTENTIAL OPPORTUNITY (P2)**: Structured JSON logging with correlation IDs propagated to Datadog / Grafana Loki.
* **POTENTIAL OPPORTUNITY (P3)**: Healthcheck endpoint expansion with database connection pool metrics.

---

## 3. Prioritization Matrix

| Domain | Enhancement Item | Category | Priority | Protected Impact |
|:---|:---|:---|:---|:---|
| **Security** | Redis Distributed Token Revocation | Known Gap | **P1** | None (Security Layer) |
| **Reporting** | Asynchronous Worker Queue for PDF Generation | Known Gap | **P1** | None (Infrastructure) |
| **Auth** | Enterprise SSO (SAML/OIDC) | Planned | **P1** | None (Auth Layer) |
| **Consultant**| Multi-Assessment Trend Comparison | Planned | **P2** | None (Aggregator Layer) |
| **Client UX** | Inline Field Validation Warnings | Opportunity | **P2** | None (Presentation) |
| **Client UX** | Multi-Contributor Section Locking | Planned | **P2** | Requires DB Review |
| **Observability**| OpenTelemetry Distributed Tracing | Opportunity | **P2** | None (Middleware) |
