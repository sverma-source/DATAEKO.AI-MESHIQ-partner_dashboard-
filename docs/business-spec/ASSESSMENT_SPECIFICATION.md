# Assessment Specification: 22-Question Discovery Model

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION (AUDITED & RECONCILED)`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx (Assessment Sheet)`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`, `[SOURCE INCONSISTENCY]`

---

## 1. Authoritative 7-Section Discovery Structure

`[CONFIRMED]` The 22 discovery questions (Q01–Q22) are structured into the **7 authoritative workbook sections** (Sections A through G):

```text
Section A: Environment & Cost Baseline (Q01–Q05)
Section B: Troubleshooting Economics (Q06–Q08)
Section C: Operational Complexity & Productivity (Q09–Q11)
Section D: Business Consequence & Financial Exposure (Q12–Q15)
Section E: Cost Reduction & Organizational Pressure (Q16–Q17)
Section F: Cybersecurity & Remediation (Q18–Q19)
Section G: Economic Inputs & Timing (Q20–Q22)
```

---

## 2. Complete 22-Question Specification Catalog

### Section A: Environment & Cost Baseline

#### `Q01`: Queue Manager Estate Scale
* **Section**: `A. Environment & Cost Baseline`
* **Exact Question**: "Approximately how many IBM MQ queue managers are in your production and pre-production estate?"
* **Response Type**: `DROPDOWN_WITH_NUMERIC_OVERRIDE`
* **Valid Dropdown Options**: `1–10`, `11–25`, `26–50`, `51–100`, `101–250`, `251–500`, `500+`, `Not sure`
* **Numeric Input Allowed**: Yes (Exact integer count)
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Probe for pre-prod vs prod ratio, multi-platform hosting (Mainframe z/OS vs Distributed vs Cloud).
* **Theme**: Infrastructure Scale
* **Feeds Calculation?**: `[CONFIRMED]` No direct calculation in formula (Contextual Scale Baseline).

#### `Q02`: Staffing & Administration Resources
* **Section**: `A. Environment & Cost Baseline`
* **Exact Question**: "How many full-time or shared staff members are involved in managing, maintaining, and supporting IBM MQ?"
* **Response Type**: `DROPDOWN_WITH_NUMERIC_OVERRIDE`
* **Valid Dropdown Options**: `1–2`, `3–5`, `6–10`, `11–20`, `20+`, `Not sure`
* **Numeric Input Allowed**: Yes
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Count both dedicated middleware admins and shared infrastructure/application support engineers.
* **Theme**: Resource Allocation
* **Feeds Calculation?**: `[CONFIRMED]` No direct calculation in formula (Contextual / FTE Comparison).

#### `Q03`: Staffing & Operational Model
* **Section**: `A. Environment & Cost Baseline`
* **Exact Question**: "Which best describes your primary operational staffing model for IBM MQ?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Centralized dedicated MQ team`, `Shared middleware / platform team`, `Application teams manage their own MQ`, `Outsourced / Managed service provider`, `Hybrid model`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Identifies organizational centralization vs decentralized sprawl.
* **Theme**: Operating Model
* **Feeds Calculation?**: No (Contextual / Segmentation).

#### `Q04`: Quarterly Administration Time Overhead
* **Section**: `A. Environment & Cost Baseline`
* **Exact Question**: "On average, approximately how many total staff hours per quarter are spent on routine IBM MQ administration, patching, upgrades, and configuration changes?"
* **Response Type**: `NUMERIC_HOURS_OR_DROPDOWN`
* **Valid Dropdown Options**: `Less than 40 hours`, `40–100 hours`, `101–250 hours`, `251–500 hours`, `500+ hours`, `Not sure`
* **Numeric Input Allowed**: Yes (Exact hours preferred)
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Clarify quarterly scope. Captures routine operational maintenance.
* **Theme**: Administration Overhead
* **Feeds Calculation?**: `[CONFIRMED]` **YES** → Feeds `Annual Administration Hours` ($H_{admin} = \text{Q04} \times 4$) and `Annual Administration Labor Cost`.

#### `Q05`: Retired Infrastructure & Technical Debt
* **Section**: `A. Environment & Cost Baseline`
* **Exact Question**: "Are there inactive, legacy, or retired MQ queue managers and applications still running or maintained due to fear of breaking downstream dependencies?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Yes, significant technical debt`, `Yes, a few known instances`, `No, active estate only`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Highlights visibility gaps and risk of unmapped message channels.
* **Theme**: Technical Debt
* **Feeds Calculation?**: No (Qualitative Finding).

---

### Section B: Troubleshooting Economics

#### `Q06`: Troubleshooting & Incident Frequency
* **Section**: `B. Troubleshooting Economics`
* **Exact Question**: "How frequently do MQ-related issues, alerts, stuck messages, or queue full events occur that require manual investigation?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Multiple times per week`, `About weekly`, `Multiple times per month`, `About monthly`, `About quarterly`, `Less than quarterly`, `Rarely or never`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Probe for queue depth spikes, channel disconnects, and unconsumed messages.
* **Theme**: Incident Volume
* **Feeds Calculation?**: `[CONFIRMED]` **YES** → Maps to `Annual Troubleshooting Events` ($N_{events}$).

#### `Q07`: Staff Hours Expended Per Investigation (Staff Effort)
* **Section**: `B. Troubleshooting Economics`
* **Exact Question**: "When an MQ issue or message flow problem occurs, what is the average total staff hours expended across all team members to investigate, triage, and resolve it?"
* **Response Type**: `DROPDOWN_WITH_NUMERIC_OVERRIDE`
* **Valid Dropdown Options**: `Less than 1 hour`, `1–2 hours`, `3–5 hours`, `6–10 hours`, `11–20 hours`, `More than 20 hours`, `Varies significantly`, `Not sure`
* **Numeric Input Allowed**: Yes
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Emphasize *total person-hours* across all engineers on the bridge.
* **Theme**: Diagnostic Staff Effort
* **Feeds Calculation?**: `[CONFIRMED]` **YES** → Maps to `Staff Hours Per Investigation` ($H_{inv}$).  
  *Note on "Varies significantly"*: Unmapped in legacy formula; evaluates to `INSUFFICIENT_DATA` unless numeric override is provided.

#### `Q08`: Elapsed Investigation Duration (Clock Time)
* **Section**: `B. Troubleshooting Economics`
* **Exact Question**: "What is the typical elapsed clock time from problem detection to root cause identification for complex MQ issues?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Under 30 minutes`, `30–60 minutes`, `1–4 hours`, `4–12 hours`, `1–3 days`, `Multiple days`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Measures elapsed clock duration (diagnostic speed) distinct from total staff person-hours in Q07.
* **Theme**: Diagnostic Clock Duration
* **Feeds Calculation?**: `[CONFIRMED]` **NO** (Contextual Finding; does not participate in arithmetic formulas).

---

### Section C: Operational Complexity & Productivity

#### `Q09`: Monitoring Tools & Management Consoles
* **Section**: `C. Operational Complexity & Productivity`
* **Exact Question**: "How many distinct tools, consoles, or scripts do your teams typically access when diagnosing an end-to-end messaging problem?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `1 integrated tool`, `2–3 disparate tools`, `4–6 disparate tools`, `7+ disparate tools / custom scripts`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Establishes "swivel-chair" management friction and lack of single-pane visibility.
* **Theme**: Tooling Complexity
* **Feeds Calculation?**: No (Qualitative Finding).

#### `Q10`: Cross-Technology Manual Correlation Friction
* **Section**: `C. Operational Complexity & Productivity`
* **Exact Question**: "How much manual effort is required to trace a message transaction across MQ, brokers, applications, and hybrid/cloud endpoints?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Fully automated end-to-end tracing`, `Mostly manual with some log scripts`, `Entirely manual log correlation across teams`, `Nearly impossible / high friction`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Key indicator for meshIQ 360-degree observability value.
* **Theme**: Manual Tracing Friction
* **Feeds Calculation?**: No (Contextual Value Driver).

#### `Q11`: Operational Productivity Constraint
* **Section**: `C. Operational Complexity & Productivity`
* **Exact Question**: "What is the primary operational friction or constraint impacting your messaging team's day-to-day productivity?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Repetitive manual queue configuration & provisioning`, `Lack of message-level tracing / blind spots`, `Excessive false-positive alerts & noise`, `Slow cross-team root cause isolation on bridge calls`, `Developer wait time / self-service bottleneck`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Qualifies the primary operational friction driver for meshIQ solution alignment.
* **Theme**: Operational Productivity Constraint
* **Feeds Calculation?**: `[CONFIRMED]` **NO** (Qualitative Finding / Capability Mapping).

---

### Section D: Business Consequence & Financial Exposure

#### `Q12`: Severity of Business Impact
* **Section**: `D. Business Consequence & Financial Exposure`
* **Exact Question**: "What is the severity of business impact when a primary MQ queue manager or critical message flow experiences an unplanned outage?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Critical (Immediate customer/revenue halt)`, `Significant (Severe degradation/SLAs breached)`, `Moderate (Internal friction/delayed batch)`, `Minor (Minimal operational impact)`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Key qualifier for benchmark financial impact calculation.
* **Theme**: Outage Severity
* **Feeds Calculation?**: `[CONFIRMED]` **YES** → Triggers ITIC $300,000/hr benchmark if value is `Critical` or `Significant` and Q15 is unprovided.

#### `Q13`: Recent Disruption Experience
* **Section**: `D. Business Consequence & Financial Exposure`
* **Exact Question**: "Has your organization experienced a high-severity (P1/P2) messaging outage or delayed batch cycle in the past 12–24 months?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Yes, multiple major disruptions`, `Yes, 1–2 significant disruptions`, `Minor disruptions only`, `No disruptions experienced`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Validates actual historical disruption frequency.
* **Theme**: Historical Disruption
* **Feeds Calculation?**: No (Contextual Finding).

#### `Q14`: Representative Disruption Duration
* **Section**: `D. Business Consequence & Financial Exposure`
* **Exact Question**: "In a representative major messaging disruption, approximately how long does the outage or severe service degradation typically last before full recovery?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `10 minutes or less`, `11–45 minutes`, `46–90 minutes`, `1.5–4 hours`, `4–8 hours`, `More than 8 hours`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Translates customer perception to decimal hours ($D_{hours}$).
* **Theme**: Disruption Duration
* **Feeds Calculation?**: `[CONFIRMED]` **YES** → Maps to `Representative Duration` ($D_{hours}$).

#### `Q15`: Estimated Financial Cost Per Hour of Downtime
* **Section**: `D. Business Consequence & Financial Exposure`
* **Exact Question**: "What is your organization's estimated financial cost per hour of critical system downtime (including revenue loss, SLA penalties, and customer impact)?"
* **Response Type**: `NUMERIC_CURRENCY_OR_UNKNOWN`
* **Valid Dropdown Options**: `Customer Provided Amount ($/hr)`, `Unknown / Not sure`
* **Numeric Input Allowed**: Yes (Exact $/hour)
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Customer fact. If unknown, system evaluates Q12 to determine benchmark eligibility.
* **Theme**: Financial Downtime Rate
* **Feeds Calculation?**: `[CONFIRMED]` **YES** → Direct input to `Applicable Financial Impact`.

---

### Section E: Cost Reduction & Organizational Pressure

#### `Q16`: Cost-Reduction Mandate
* **Section**: `E. Cost Reduction & Organizational Pressure`
* **Exact Question**: "Is your infrastructure / middleware leadership under an active mandate to reduce operating expenditures (OpEx) or modernize legacy messaging?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Yes, aggressive OpEx reduction target`, `Yes, moderate efficiency goal`, `Cost-neutral / Flat budget`, `Growing investment budget`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Qualifies executive sponsorship and budget urgency.
* **Theme**: Cost Reduction Mandate
* **Feeds Calculation?**: No (Commercial Qualification).

#### `Q17`: Target OpEx Reduction Percentage
* **Section**: `E. Cost Reduction & Organizational Pressure`
* **Exact Question**: "What percentage reduction in operational effort or middleware tooling spend is leadership targeting over the next 12–24 months?"
* **Response Type**: `DROPDOWN_PERCENTAGE_OR_NUMERIC`
* **Valid Dropdown Options**: `5–10%`, `10–20%`, `20–30%`, `30%+`, `No specific % target`, `Not sure`
* **Numeric Input Allowed**: Yes
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Establishes customer-defined target reduction benchmark.
* **Theme**: Target Reduction Percentage
* **Feeds Calculation?**: No (Contextual Comparison).

---

### Section F: Cybersecurity & Remediation

#### `Q18`: Cybersecurity & Audit Pressure
* **Section**: `F. Cybersecurity & Remediation`
* **Exact Question**: "What is the level of cybersecurity, regulatory audit, or vulnerability patching pressure currently facing your IBM MQ messaging estate?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `High pressure (Active audit findings / urgent CVE remediation)`, `Moderate pressure (Routine compliance & quarterly cycles)`, `Low / standard security review`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Identifies governance overhead and security compliance urgency.
* **Theme**: Cybersecurity Pressure
* **Feeds Calculation?**: `[CONFIRMED]` **NO** (Qualitative Finding).

#### `Q19`: Vulnerability Remediation & Configuration Friction
* **Section**: `F. Cybersecurity & Remediation`
* **Exact Question**: "How much friction, manual testing, and operational risk is involved when patching, auditing, or applying security remediation changes across your queue managers?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Significant friction (High risk of breaking channels / extensive manual checks)`, `Moderate friction (Scripted but requires substantial testing)`, `Low friction / automated deployment`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Measures security maintenance overhead and friction.
* **Theme**: Remediation Friction
* **Feeds Calculation?**: `[CONFIRMED]` **NO** (Qualitative Finding).

---

### Section G: Economic Inputs & Timing

#### `Q20`: Fully Loaded Annual Labor Cost Override
* **Section**: `G. Economic Inputs & Timing`
* **Exact Question**: "What is your organization's estimated fully loaded annual cost per infrastructure/middleware engineer (including base, bonus, benefits, and overhead)?"
* **Response Type**: `NUMERIC_CURRENCY_OR_DEFAULT`
* **Valid Dropdown Options**: `Customer Provided Amount ($/yr)`, `Use default ($180,000/yr)`
* **Numeric Input Allowed**: Yes (Exact $/year)
* **Supports "Not sure"**: Yes (Defaults to $180,000)
* **Seller Instruction**: Default is $180,000/yr. Customer figure overrides default.
* **Theme**: Labor Rate Override
* **Feeds Calculation?**: `[CONFIRMED]` **YES** → Computes unrounded `Loaded Hourly Rate` ($R_{hr} = C_{labor} / 2,080$).

#### `Q21`: Customer-Reported Total Annual IBM MQ Spend
* **Section**: `G. Economic Inputs & Timing`
* **Exact Question**: "What is your organization's total estimated annual expenditure on IBM MQ licensing, maintenance, and dedicated operational support?"
* **Response Type**: `NUMERIC_CURRENCY_OR_UNKNOWN`
* **Valid Dropdown Options**: `Customer Provided Amount ($/yr)`, `Unknown / Not provided`
* **Numeric Input Allowed**: Yes
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Contextual baseline; do not manufacture if unknown.
* **Theme**: Customer Reported Total MQ Spend
* **Feeds Calculation?**: `[CONFIRMED]` No calculation override (Contextual Baseline).

#### `Q22`: Time to Act & Measurable Improvement Target
* **Section**: `G. Economic Inputs & Timing`
* **Exact Question**: "What is your target timeframe to demonstrate measurable operational and economic improvement across your messaging infrastructure?"
* **Response Type**: `DROPDOWN_SINGLE_SELECT`
* **Valid Dropdown Options**: `Immediate (Within 30–60 days)`, `Near-term (90–180 days)`, `Strategic (Next fiscal year)`, `Not sure`
* **Numeric Input Allowed**: No
* **Supports "Not sure"**: Yes
* **Seller Instruction**: Determines delivery urgency and PoC milestone timeline.
* **Theme**: Time to Act
* **Feeds Calculation?**: No (Engagement Timing).
