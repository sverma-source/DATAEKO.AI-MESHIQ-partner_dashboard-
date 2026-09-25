# Source Assumptions & Mathematical Constants

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`

---

## 1. Overview

This catalog documents all explicit and implicit mathematical constants, baseline rates, operational assumptions, and lookup coefficients embedded within the legacy IBM MQ workbook.

---

## 2. Exhaustive Catalog of Source Assumptions

### 2.1 Standard Annual Working Hours Constant
* **Assumption**: 1 Full-Time Equivalent (FTE) works exactly **2,080 hours per year**.
* **Derivation**: 52 weeks/year $\times$ 40 hours/week.
* **Workbook Reference**: Calc Engine Sheet (Formula `=B10/2080`).
* **Classification**: `[CONFIRMED_MODEL_ASSUMPTION]`

### 2.2 Quarterly to Annual Administration Multiplier
* **Assumption**: Routine administration hours captured quarterly are annualized via a constant multiplier of **4**.
* **Derivation**: 4 calendar quarters per fiscal year.
* **Workbook Reference**: Calc Engine Sheet (Formula `=Assessment!C13*4`).
* **Classification**: `[CONFIRMED_MODEL_ASSUMPTION]`

### 2.3 Default Fully Loaded Annual Labor Cost
* **Assumption**: The fully loaded cost (base salary, cash bonus, healthcare, pension, payroll taxes, office overhead) of an enterprise MQ/middleware engineer defaults to **$180,000 per year**.
* **Derivation**: Blended market compensation benchmark across enterprise North American / Western European infrastructure teams.
* **Implied Hourly Rate**: $\$180,000 / 2,080 = \mathbf{\$86.5385 \text{ / hr}}$.
* **Workbook Reference**: Calc Engine Sheet (Cell B10).
* **Classification**: `[CONFIRMED_MODEL_ASSUMPTION]`

### 2.4 ITIC Critical Outage Hourly Downtime Benchmark
* **Assumption**: Unplanned downtime on mission-critical message flows incurs an average business exposure of **$300,000 per hour**.
* **Derivation**: ITIC (Information Technology Intelligence Consulting) Global Server Hardware & OS Reliability Surveys (98% of enterprises report downtime costs exceed \$100k/hr, with 40%+ reporting \$300k–\$1M+/hr).
* **Workbook Reference**: Calc Engine Sheet (Cell C20).
* **Classification**: `[CONFIRMED_INDUSTRY_BENCHMARK]`

### 2.5 Midpoint Interpolation for Qualitative Range Bands
* **Assumption**: Qualitative range selections in discovery questions are mapped to representative arithmetic midpoints:
  * `Less than 1 hour` $\rightarrow$ **0.5 hours**
  * `1–2 hours` $\rightarrow$ **1.5 hours**
  * `3–5 hours` $\rightarrow$ **4.0 hours**
  * `6–10 hours` $\rightarrow$ **8.0 hours**
  * `11–20 hours` $\rightarrow$ **15.5 hours**
  * `More than 20 hours` $\rightarrow$ **24.0 hours** (Conservative floor)
  * `10 minutes or less` $\rightarrow$ **0.167 hours** ($10/60$)
  * `11–45 minutes` $\rightarrow$ **0.467 hours** ($28/60$)
  * `46–90 minutes` $\rightarrow$ **1.133 hours** ($68/60$)
  * `1.5–4 hours` $\rightarrow$ **2.750 hours**
  * `4–8 hours` $\rightarrow$ **6.000 hours**
  * `More than 8 hours` $\rightarrow$ **10.000 hours** (Conservative floor)
* **Workbook Reference**: Dropdown Lists Sheet (Columns D & E).
* **Classification**: `[CONFIRMED_MODEL_ASSUMPTION]`

### 2.6 Incident Frequency Annualization Multipliers
* **Assumption**: Qualitative incident frequencies are converted to annual event counts:
  * `Multiple times per week` $\rightarrow$ **104 events/year** ($2 \times 52$)
  * `About weekly` $\rightarrow$ **52 events/year** ($1 \times 52$)
  * `Multiple times per month` $\rightarrow$ **30 events/year** ($2.5 \times 12$)
  * `About monthly` $\rightarrow$ **12 events/year** ($1 \times 12$)
  * `About quarterly` $\rightarrow$ **4 events/year** ($1 \times 4$)
  * `Less than quarterly` $\rightarrow$ **2 events/year** ($0.5 \times 4$)
  * `Rarely or never` $\rightarrow$ **0 events/year**
* **Workbook Reference**: Dropdown Lists Sheet (Column B).
* **Classification**: `[CONFIRMED_MODEL_ASSUMPTION]`

### 2.7 meshIQ Efficiency Optimization Multipliers
* **Assumption**: Implementing meshIQ management and observability achieves:
  * **50% Addressable Administration Tasks**
  * **50% Efficiency Gain on Addressable Admin Tasks** (Net **25% Admin Hours Recovered**)
  * **25% Investigation Effort Reduction** (Net **25% Troubleshooting Hours Recovered**)
  * **10% Troubleshooting Productivity Opportunity**
* **Workbook Reference**: Calc Engine Sheet (Range E20:F26).
* **Classification**: `[CONFIRMED_ILLUSTRATIVE_SCENARIO]`
