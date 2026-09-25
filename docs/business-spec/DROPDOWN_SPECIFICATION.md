# Dropdown & Controlled Response Specifications

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION (AUDITED & RECONCILED)`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx (Dropdown Lists Sheet)`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`, `[SOURCE INCONSISTENCY]`

---

## 1. Structure Overview

This document catalogs every controlled dropdown list across the 7 authoritative discovery sections (Sections A through G), documenting exact option text, numeric conversion mappings, and calculation roles.

---

## 2. Dropdown Lists & Calculation Mappings

### 2.1 Section A: Environment & Cost Baseline (Q01–Q05)

#### Q01: Queue Manager Estate Scale
* `1–10`, `11–25`, `26–50`, `51–100`, `101–250`, `251–500`, `500+`, `Not sure`
* *Numeric Override Allowed*: Yes (Integer).
* *Feeds Calculation?*: No (Contextual Scale Baseline).

#### Q02: Staffing & Administration Resources
* `1–2`, `3–5`, `6–10`, `11–20`, `20+`, `Not sure`
* *Numeric Override Allowed*: Yes.
* *Feeds Calculation?*: No (Contextual Headcount Baseline).

#### Q03: Staffing & Operational Model
* `Centralized dedicated MQ team`, `Shared middleware / platform team`, `Application teams manage their own MQ`, `Outsourced / Managed service provider`, `Hybrid model`, `Not sure`
* *Feeds Calculation?*: No (Contextual Segmentation).

#### Q04: Quarterly Administration Hours
* `Less than 40 hours`, `40–100 hours`, `101–250 hours`, `251–500 hours`, `500+ hours`, `Not sure`
* *Numeric Override Allowed*: Yes (Exact Hours).
* *Feeds Calculation?*: **YES** ($H_{admin} = \text{Q04} \times 4$).

#### Q05: Retired Infrastructure & Technical Debt
* `Yes, significant technical debt`, `Yes, a few known instances`, `No, active estate only`, `Not sure`
* *Feeds Calculation?*: No (Qualitative Finding).

---

### 2.2 Section B: Troubleshooting Economics (Q06–Q08)

#### Q06: Troubleshooting & Event Frequency
`[CONFIRMED]` The exact annual multiplier lookup matrix:

| Dropdown Option Text | Annual Event Multiplier ($N_{events}$) | Calculation Status |
| :--- | :---: | :--- |
| `Multiple times per week` | **104** | `[CONFIRMED]` ($2 \times 52$) |
| `About weekly` | **52** | `[CONFIRMED]` ($1 \times 52$) |
| `Multiple times per month` | **30** | `[CONFIRMED]` ($2.5 \times 12$) |
| `About monthly` | **12** | `[CONFIRMED]` ($1 \times 12$) |
| `About quarterly` | **4** | `[CONFIRMED]` ($1 \times 4$) |
| `Less than quarterly` | **2** | `[CONFIRMED]` ($0.5 \times 4$) |
| `Rarely or never` | **0** | `[CONFIRMED]` |
| `Not sure` | `NOT_MODELED` | `[CONFIRMED]` (Insufficient Data) |

#### Q07: Staff Hours Expended Per Investigation (Staff Effort)
`[CONFIRMED]` The exact hours per investigation lookup matrix:

| Dropdown Option Text | Representative Hours ($H_{inv}$) | Calculation Status |
| :--- | :---: | :--- |
| `Less than 1 hour` | **0.5** | `[CONFIRMED]` Exact formula mapping |
| `1–2 hours` | **1.5** | `[CONFIRMED]` Exact formula mapping |
| `3–5 hours` | **4.0** | `[CONFIRMED]` Exact formula mapping |
| `6–10 hours` | **8.0** | `[CONFIRMED]` Exact formula mapping |
| `11–20 hours` | **15.5** | `[CONFIRMED]` Exact formula mapping |
| `More than 20 hours` | **24.0** | `[CONFIRMED]` Exact formula mapping |
| `Varies significantly` | **NO NUMERIC MAPPING** | `[OPEN BUSINESS QUESTION]` — Evaluates to `INSUFFICIENT_DATA` |
| `Not sure` | `NOT_MODELED` | `[CONFIRMED]` (Insufficient Data) |

#### Q08: Elapsed Investigation Duration (Clock Time)
* `Under 30 minutes`, `30–60 minutes`, `1–4 hours`, `4–12 hours`, `1–3 days`, `Multiple days`, `Not sure`
* *Feeds Calculation?*: **NO** (Contextual Finding; measures elapsed diagnostic clock time distinct from staff effort in Q07).

---

### 2.3 Section C: Operational Complexity & Productivity (Q09–Q11)

#### Q09: Monitoring Tools & Management Consoles
* `1 integrated tool`, `2–3 disparate tools`, `4–6 disparate tools`, `7+ disparate tools / custom scripts`, `Not sure`
* *Feeds Calculation?*: No (Tooling Sprawl Finding).

#### Q10: Cross-Technology Manual Correlation Friction
* `Fully automated end-to-end tracing`, `Mostly manual with some log scripts`, `Entirely manual log correlation across teams`, `Nearly impossible / high friction`, `Not sure`
* *Feeds Calculation?*: No (Qualitative Tracing Friction).

#### Q11: Operational Productivity Constraint
* `Repetitive manual queue configuration & provisioning`, `Lack of message-level tracing / blind spots`, `Excessive false-positive alerts & noise`, `Slow cross-team root cause isolation on bridge calls`, `Developer wait time / self-service bottleneck`, `Not sure`
* *Feeds Calculation?*: **NO** (Qualitative Productivity Drag Finding).

---

### 2.4 Section D: Business Consequence & Financial Exposure (Q12–Q15)

#### Q12: Severity of Business Impact
* `Critical (Immediate customer/revenue halt)`, `Significant (Severe degradation/SLAs breached)`, `Moderate (Internal friction/delayed batch)`, `Minor (Minimal operational impact)`, `Not sure`
* *Feeds Calculation?*: **YES** (Enables $300k/hr ITIC benchmark when Q15 is unprovided and severity is `Critical` or `Significant`).

#### Q13: Recent Disruption Experience
* `Yes, multiple major disruptions`, `Yes, 1–2 significant disruptions`, `Minor disruptions only`, `No disruptions experienced`, `Not sure`
* *Feeds Calculation?*: No (Historical Outage Finding).

#### Q14: Representative Disruption Duration
`[CONFIRMED]` The exact decimal hours lookup matrix:

| Dropdown Option Text | Representative Duration ($D_{hours}$) | Calculation Status |
| :--- | :---: | :--- |
| `10 minutes or less` | **0.167** | `[CONFIRMED]` ($10 / 60$) |
| `11–45 minutes` | **0.467** | `[CONFIRMED]` ($28 / 60$) |
| `46–90 minutes` | **1.133** | `[CONFIRMED]` ($68 / 60$) |
| `1.5–4 hours` | **2.750** | `[CONFIRMED]` ($2.75$) |
| `4–8 hours` | **6.000** | `[CONFIRMED]` ($6.0$) |
| `More than 8 hours` | **10.000** | `[CONFIRMED]` ($10.0$) |
| `Not sure` | `NOT_MODELED` | `[CONFIRMED]` (Insufficient Data) |

#### Q15: Estimated Financial Cost Per Hour of Downtime
* *Type*: Numeric currency input ($/hr) or `Unknown / Not sure`.
* *Feeds Calculation?*: **YES** (Direct customer fact override; benchmark applied only if unprovided and Q12 qualifies).

---

### 2.5 Section E: Cost Reduction & Organizational Pressure (Q16–Q17)

#### Q16: Cost-Reduction Mandate
* `Yes, aggressive OpEx reduction target`, `Yes, moderate efficiency goal`, `Cost-neutral / Flat budget`, `Growing investment budget`, `Not sure`
* *Feeds Calculation?*: No (Commercial Urgency).

#### Q17: Target OpEx Reduction Percentage
* `5–10%`, `10–20%`, `20–30%`, `30%+`, `No specific % target`, `Not sure`
* *Numeric Override Allowed*: Yes (Percentage).
* *Feeds Calculation?*: No (Contextual Comparison).

---

### 2.6 Section F: Cybersecurity & Remediation (Q18–Q19)

#### Q18: Cybersecurity & Audit Pressure
* `High pressure (Active audit findings / urgent CVE remediation)`, `Moderate pressure (Routine compliance & quarterly cycles)`, `Low / standard security review`, `Not sure`
* *Feeds Calculation?*: **NO** (Qualitative Security Risk Finding).

#### Q19: Vulnerability Remediation & Configuration Friction
* `Significant friction (High risk of breaking channels / extensive manual checks)`, `Moderate friction (Scripted but requires substantial testing)`, `Low friction / automated deployment`, `Not sure`
* *Feeds Calculation?*: **NO** (Qualitative Remediation Overhead Finding).

---

### 2.7 Section G: Economic Inputs & Timing (Q20–Q22)

#### Q20: Fully Loaded Annual Labor Cost Override
* *Type*: Numeric currency input ($/yr) or `Use default ($180,000/yr)`.
* *Feeds Calculation?*: **YES** (Overrides default $180,000 in $R_{hr} = C_{labor} / 2,080$).

#### Q21: Customer-Reported Total Annual IBM MQ Spend
* *Type*: Numeric currency input ($/yr) or `Unknown / Not provided`.
* *Feeds Calculation?*: No (Contextual Baseline).

#### Q22: Time to Act & Measurable Improvement Target
* `Immediate (Within 30–60 days)`, `Near-term (90–180 days)`, `Strategic (Next fiscal year)`, `Not sure`
* *Feeds Calculation?*: No (Delivery Urgency).
