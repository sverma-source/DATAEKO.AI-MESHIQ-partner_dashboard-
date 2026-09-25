# Requirement Gaps & Missing Information Backlog

> **Document Status**: `VALIDATION PHASE 0C`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`, `[CONFLICT]`, `[MISSING INFORMATION]`

---

## 1. Overview

This document categorizes all missing specifications and unestablished requirements across functional domains. Each item represents information that is **not established by the current source material** and must be provided before related components can be implemented.

---

## 2. Requirement Gap Inventory

### 2.1 Product & Assessment Workflow Gaps
* `[MISSING INFORMATION]` **Concrete Questionnaire Specification**: The complete, ordered list of questions, section names, help text, input types, and validation constraints from the original IBM MQ assessment is not yet available.
* `[MISSING INFORMATION]` **Section Dependencies & Conditional Logic**: Are certain questionnaire sections skipped based on earlier answers (e.g., if customer does not run Mainframe MQ, are Mainframe-specific questions hidden)?
* `[MISSING INFORMATION]` **Mandatory vs Optional Questions**: Which specific questions are strictly required before a calculation can run, and which are optional with benchmark fallbacks?

### 2.2 Calculation Engine Gaps
* `[MISSING INFORMATION]` **Proprietary Workbook Mathematical Formulas**: The exact arithmetic formulas, coefficient matrices, and logic equations for calculating TCO, labor burden, outage exposure, and meshIQ projected ROI are not established.
* `[MISSING INFORMATION]` **Industry Benchmark Dataset**: The verified numeric baseline dataset for default MQ Admin hourly rates, MTTR averages, incident frequencies, and queue triage overheads has not been provided.
* `[MISSING INFORMATION]` **Rounding & Currency Rules**: Exact rounding rules per metric (e.g., round to nearest whole dollar vs 2 decimal places; FTEs rounded to 1 decimal place; standard FX rates).

### 2.3 User & Authentication Gaps
* `[MISSING INFORMATION]` **Authentication Provider Mandate**: Whether to implement built-in email/password authentication with MFA, Google Workspace OAuth, Microsoft Entra ID (Azure AD), or Okta SAML.
* `[MISSING INFORMATION]` **User Self-Registration Policy**: Can users sign up independently, or are all accounts strictly provisioned by an Administrator or Consultant invitation?
* `[MISSING INFORMATION]` **Customer Portal Access in MVP**: Whether customer client stakeholders receive direct login access during Phase 1.

### 2.4 Data Governance & Lifecycle Gaps
* `[MISSING INFORMATION]` **Data Retention & Archival Policies**: How long completed assessments, draft assessments, and audit logs must be retained before archival or purging.
* `[MISSING INFORMATION]` **Customer Data Deletion Protocol**: Procedure and compliance rules for handling "Right to be Forgotten" (GDPR) or customer account deletion requests.
* `[MISSING INFORMATION]` **Assessment Cloning / Revision Rules**: Exact business rules for branching a new assessment revision from an archived or locked baseline.

### 2.5 Reporting & Deliverable Gaps
* `[MISSING INFORMATION]` **Executive Report Presentation Template**: Official slide deck format, branding color tokens, typography guidelines, and corporate co-branding placement (Dataeko logo + meshIQ logo).
* `[MISSING INFORMATION]` **Export Format Requirements**: Clarification on whether PDF export alone is required or if editable `.pptx` slides must also be generated.
* `[MISSING INFORMATION]` **Customer Sharing & Tokenization**: Whether reports can be shared via secure, password-protected, or expiring public web links.

### 2.6 Enterprise Operations & Infrastructure Gaps
* `[MISSING INFORMATION]` **Target Deployment Environment**: Deployment cloud target (AWS, GCP, Azure, or on-premise containerized environment) and database preferences (PostgreSQL, MySQL, SQLite).
* `[MISSING INFORMATION]` **Backup & Disaster Recovery SLAs**: Required Recovery Point Objective (RPO) and Recovery Time Objective (RTO) for assessment databases.
* `[MISSING INFORMATION]` **Centralized Telemetry / SIEM**: Destination for structured security audit logs (e.g., Datadog, Splunk, CloudWatch, or local database table).
