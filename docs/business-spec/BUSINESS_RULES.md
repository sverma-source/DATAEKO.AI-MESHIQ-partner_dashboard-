# Authoritative Business Rules

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`

---

## 1. Governance & Assessment Rules

### `BR-001`: Customer Fact Primacy
* **Rule**: Customer-provided factual values always override default model assumptions and industry benchmarks.
* **Scope**: Applies to loaded labor rates (Q20), hourly downtime financial cost (Q15), quarterly admin hours (Q4), and annual MQ budget (Q21).
* **Source**: Seller Guide Sheet, Column B instructions.

### `BR-002`: Validity of "Not Sure" Responses
* **Rule**: "Not sure", "Unknown", and "Decline to state" are legitimate discovery answers. The intake system must never force a respondent to fabricate an answer or block wizard progression when uncertainty is expressed.
* **Source**: Assessment Sheet & Dropdown Lists.

### `BR-003`: Prohibition of Coercion to Zero
* **Rule**: Missing, blank, or "Not sure" answers must **never** be coerced into `0`, `0.0`, or false defaults.
* **Consequence**: An unprovided quarterly admin hour count cannot be treated as 0 hours of maintenance. It must be evaluated to `NOT_MODELED` or `INSUFFICIENT_DATA`.
* **Source**: Architectural Mandate & Calc Engine Error Rules.

### `BR-004`: Clear Demarcation of Productivity Projections
* **Rule**: Modeled productivity gains (reclaimed staff hours and illustrative economic value) must be explicitly presented as *internal capacity optimization opportunities*, **never as guaranteed commercial hard-dollar cost reductions**.
* **Source**: Seller Guide & Customer Report Disclaimers.

### `BR-005`: ITIC $300,000/hr Benchmark Eligibility
* **Rule**: The industry benchmark of **$300,000 per hour** (sourced from ITIC Hourly Cost of Downtime Studies) is applied **only if and only when**:
  1. The customer does not provide an explicit financial downtime cost in Q15; **AND**
  2. The customer classifies their outage business impact (Q12) as either `Critical` or `Significant`.
* **Exception**: If business impact is `Moderate`, `Minor`, or `Not sure`, and Q15 is unprovided, the financial exposure metric must evaluate to `NOT_MODELED`.
* **Source**: Calc Engine Sheet (Cell C20 lookup formula).

### `BR-006`: Non-Manufacture of Unprovided Annual MQ Spend
* **Rule**: If the customer cannot provide their total annual IBM MQ spend (Q21), the system must **not** fabricate a synthetic estimate based on queue manager count. The metric remains unstated in the baseline context.
* **Source**: Assessment Sheet, Row 36 note.

### `BR-007`: Loaded Labor Cost Default & Override
* **Rule**: The baseline loaded labor cost per infrastructure engineer defaults to **$180,000 per year** (equivalent to **$86.54/hour** based on 2,080 annual working hours). If the customer provides an explicit annual loaded figure in Q20, the customer figure replaces $180,000 in all labor cost equations.
* **Source**: Calc Engine Sheet (Cell B10) and Dropdown Lists.

### `BR-008`: 6-Tier Provenance Labeling
* **Rule**: Every metric rendered on the dashboard or customer report must be categorized and visibly badged into one of six provenance tiers:
  1. `[CUSTOMER_FACT]`
  2. `[MODEL_ASSUMPTION]`
  3. `[INDUSTRY_BENCHMARK]`
  4. `[CALCULATED_RESULT]`
  5. `[ILLUSTRATIVE_SCENARIO]`
  6. `[DEMO_VALUE]`
* **Source**: Project Foundation Governance & Architectural Decision ADR-002.

---

## 2. Operational Calculation Rules

### `BR-009`: Standard Annual Working Hours Constant
* **Rule**: The standard working year constant is fixed at **2,080 hours per FTE per year** (52 weeks $\times$ 40 hours/week).
* **Source**: Calc Engine Sheet (Formula `=B10/2080`).

### `BR-010`: Potential Financial Exposure Scope (Single Incident)
* **Rule**: The calculated metric `Potential Financial Exposure` represents the modeled financial risk of **one representative major disruption**, not the annualized historical loss.
* **Source**: Seller Guide & Calc Engine Sheet (Row 20).

### `BR-011`: Improvement Scenario Multipliers
* **Rule**: The legacy improvement scenario is strictly parameterized by four baseline multipliers:
  * Addressable Administration Share = **50%**
  * Administration Efficiency Improvement = **50%**
  * Investigation Efficiency Improvement = **25%**
  * Troubleshooting Productivity Opportunity = **10% of baseline troubleshooting labor cost**
* **Source**: Calc Engine Sheet (Range E20:F26).
