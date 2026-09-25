# Excel Workbook to Application Entity Mapping

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION (AUDITED & RECONCILED)`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`

---

## 1. Overview

This document establishes the bidirectional mapping between cell locations in the legacy Excel workbook (`Assessment`, `Calc Engine`, `Customer Report`, `Dropdown Lists`) and the application domain models structured across the **7 authoritative sections (Sections A through G)**.

---

## 2. Assessment Intake Question Cell Mapping

| Section Code & Name | Cell Location | Question ID | Domain Field Key | Target DTO Type |
| :--- | :--- | :--- | :--- | :--- |
| **A. Environment & Cost Baseline** | `Assessment!C10` | **Q01** | `scale_band_or_count` | `ScaleSelectionDTO` |
| **A. Environment & Cost Baseline** | `Assessment!C11` | **Q02** | `staff_count_or_band` | `StaffSelectionDTO` |
| **A. Environment & Cost Baseline** | `Assessment!C12` | **Q03** | `staffing_model_type` | `StringEnum` |
| **A. Environment & Cost Baseline** | `Assessment!C13` | **Q04** | `quarterly_admin_hours` | `Decimal` (Hours) |
| **A. Environment & Cost Baseline** | `Assessment!C14` | **Q05** | `technical_debt_level` | `StringEnum` |
| **B. Troubleshooting Economics** | `Assessment!C16` | **Q06** | `troubleshooting_frequency` | `StringEnum` |
| **B. Troubleshooting Economics** | `Assessment!C17` | **Q07** | `staff_hours_per_investigation`| `Decimal` (Hours) |
| **B. Troubleshooting Economics** | `Assessment!C18` | **Q08** | `elapsed_investigation_band` | `StringEnum` |
| **C. Operational Complexity & Productivity** | `Assessment!C19` | **Q09** | `tools_count_band` | `StringEnum` |
| **C. Operational Complexity & Productivity** | `Assessment!C20` | **Q10** | `correlation_friction_level` | `StringEnum` |
| **C. Operational Complexity & Productivity** | `Assessment!C23` | **Q11** | `productivity_constraint_type` | `StringEnum` |
| **D. Business Consequence & Financial Exposure** | `Assessment!C24` | **Q12** | `business_impact_severity` | `StringEnum` |
| **D. Business Consequence & Financial Exposure** | `Assessment!C25` | **Q13** | `recent_disruption_experience` | `StringEnum` |
| **D. Business Consequence & Financial Exposure** | `Assessment!C26` | **Q14** | `disruption_duration_band` | `StringEnum` |
| **D. Business Consequence & Financial Exposure** | `Assessment!C27` | **Q15** | `hourly_downtime_cost_usd` | `Optional[Decimal]` |
| **E. Cost Reduction & Organizational Pressure** | `Assessment!C30` | **Q16** | `cost_mandate_urgency` | `StringEnum` |
| **E. Cost Reduction & Organizational Pressure** | `Assessment!C31` | **Q17** | `target_reduction_band` | `StringEnum` |
| **F. Cybersecurity & Remediation** | `Assessment!C32` | **Q18** | `cybersecurity_pressure_level` | `StringEnum` |
| **F. Cybersecurity & Remediation** | `Assessment!C33` | **Q19** | `remediation_friction_level` | `StringEnum` |
| **G. Economic Inputs & Timing** | `Assessment!C35` | **Q20** | `loaded_labor_cost_annual_usd`| `Optional[Decimal]` |
| **G. Economic Inputs & Timing** | `Assessment!C36` | **Q21** | `customer_reported_spend_usd` | `Optional[Decimal]` |
| **G. Economic Inputs & Timing** | `Assessment!C38` | **Q22** | `time_to_act_band` | `StringEnum` |

---

## 3. Calc Engine Sheet to Calculation Engine DTO Mapping

| Excel Cell Location | Metric Label | Excel Formula | Calculation Engine Output Key | DTO Type |
| :--- | :--- | :--- | :--- | :--- |
| `Calc Engine!B4` | Annual Admin Hours | `=Assessment!C13*4` | `annual_admin_hours` | `Decimal` |
| `Calc Engine!B5` | Annual Events | `=VLOOKUP(Assessment!C16, ...)` | `annual_troubleshooting_events`| `Integer` |
| `Calc Engine!B6` | Hours per Investigation | `=VLOOKUP(Assessment!C17, ...)` | `staff_hours_per_investigation`| `Decimal` |
| `Calc Engine!B7` | Annual Trb Staff Hours | `=B5*B6` | `annual_troubleshooting_hours` | `Decimal` |
| `Calc Engine!B10` | Loaded Annual Labor Cost | `=IF(ISBLANK(C35), 180000, C35)` | `loaded_annual_labor_cost_usd` | `Decimal` |
| `Calc Engine!B11` | Loaded Hourly Labor Rate | `=B10/2080` | `loaded_hourly_rate_usd` | `Decimal` (Full Precision) |
| `Calc Engine!B12` | Total Quantified Labor Cost | `=(B4*B11)+(B7*B11)` | `total_quantified_labor_cost_usd` | `Decimal` |
| `Calc Engine!B13` | Operational FTE Burden | `=(B4+B7)/2080` | `operational_fte_burden` | `Decimal` |
| `Calc Engine!B18` | Representative Duration | `=VLOOKUP(Assessment!C26, ...)` | `representative_duration_hours` | `Decimal` |
| `Calc Engine!B19` | Applicable Financial Rate | `=IF(C27>0, C27, IF(..., 300000, 0))` | `applicable_financial_rate_usd`| `Decimal` |
| `Calc Engine!B20` | Potential Financial Exposure| `=B18*B19` | `potential_financial_exposure_usd`| `Decimal` |
| `Calc Engine!F22` | Admin Hours Recovered | `=B4*E20*E21` | `recovered_admin_hours` | `Decimal` |
| `Calc Engine!F24` | Investigation Hours Recovered| `=B7*E23` | `recovered_investigation_hours`| `Decimal` |
| `Calc Engine!F26` | Total Hours Recovered | `=F22+F24` | `total_recovered_hours` | `Decimal` |
| `Calc Engine!F27` | Illustrative Economic Value | `=F26*B11` | `illustrative_economic_value_usd`| `Decimal` |
| `Calc Engine!F28` | Trb Productivity Opportunity| `=(B7*B11)*E25` | `troubleshooting_opportunity_usd`| `Decimal` |
