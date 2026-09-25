# Calculation Risks & Mitigation Analysis

> **Document Status**: `VALIDATION PHASE 0C`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`, `[CONFLICT]`, `[MISSING INFORMATION]`

---

## 1. Overview

This document catalogs potential computational, statistical, mathematical, and data integrity risks identified in the IBM MQ Economic Assessment calculation pipeline.

---

## 2. Calculation Risk Matrix

| Risk ID | Risk Domain | Description & Scenario | Impact | Mitigation Strategy | Stakeholder Validation Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-01** | **Division by Zero** | User inputs `0` for metrics used in denominator positions (e.g., `0` total incidents when calculating average MTTR or cost-per-incident). | Application crash or `NaN` output | Implement safe denominator checks (`denom > 0 ? num / denom : NOT_APPLICABLE`). Evaluate to controlled state. | Validate whether zero incidents means \$0 outage cost or excluded metric. |
| **RISK-02** | **Missing / "Not Sure" Inputs** | Customer cannot provide exact metrics (e.g., hourly cost of downtime or stuck message frequency). | Calculation failure or distorted baseline if defaulted to 0 | Transition dependent outputs to `INSUFFICIENT_DATA` or apply `BENCHMARK_ASSUMPTION` with visible badge. | Confirm default benchmark catalog values for each metric. |
| **RISK-03** | **Unit Inconsistencies** | Inconsistent time/frequency inputs (e.g., user enters incidents per month while formula expects annual count; hourly rate vs annual salary). | $12\times$ or $2080\times$ calculation error | Strict explicit unit labels on inputs (`[Hours/Month]`, `[Incidents/Year]`, `[USD/Hour]`) with automated normalization. | Validate standard unit of measure per question in business spec. |
| **RISK-04** | **Currency & FX Volatility** | Blended rates entered in EUR or GBP while benchmark costs or software investments are priced in USD. | Distorted ROI and financial totals | Store currency code on assessment entity; enforce single currency or explicit FX conversion layer. | Confirm whether multi-currency FX conversion is in scope for Phase 1. |
| **RISK-05** | **Extreme Outlier Inputs** | Accidental entry of excessive numbers (e.g., 50,000 FTEs or \$10,000,000/hr downtime cost) distorting charts. | Absurd executive summaries and broken chart scaling | Soft range warnings and maximum boundary validation flags in intake wizard. | Confirm plausible min/max validation boundaries per field. |
| **RISK-06** | **Floating Point Rounding Drift** | Cumulative rounding errors across multi-step currency and percentage multiplications. | Penny/cent discrepancies across summary tables | Enforce fixed-precision decimal arithmetic (e.g., `Decimal.js` or 2 decimal places for currency, 4 for rates). | Confirm standard rounding conventions (e.g., Half-Up to whole dollar). |
| **RISK-07** | **Silent Substitution with Benchmarks** | Replacing a customer's blank answer with a benchmark without clearly alerting the stakeholder. | Loss of credibility during executive audit | Dual-layer data model preserving raw customer answer separately from benchmark-augmented scenarios. | Confirm explicit UI badging standards for benchmark-derived metrics. |
| **RISK-08** | **Historical Reproducibility Drift** | Updating calculation rules in `v1.1.0` silently alters calculated results of finalized `v1.0.0` assessments. | Legal and commercial confusion on previously presented quotes | Immutable `CalculationSnapshot` storing rule version, input snapshot, and calculated output map. | Confirm assessment locking and version migration rules. |
| **RISK-09** | **Over-Optimistic Scenario Compounding** | Multiplying multiple 50% efficiency levers resulting in mathematically impossible or unrealistic savings (>100% baseline). | Unrealistic business case that fails client scrutiny | Implement aggregate savings ceilings (e.g., max total operational labor reclamation cannot exceed 70%). | Validate maximum allowable compound scenario efficiency caps. |
| **RISK-10** | **Unvalidated Workbook Logic** | Legacy Excel workbook may contain proprietary macros, lookup tables, or hidden cell logic not documented in initial drafts. | Calculation engine fails to match legacy spreadsheet outputs | Comprehensive "Golden Master" regression testing comparing legacy workbook outputs against web engine. | **Blocking**: Complete business specification / formula markdown required. |
