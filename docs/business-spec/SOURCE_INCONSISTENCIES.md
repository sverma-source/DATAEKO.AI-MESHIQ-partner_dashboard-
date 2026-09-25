# Source Inconsistencies & Legacy Workbook Anomalies

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`, `[SOURCE INCONSISTENCY]`

---

## 1. Overview

This document analyzes specific data discrepancies, mathematical mismatches, unmapped dropdown options, and narrative anomalies identified during deep inspection of the legacy Excel workbook.

> **CRITICAL ARCHITECTURAL DIRECTIVE**:  
> In accordance with our core engineering principles, **no anomaly has been silently modified or assumed away**. Each item is cataloged for formal stakeholder confirmation.

---

## 2. Inconsistency Register

### Issue 1: Hardcoded Example Narrative in Customer Report Sheet
* **Where Found**: `Customer Report` Sheet (Cells B12, D12, F12, B20, D20, and slide narrative text boxes).
* **Description**: The Customer Report sheet contains hardcoded illustrative values:
  * Baseline Staff Hours: `726 annual staff hours`
  * Baseline Labor Cost: `$68,063 annual labor`
  * Representative Disruption: `6-hour disruption`
  * Potential Financial Exposure: `$2.7M exposure` (based on $450k/hr custom rate)
  * Projected Optimized Hours: `545 projected hours`
  * Capacity Recovered: `182 recovered hours`
  * Illustrative Annual Value: `$18,325 annual value`
* **Why It Matters**: If not recognized as demo narrative text, these numbers could be mistaken for active dynamic cell links or default outputs of a blank assessment.
* **Potential Interpretation**:
  * *Interpretation A*: Static demo placeholder text embedded into the PowerPoint/Excel slide template for sales training.
  * *Interpretation B*: Outputs of a specific historical client engagement that was saved directly into the template.
* **Required Clarification**: Product Owner to confirm that all such narrative text boxes must be rendered dynamically from active calculation outputs in the web application.

---

### Issue 2: Mathematical Reconciliation Mismatch in Legacy Example
* **Where Found**: `Customer Report` Sheet (Slide 3 text box: "182 recovered hours resulting in $18,325 annual value").
* **Description**:
  * In the legacy template text: $\text{Value} = \$18,325$ for $182 \text{ recovered hours}$.
  * Implied Hourly Rate = $\$18,325 / 182 = \mathbf{\$100.6868 \text{ / hour}}$ (Equivalent to an annual salary of $\approx \$209,428$).
  * However, the workbook's default loaded hourly rate is $\mathbf{\$86.5385 \text{ / hour}}$ ($\$180,000 / 2,080$).
  * At the default rate, $182 \text{ hours} \times \$86.5385 = \mathbf{\$15,750.01}$.
* **Why It Matters**: Reveals that the hardcoded slide text was derived from a custom salary override (e.g., ~$210k loaded labor) rather than the default $180k rate.
* **Potential Interpretation**: The slide narrative was copied from a past customer presentation that used a $100.69/hr rate.
* **Required Clarification**: Confirms that the web application calculation engine must strictly compute $\text{Value} = \text{Recovered Hours} \times R_{hr}$ dynamically, rather than using static strings.

---

### Issue 3: Unmapped Dropdown Option "Varies significantly" in Q07
* **Where Found**: `Assessment!C17` (Q07 Dropdown List) vs `Calc Engine!B6` (Lookup Formula).
* **Description**: Q07 includes the choice `"Varies significantly"`, but the Excel formula `=VLOOKUP(Assessment!C17, Dropdown_Lists!D4:E10, 2, FALSE)` returns `#N/A` or fails to map to a numeric midpoint when this option is selected.
* **Why It Matters**: If a customer selects this during discovery, the calculation engine in Excel breaks or produces an error.
* **Potential Interpretation**:
  * *Interpretation A*: Selecting "Varies significantly" should prompt the consultant to enter an explicit numeric average hours override.
  * *Interpretation B*: "Varies significantly" maps to the median category (`3–5 hours` $\rightarrow$ 4.0 hrs) with a disclaimer badge.
  * *Interpretation C*: Transitions troubleshooting labor to `INSUFFICIENT_DATA`.
* **Required Clarification**: Business Analyst / meshIQ SME to confirm the authorized handling for "Varies significantly".

---

### Issue 4: Exclusion of Q08 (Elapsed Investigation Clock Time) from Calc Engine
* **Where Found**: `Assessment!C18` (Q08) vs `Calc Engine` Sheet.
* **Description**: Q08 captures elapsed clock time from detection to root cause (`Under 30 mins` to `Multiple days`), but is completely omitted from the formulas in `Calc Engine`.
* **Why It Matters**: Elapsed time (MTTR clock time) is a primary operational pain metric, yet only Q07 (staff person-hours) and Q14 (disruption duration) feed the math.
* **Potential Interpretation**:
  * *Interpretation A (Intentional)*: Q08 is intentionally qualitative context for the MTTR narrative slide and does not multiply headcount.
  * *Interpretation B (Missing Formula)*: Q08 was intended to scale downtime exposure or SLA breach risk.
* **Required Clarification**: Stakeholder confirmation on whether Q08 remains qualitative context or should feed a future MTTR reduction model.

---

### Issue 5: Separate 10% vs 25% Troubleshooting Improvement Assumptions
* **Where Found**: `Calc Engine!E23` (25% Investigation Improvement) vs `Calc Engine!E25` (10% Troubleshooting Productivity Opportunity).
* **Description**: The Calc Engine calculates both:
  1. `Investigation Hours Recovered` = $H_{trb} \times \mathbf{25\%}$ (Used to compute Total Recovered Hours and Illustrative Economic Value).
  2. `Troubleshooting Productivity Opportunity ($)` = $\text{Troubleshooting Labor Cost} \times \mathbf{10\%}$ (A separate metric).
* **Why It Matters**: Could cause confusion if a stakeholder asks whether meshIQ improves troubleshooting by 10% or 25%.
* **Potential Interpretation**:
  * *25%* represents the *engineering time reclamation* on triage bridge calls via automated tracing.
  * *10%* represents a *conservative financial floor* used in alternate executive summary callouts.
* **Required Clarification**: Confirm the official presentation positioning of the 10% vs 25% levers in the customer report.
