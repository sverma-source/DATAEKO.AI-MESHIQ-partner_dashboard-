# DATAEKO × meshIQ Partner Dashboard: Assessment Lifecycle & Workflow Model

**IBM MQ Economic Cost & Efficiency Assessment**  
**Document Version**: 1.0.0  
**Status**: Authoritative Lifecycle Specification  

---

## 1. Overview

The assessment lifecycle represents the complete progression of an IBM MQ Economic Assessment from initial customer onboarding, through discovery question intake, final submission, automated calculation snapshotting, to consultant analysis and executive reporting.

---

## 2. Assessment State Machine

```
                 [ CREATE ASSESSMENT ]
                           │
                           ▼
                      [  DRAFT  ]
                           │
                 (Answers In Progress)
                           │
                           ▼
                   [ IN_PROGRESS ]
                           │
                 (Review All Answers)
                           │
                           ▼
                  (Submit Assessment)
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      [  SUBMITTED  ]          [ CALCULATION SNAPSHOT ]
  (Responses Immutable)        (Pure Decimal Engine)
              │                         │
              ├─────────────────────────┤
              ▼                         ▼
   [ CLIENT READ-ONLY VIEW ]   [ CONSULTANT WORKSPACE ]
   - Finalized Q01–Q22         - 12-Section Summary
   - Submission Timestamp      - Executive Dashboard
   - Provenance Identifiers    - Scenario Sandbox (10%/25%)
                               - Executive PDF/CSV Reports
```

### State Definitions
1. **`DRAFT`**: Assessment initialized with customer linkage and default responses baseline.
2. **`IN_PROGRESS`**: Discovery questionnaire responses (Q01–Q22 across Sections A–G) actively populated and persisted.
3. **`SUBMITTED`**: Discovery intake is complete and locked by the client. Responses become strictly immutable. The backend atomically generates an immutable `CalculationSnapshot` and logs `ASSESSMENT_SUBMITTED`.

---

## 3. Persona Lifecycles & Interaction Models

### A. Client Lifecycle (`CUSTOMER_USER`)
```
[ Login ]
    ↓
[ My Assessment Intake ]
    ↓
[ Sections A–G: Q01–Q22 ]
    ↓ (Autosave / Save Draft)
[ Review All Responses ]
    ↓ (Edit Section if needed)
[ Confirm & Submit Assessment ]
    ↓
[ Finalized Read-Only Submitted View ]
```
* **Respondent Model**: The client is exclusively a respondent.
* **Post-Submission State**: Transition to `SubmittedResponsesView`. Read-only view of finalized answers. No internal economic metrics, labor burdens, calculation snapshots, or consultant analysis are returned or rendered.

---

### B. Consultant Lifecycle (`CONSULTANT`)
```
[ Login ]
    ↓
[ Consultant Workspace ]
    ↓
[ Customer & Assessment Portfolio ]
    ↓
[ Open Submitted Assessment ]
    ├─► [ Read-Only Q01–Q22 Response Review ]
    ├─► [ Consultant 12-Section Assessment Summary ]
    ├─► [ Executive KPI Dashboard ]
    ├─► [ Scenario Sandbox (10% & 25% levers) ]
    └─► [ Executive Report Deliverables (PDF & CSV) ]
```
* **Analyst Model**: The consultant reviews submitted data, interprets economic friction, presents findings, and delivers ROI projections.

---

### C. Administrator Lifecycle (`ADMIN` Roles)
```
[ Login ]
    ↓
[ Admin Governance Workspace ]
    ├─► [ User Management & Role Scopes ]
    ├─► [ Customer Management ]
    ├─► [ Assessment Registry & Statuses ]
    ├─► [ Append-Only Audit Trail Viewer ]
    └─► [ Tenant Management (Platform Scope) ]
```
* **Governance Model**: Administrators maintain user access, enterprise customer boundaries, compliance audit logs, and multi-tenant isolation.

---

## 4. Immutability & Audit Guarantees

1. **Response Immutability**: Once an assessment reaches `SUBMITTED` status, `PUT /assessments/{id}/responses` is rejected with `HTTP 400 (AssessmentAlreadySubmittedError)`.
2. **Calculation Idempotency**: Submission triggers calculation engine execution exactly once. Re-submitting an already submitted assessment is idempotent and returns the existing finalized state without re-running calculation.
3. **Audit Trail**: Every state change (`ASSESSMENT_CREATED`, `ASSESSMENT_RESPONSES_SAVED`, `ASSESSMENT_SUBMITTED`, `CALCULATION_EXECUTED`) produces an immutable record in `audit_events`.
