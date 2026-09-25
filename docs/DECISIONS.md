# Architecture Decision Records (ADRs)

> **Document Status**: `FOUNDATION PHASE 0B`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`

---

## 1. Overview & ADR Protocol

This document maintains the chronological Architecture Decision Records (ADRs) for the DATAEKO × meshIQ Partner Dashboard project. Each ADR captures the context, decision, rationale, and consequences of significant technical and structural decisions.

---

## 2. Decision Log

### ADR-001: Strict Decoupling of Calculation Engine from UI & Presentation
* **Status**: `[CONFIRMED]`
* **Context**: Legacy spreadsheet assessments embed formulas directly inside presentation cells, leading to tight coupling, maintenance nightmares, and untestable business logic.
* **Decision**: Architect the Calculation Engine as a pure, deterministic, headless module that receives normalized inputs and versioned rule parameters and outputs structured metrics.
* **Consequences**: Calculation rules can be unit tested with $\ge 95\%$ coverage, executed across web, CLI, or automated batch pipelines, and easily versioned without touching UI code.

---

### ADR-002: 6-Tier Data Provenance & Anti-Silent Overwrite Standard
* **Status**: `[CONFIRMED]`
* **Context**: Enterprise executive assessments risk legal and credibility fallout if hypothetical model savings or industry benchmarks are conflated with audited customer telemetry.
* **Decision**: Enforce a strict 6-tier taxonomy across the entire platform: Customer Facts, Model Assumptions, Industry Benchmarks, Calculated Results, Illustrative Scenarios, and Example/Demo Data. Customer-provided facts must never be silently overwritten by assumptions.
* **Consequences**: Every metric displayed in the dashboard or exported report carries an explicit provenance trace, ensuring transparency and credibility during executive evaluations.

---

### ADR-003: Controlled Application States for Incomplete Data (No Spreadsheet Errors)
* **Status**: `[CONFIRMED]`
* **Context**: Enterprise respondents frequently do not possess exact metrics during early assessment stages. In spreadsheets, missing data results in `#VALUE!`, `#DIV/0!`, or misleading default zeros.
* **Decision**: The platform natively supports explicit `UNKNOWN`, `NOT_PROVIDED`, and `N/A` intake states. Incomplete calculation inputs transition downstream metrics into graceful, controlled states (`INSUFFICIENT_DATA`, `NOT_MODELED`) with explanatory guidance.
* **Consequences**: Zero raw runtime or arithmetic errors reach end users; consultants receive clear checklists of which missing answers are needed to unlock specific calculated metrics.

---

### ADR-004: Immutable Calculation Snapshots & Append-Only Audit Trail
* **Status**: `[CONFIRMED]`
* **Context**: Customer assessments evolve over multi-week sales cycles. Modifying answers or updating rule engines could silently change historical quotes and presentations without an audit trail.
* **Decision**: All calculation executions generate an immutable `Calculation Snapshot`. All changes to assessment responses, scenario levers, and report exports are logged to an append-only audit trail.
* **Consequences**: Guaranteed reproducibility of any historical report and clear audit accountability for every stakeholder interaction.

---

### ADR-005: 4-Tier Documentation Taxonomy Standard
* **Status**: `[CONFIRMED]`
* **Context**: Building complex enterprise systems requires absolute clarity between validated business rules and temporary engineering inferences.
* **Decision**: Every requirement, entity, rule, and workflow in the documentation repository must be explicitly marked with `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, or `[OPEN QUESTION]`.
* **Consequences**: Eliminates false assumptions, prevents premature implementation of unconfirmed business logic, and establishes a clear backlog of questions for stakeholders.

---

### ADR-006: Dedicated Development Branch & Git Safety Protocol
* **Status**: `[CONFIRMED]`
* **Context**: Direct commits to `main` pose operational risk and compromise release stability.
* **Decision**: All foundation documentation and subsequent feature development are conducted on the `dev` branch. `main` is reserved for verified milestone releases via Pull Requests. No destructive Git operations (force pushing, history rewriting) are permitted.
* **Consequences**: Protects commit history, enables clean peer review, and maintains a secure delivery pipeline.
