# Data Provenance Classification & Catalog

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`

---

## 1. Classification Standard & Definitions

`[CONFIRMED]` Every numeric data point, metric, label, and assumption in the application must strictly map to one of six provenance tiers:

| Tier Code | Classification Name | Definition | Workbook Example |
| :--- | :--- | :--- | :--- |
| `TIER_FACT` | **Customer Fact** | Direct measured metric or factual choice provided by the customer during discovery. | • Quarterly admin hours (Q04 = 80 hrs)<br>• Customer loaded labor rate (Q20 = \$195k)<br>• Customer downtime rate (Q15 = \$450k/hr) |
| `TIER_ASSUMPTION` | **Model Assumption** | Standard operational conversion constant used across models. | • 2,080 working hours per year<br>• Default \$180,000 annual loaded labor cost<br>• 4 quarters per year multiplier |
| `TIER_BENCHMARK` | **Industry Benchmark** | External authoritative research statistic applied when customer data is unmeasured. | • ITIC \$300,000/hr critical downtime rate<br>• Forrester MTTR reduction averages |
| `TIER_CALCULATED` | **Calculated Result** | Pure deterministic arithmetic derived from verified inputs and model assumptions. | • Annual Admin Hours = Q04 × 4<br>• Loaded Hourly Rate = \$180,000 / 2,080 = \$86.54<br>• Potential Exposure = Duration × Rate |
| `TIER_SCENARIO` | **Illustrative Scenario** | Hypothetical future-state projection based on optimization levers. | • 25% Admin Hours Recovered<br>• 25% Investigation Hours Recovered<br>• Total Illustrative Economic Value |
| `TIER_DEMO` | **Demo / Example Value** | Sample hardcoded narrative data in template sheets used for illustration. | • Legacy Customer Report template values (726 hrs, \$68,063 labor, \$2.7M exposure, \$18,325 value) |

---

## 2. Complete Metric Provenance Catalog

| Metric / Variable Name | Primary Provenance Tier | Fallback Tier | Validation & Badging Requirement |
| :--- | :--- | :--- | :--- |
| **Quarterly Admin Hours (Q04)** | `CUSTOMER_FACT` | N/A (Unknown) | Stored as customer input. If unknown, dependent calculations set to `INSUFFICIENT_DATA`. |
| **Annual Working Hours Constant** | `MODEL_ASSUMPTION` | Fixed (2,080) | Non-editable standard constant. |
| **Loaded Annual Labor Cost (Q20)** | `CUSTOMER_FACT` | `MODEL_ASSUMPTION` (\$180,000) | Badged as `[CUSTOMER_FACT]` if provided by client; badged as `[DEFAULT_ASSUMPTION]` if default is used. |
| **Loaded Hourly Rate ($R_{hr}$)** | `CALCULATED_RESULT` | N/A | Derived from Loaded Annual Labor Cost / 2,080. |
| **Troubleshooting Frequency (Q06)** | `CUSTOMER_FACT` | Lookup Mapping | Dropdown selection maps to annual event multiplier. |
| **Hours per Investigation (Q07)** | `CUSTOMER_FACT` | Lookup Mapping | Dropdown selection maps to midpoint hours. |
| **Annual Admin Labor Cost ($C_{admin}$)**| `CALCULATED_RESULT` | N/A | Traceable formula: $H_{admin} \times R_{hr}$. |
| **Annual Trb Labor Cost ($C_{trb}$)** | `CALCULATED_RESULT` | N/A | Traceable formula: $H_{trb} \times R_{hr}$. |
| **Total Quantified Labor ($C_{total}$)** | `CALCULATED_RESULT` | N/A | Traceable formula: $C_{admin} + C_{trb}$. |
| **Operational FTE Burden** | `CALCULATED_RESULT` | N/A | Traceable formula: $(H_{admin} + H_{trb}) / 2,080$. |
| **Hourly Downtime Cost (Q15)** | `CUSTOMER_FACT` | `INDUSTRY_BENCHMARK` (\$300k/hr) | If provided, badged `[CUSTOMER_FACT]`. If blank and Q12 is Critical/Significant, badged `[ITIC_BENCHMARK]`. |
| **Representative Duration (Q14)** | `CUSTOMER_FACT` | Lookup Mapping | Dropdown selection maps to decimal hours ($D_{hours}$). |
| **Potential Financial Exposure** | `CALCULATED_RESULT` | N/A | Traceable formula: $D_{hours} \times R_{impact}$. Explicit single-event disclaimer. |
| **Recovered Admin Hours** | `ILLUSTRATIVE_SCENARIO` | Fixed 25% | Scenario multiplier ($H_{admin} \times 0.25$). Disclaimed. |
| **Recovered Investigation Hours** | `ILLUSTRATIVE_SCENARIO` | Fixed 25% | Scenario multiplier ($H_{trb} \times 0.25$). Disclaimed. |
| **Illustrative Economic Value** | `ILLUSTRATIVE_SCENARIO` | N/A | Scenario formula ($H_{rec\_total} \times R_{hr}$). Disclaimed. |
| **Sample Slide Narrative Values** | `DEMO_VALUE` | Static Template | Hardcoded text in legacy report templates (e.g., \$18,325 value) flagged as demo examples. |
