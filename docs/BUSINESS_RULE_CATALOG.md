# Business Rule Catalog

> **Document Status**: `VALIDATION PHASE 0C`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`, `[CONFLICT]`, `[MISSING INFORMATION]`

---

## 1. Overview

This catalog enumerates all business, data integrity, calculation, and governance rules documented in the project foundation. Concrete calculation formulas will be populated upon receipt of the official business specification.

---

## 2. Governance & Data Integrity Rules

| Rule ID | Rule Statement | Inputs | Output | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BR-GOV-001** | **No Conflation of Projections with Guarantees**: Modeled savings must be labeled as illustrative projections, never guaranteed contract outcomes. | Scenario levers, Calculated baseline | Disclaimed scenario projections | `BUSINESS_RULES.md` (BR-01) | `[CONFIRMED]` |
| **BR-GOV-002** | **No Presentation of Benchmarks as Customer Facts**: Industry benchmarks used in place of unmeasured metrics must be explicitly badged. | Assessment responses, Benchmark catalog | Badged metric (`[BENCHMARK]`) | `BUSINESS_RULES.md` (BR-02) | `[CONFIRMED]` |
| **BR-GOV-003** | **Anti-Silent Overwrite Policy**: Customer-provided values must never be replaced by default assumptions without explicit dual-layer tracking. | Raw responses, Model assumptions | Distinct customer fact layer vs assumption layer | `BUSINESS_RULES.md` (BR-03) | `[CONFIRMED]` |
| **BR-GOV-004** | **Full Mathematical Traceability**: Every calculated metric must expose its formula code, inputs, data tiers, rule version, and timestamp. | Calculation engine snapshot metadata | Traceable provenance drawer/modal | `BUSINESS_RULES.md` (BR-04) | `[CONFIRMED]` |
| **BR-GOV-005** | **Zero Data Coercion on Missingness**: Blank, missing, or "Unknown" answers must never be converted to zero (`0`) or false defaults. | User intake response | Normalized response status (`UNKNOWN` / `NOT_PROVIDED`) | `ASSESSMENT_QUESTIONS.md` | `[CONFIRMED]` |
| **BR-GOV-006** | **Controlled Calculation States**: Incomplete or invalid inputs must evaluate to structured states (`INSUFFICIENT_DATA`, `CANNOT_CALCULATE`), preventing spreadsheet errors (`#VALUE!`). | Normalized inputs | Metric result wrapper with state & reason | `CALCULATION_RULES.md` | `[CONFIRMED]` |
| **BR-GOV-007** | **Assessment Finalization Immutability**: Locking/finalizing an assessment prevents further edits; revisions require creating a new version. | Assessment status (`LOCKED`) | Read-only enforcement / Branch requirement | `DATA_MODEL.md`, `BUSINESS_PROCESS.md` | `[CONFIRMED]` |
| **BR-GOV-008** | **Recalculation Invalidation Trigger**: Modifying an answer on an already calculated assessment must invalidate existing snapshots or require recalculation. | Response update event | Assessment status reset / Re-calc prompt | `BUSINESS_PROCESS.md` | `[RECOMMENDATION]` |

---

## 3. Data Validation & Boundary Rules

| Rule ID | Rule Statement | Inputs | Output | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BR-VAL-001** | **Non-Negativity Invariant**: Quantities (Queue Managers, FTEs, Incidents, Dollars) must be $\ge 0$. | Numeric input fields | Valid boolean / UI boundary warning | `BUSINESS_RULES.md` (VAL-NON-NEG) | `[CONFIRMED]` |
| **BR-VAL-002** | **Percentage Boundary Invariant**: Efficiency and optimization levers must satisfy $0 \le x \le 100\%$. | Percentage slider / numeric input | Valid boolean / Boundary alert | `BUSINESS_RULES.md` (VAL-PCT-BOUND) | `[CONFIRMED]` |
| **BR-VAL-003** | **Logical Headcount Consistency**: Dedicated MQ Admins cannot exceed Total Infrastructure IT Headcount. | MQ Admin FTEs, Total IT Headcount | Logical consistency validation flag | `BUSINESS_RULES.md` (VAL-LOGIC-01) | `[RECOMMENDATION]` |
| **BR-VAL-004** | **Annual Working Hours Cap**: Annual reported maintenance hours per FTE cannot exceed the physical yearly ceiling (default 2,080 hrs/yr). | Maintenance hours/year, FTE count | Outlier warning flag | `BUSINESS_RULES.md` (VAL-HOURS-MAX) | `[RECOMMENDATION]` |
| **BR-VAL-005** | **Incident Hierarchy Invariant**: Critical / P1 incidents cannot exceed Total Reported Incidents. | P1 Incidents, Total Incidents | Hard validation error | `BUSINESS_RULES.md` (VAL-INCIDENT-01) | `[CONFIRMED]` |

---

## 4. Calculation Rules (Domain Placeholders Pending Official Specification)

> **CRITICAL ARCHITECTURAL NOTICE**: Exact mathematical formulas, coefficients, and weightings are **not established by the current source material**. The rules below represent conceptual domain placeholders.

| Rule ID | Rule Concept | Conceptual Inputs | Conceptual Output | Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BR-CALC-001** | **MQ Operational Labor Cost** | Dedicated FTEs, Blended Hourly Rate, Working Hours/Year | Annual Operational Labor Cost ($) | `CALCULATION_RULES.md` | `[INFERENCE]` — Needs Spec Formula |
| **BR-CALC-002** | **Incident & Outage Risk Cost** | P1/P2 Incident Count, MTTR (hrs), Hourly Downtime Cost ($/hr) | Annual Outage Downtime Exposure ($) | `CALCULATION_RULES.md` | `[INFERENCE]` — Needs Spec Formula |
| **BR-CALC-003** | **Message Problem Triage Overhead** | Stuck message occurrences, Diagnostic hours/incident, Admin Rate | Annual Message Triage Overhead ($) | `CALCULATION_RULES.md` | `[INFERENCE]` — Needs Spec Formula |
| **BR-CALC-004** | **meshIQ Projected Labor Savings** | Baseline Labor Cost, Queue Automation Lever (%), Triage Efficiency (%) | Projected Annual Labor Savings ($) | `CALCULATION_RULES.md` | `[INFERENCE]` — Needs Spec Formula |
| **BR-CALC-005** | **meshIQ Downtime Reduction Benefit** | Baseline Outage Cost, MTTR Reduction Lever (%) | Projected Outage Risk Reduction ($) | `CALCULATION_RULES.md` | `[INFERENCE]` — Needs Spec Formula |
| **BR-CALC-006** | **Net Economic Value & Payback Horizon** | Total Projected Savings ($), meshIQ Subscription / Implementation Cost ($) | Net Annual Benefit ($), ROI (%), Payback Period (Months) | `CALCULATION_RULES.md` | `[INFERENCE]` — Needs Spec Formula |
