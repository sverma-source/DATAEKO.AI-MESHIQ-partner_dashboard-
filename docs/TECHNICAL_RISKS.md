# Technical Risk Register

> **Document Status**: `PHASE 1 ARCHITECTURE & DESIGN`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`

---

## 1. Overview

This register identifies architectural, technical, operational, and engineering risks associated with the development and deployment of the DATAEKO × meshIQ Partner Dashboard.

---

## 2. Technical Risk Matrix

| Risk ID | Risk Summary | Impact | Likelihood | Mitigation Strategy | Status |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **TECH-01** | **Formula Discrepancy with Legacy Excel Model** | Critical | High | Author a Golden Master test suite comparing legacy Excel workbook outputs with the pure calculation engine across diverse input profiles. | Active / Pending Spec |
| **TECH-02** | **Inadvertent Cross-Tenant Data Leakage** | Critical | Low | Implement defense-in-depth: Tenant middleware scoping + repository layer filtering + PostgreSQL Row-Level Security (RLS) + automated security regression tests. | Controlled by Architecture |
| **TECH-03** | **PDF Report Layout Inconsistency** | High | Medium | Use headless Chromium (Playwright) to render shared React presentation components to PDF, ensuring exact parity between web dashboard and printed deliverables. | Controlled by Architecture |
| **TECH-04** | **Premature Database Schema Commitment** | High | Medium | Restrict Phase 1 to conceptual data models; finalize physical tables only after official business specification is reviewed and approved. | Active Policy |
| **TECH-05** | **Calculation Engine Regression on Version Upgrades** | High | Medium | Enforce immutable calculation snapshots and semantic versioning on all calculation rule modules (`rules/v1_0_0/`). | Controlled by Architecture |
| **TECH-06** | **Floating Point Arithmetic Drift in Financial Totals** | Medium | Medium | Use fixed-precision decimal representations (`Decimal` in Python, formatted strings in UI) rather than raw binary floating point. | Controlled by Architecture |
| **TECH-07** | **Incomplete Customer Intake Stalling Calculations** | Medium | High | Support explicit `UNKNOWN` and `NOT_PROVIDED` states; implement fallback benchmark assumptions with prominent UI badging. | Controlled by Architecture |
| **TECH-08** | **Secrets Committed to Version Control** | Critical | Low | Maintain robust `.gitignore`, use `.env.example` templates, enforce pre-commit secret scanners, and inject credentials via cloud environment variables. | Controlled by Architecture |
| **TECH-09** | **Dual Runtime Maintenance Overhead (Node.js + Python)** | Low | High | Use Docker Compose for unified local development; keep API contracts synchronized via automated OpenAPI/TypeScript generation. | Controlled by Architecture |
