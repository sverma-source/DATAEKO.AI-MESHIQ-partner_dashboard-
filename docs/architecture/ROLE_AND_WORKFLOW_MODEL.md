# DATAEKO × meshIQ Partner Dashboard: Role & Workflow Model

**IBM MQ Economic Cost & Efficiency Assessment**  
**Document Version**: 1.0.0  
**Status**: Authoritative Architectural Specification  

---

## 1. Overview & Core Product Principles

The DATAEKO × meshIQ Partner Dashboard serves three primary product personas mapped to five canonical backend roles. The system enforces strict separation of responsibilities:

* **CLIENT (`CUSTOMER_USER`) = RESPONDENT / ASSESSMENT OWNER**  
  The Client is the assessment intake participant. They create/open their own assessment, complete the discovery questionnaire (Q01–Q22 across Sections A–G), review responses, submit the assessment, and view their finalized read-only answers. Clients never see internal financial calculations, FTE burden rates, benchmark metrics, or other clients.
* **CONSULTANT (`CONSULTANT`) = ENGAGEMENT REVIEWER / ANALYST**  
  The Consultant analyzes submitted assessments across authorized customers in their tenant. They review responses, inspect the 12-category Consultant Summary, explore authoritative calculation outputs on the Executive Dashboard, model outcomes in the Scenario Sandbox, and generate Executive Deliverables (PDF/CSV).
* **ADMINISTRATOR (`CUSTOMER_ADMIN`, `PARTNER_ADMIN`, `PLATFORM_ADMIN`) = GOVERNANCE & OPERATIONS**  
  Administrators govern users, customers, assessments, audit events, and tenant scopes according to their explicit authorization level.

---

## 2. Canonical Backend Roles & Product Personas

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRODUCT PERSONAS                              │
├─────────────────────┬───────────────────────────┬──────────────────────┤
│       CLIENT        │        CONSULTANT         │    ADMINISTRATOR     │
├─────────────────────┼───────────────────────────┼──────────────────────┤
│    CUSTOMER_USER    │        CONSULTANT         │    CUSTOMER_ADMIN    │
│                     │                           │    PARTNER_ADMIN     │
│                     │                           │    PLATFORM_ADMIN    │
└─────────────────────┴───────────────────────────┴──────────────────────┘
```

### A. CLIENT (`CUSTOMER_USER`)
* **Persona**: Client Respondent / Customer Assessment Owner
* **Tenant Scope**: Bound to their assigned tenant (`tenant_id`).
* **Customer Scope**: Bound to their assigned customer organization (`customer_id`).
* **Assessment Scope**: User-level ownership (`Assessment.created_by_user_id == current_user.id`).
* **Response Scope**: Can read and edit draft responses for their own assessment; becomes strictly read-only post-submission.
* **Calculation Permissions**: None. Manual calculation endpoints return `403 Forbidden`.
* **Snapshot Permissions**: None. Calculation snapshots are sanitized (`latest_snapshot = None`) in API responses.
* **Report Permissions**: None. Executive report deliverables return `403 Forbidden`.
* **Scenario Permissions**: None. No access to Scenario Sandbox.
* **Audit Permissions**: None. `GET /api/v1/audit-events` returns `403 Forbidden`.
* **Management Permissions**: None (no user, customer, or tenant management).
* **Submission Permissions**: Can submit their own assessment (`POST /api/v1/assessments/{id}/submit`).
* **Edit Permissions**: Can update draft responses; strictly blocked once status is `SUBMITTED`.
* **Delete Permissions**: None. Assessment deletion returns `403 Forbidden`.
* **Download Permissions**: None for internal executive deliverables.
* **Cross-Tenant Permissions**: None.
* **Frontend Workspace**: Client Assessment Workspace (`My Assessment` wizard, `ReviewSummary`, `SubmittedResponsesView`).

---

### B. CONSULTANT (`CONSULTANT`)
* **Persona**: Advisory Consultant / Economic Analyst
* **Tenant Scope**: Bound to their partner tenant (`tenant_id`).
* **Customer Scope**: All customers within the active partner tenant.
* **Assessment Scope**: All assessments belonging to customers within their tenant.
* **Response Scope**: Full read-only review of Q01–Q22 responses across all client submissions.
* **Calculation Permissions**: Can trigger calculations (`POST /api/v1/assessments/{id}/calculate`).
* **Snapshot Permissions**: Full access to latest and historical snapshots (`GET /snapshots`, `GET /snapshots/latest`).
* **Report Permissions**: Full access to Executive Report, PDF, and CSV deliverable generation.
* **Scenario Permissions**: Full access to Scenario Sandbox (10% troubleshooting and 25% efficiency levers).
* **Audit Permissions**: Can read tenant audit logs (`GET /api/v1/audit-events`).
* **Management Permissions**: Can create and update customers within tenant. No user/tenant deletion.
* **Submission Permissions**: Can support client submission if required.
* **Edit Permissions**: Draft assessment support; submitted assessments remain immutable.
* **Delete Permissions**: Can delete draft/test assessments within tenant.
* **Download Permissions**: Full access to PDF and CSV deliverables.
* **Cross-Tenant Permissions**: None. Cannot access other tenants.
* **Frontend Workspace**: Consultant Workspace (`Customer & Assessment Portfolio`, `Response Review`, `Consultant Summary`, `Executive Dashboard`, `Scenario Sandbox`, `Executive Report`).

---

### C. CUSTOMER ADMIN (`CUSTOMER_ADMIN`)
* **Persona**: Customer Organization Administrator
* **Tenant Scope**: Active tenant.
* **Customer Scope**: Bound to their specific customer organization.
* **Assessment Scope**: All assessments created within their customer organization.
* **Response Scope**: Full read visibility into customer organization assessments.
* **Calculation Permissions**: Can execute calculations for their customer assessments.
* **Snapshot Permissions**: Can view calculation snapshots for their customer assessments.
* **Report Permissions**: Can generate reports for their customer assessments.
* **Scenario Permissions**: Can access Scenario Sandbox for their customer assessments.
* **Audit Permissions**: None.
* **Management Permissions**: Customer-level management.
* **Cross-Tenant Permissions**: None.
* **Frontend Workspace**: Admin Workspace (Customer Administration Scope).

---

### D. PARTNER ADMIN (`PARTNER_ADMIN`)
* **Persona**: Partner Tenant Administrator / Practice Lead
* **Tenant Scope**: Active partner tenant.
* **Customer Scope**: All customers within the partner tenant.
* **Assessment Scope**: All assessments within the partner tenant.
* **Response Scope**: Full visibility into all assessments and responses within tenant.
* **Calculation Permissions**: Full calculation execution.
* **Snapshot Permissions**: Full snapshot access.
* **Report Permissions**: Full report generation.
* **Scenario Permissions**: Full scenario modeling.
* **Audit Permissions**: Full tenant audit log visibility.
* **Management Permissions**: Tenant user management, customer management, assessment governance.
* **Cross-Tenant Permissions**: None.
* **Frontend Workspace**: Admin Workspace (Partner Tenant Scope).

---

### E. PLATFORM ADMIN (`PLATFORM_ADMIN`)
* **Persona**: Global System Administrator / Platform Operations
* **Tenant Scope**: Global cross-tenant access. Can explicitly specify `X-Tenant-ID` header to inspect/manage any tenant.
* **Customer Scope**: Global.
* **Assessment Scope**: Global.
* **Response Scope**: Global.
* **Calculation Permissions**: Global.
* **Snapshot Permissions**: Global.
* **Report Permissions**: Global.
* **Scenario Permissions**: Global.
* **Audit Permissions**: Global across all tenants.
* **Management Permissions**: Full system administration (tenants, users, customers, system settings).
* **Cross-Tenant Permissions**: Authorized via `X-Tenant-ID` header resolution in `get_current_tenant_id()`.
* **Frontend Workspace**: Admin Workspace (Platform Administration Scope).

---

## 3. Capability & Permission Matrix

| Capability / Action | Client (`CUSTOMER_USER`) | Consultant (`CONSULTANT`) | Customer Admin (`CUSTOMER_ADMIN`) | Partner Admin (`PARTNER_ADMIN`) | Platform Admin (`PLATFORM_ADMIN`) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Authentication & Session** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Own Profile** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Own Customer** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Other Customers** | ❌ | ✅ (In Tenant) | ❌ | ✅ (In Tenant) | ✅ (Global) |
| **Create Assessment** | ✅ (Self-Owned) | ✅ | ✅ | ✅ | ✅ |
| **Answer / Edit Q01–Q22 Draft** | ✅ (Own Draft) | Support | Support | Support | Support |
| **Save Draft & Resume** | ✅ (Own Draft) | ✅ | ✅ | ✅ | ✅ |
| **Review All Responses** | ✅ (Own Draft) | ✅ | ✅ | ✅ | ✅ |
| **Submit Assessment** | ✅ (Own Draft) | Support | Support | Support | Support |
| **Edit Submitted Responses** | ❌ (Immutable) | ❌ (Immutable) | ❌ (Immutable) | ❌ (Immutable) | ❌ (Governed) |
| **View Finalized Responses** | ✅ (Own Only) | ✅ (In Tenant) | ✅ (In Org) | ✅ (In Tenant) | ✅ (Global) |
| **Execute Calculation Engine** | ❌ *(403)* | ✅ | ✅ | ✅ | ✅ |
| **View Calculation Snapshot** | ❌ *(Sanitized)* | ✅ | ✅ | ✅ | ✅ |
| **View Consultant Summary** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **View Executive Dashboard** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Use Scenario Sandbox** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **View Executive Report** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Download PDF Deliverable** | ❌ *(403)* | ✅ | ✅ | ✅ | ✅ |
| **Download CSV Deliverable** | ❌ *(403)* | ✅ | ✅ | ✅ | ✅ |
| **View Audit Trail** | ❌ *(403)* | ✅ | ❌ *(403)* | ✅ | ✅ |
| **Manage Users & Roles** | ❌ | ❌ | ❌ | ✅ (In Tenant) | ✅ (Global) |
| **Manage Customers** | ❌ | ✅ | ✅ (Own Org) | ✅ (In Tenant) | ✅ (Global) |
| **Cross-Tenant Access (`X-Tenant-ID`)** | ❌ *(Denied)* | ❌ *(Denied)* | ❌ *(Denied)* | ❌ *(Denied)* | ✅ |

---

## 4. Frontend Route & Navigation Architecture

```
                                    /login
                                      │
                                (Authenticate)
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
                / (Role Dispatcher)        Unauthenticated → /login
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
CUSTOMER_USER      CONSULTANT      ADMIN ROLES
(Client View)   (Consultant View)  (Admin View)
       │                │                │
┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
│ Intake Form │  │ Portfolio   │  │ Users       │
│ Review      │  │ Responses   │  │ Customers   │
│ Submitted   │  │ Summary     │  │ Assessments │
└─────────────┘  │ Dashboard   │  │ Audit Logs  │
                 │ Sandbox     │  │ Tenants     │
                 │ Report      │  └─────────────┘
                 └─────────────┘
```

---

## 5. Backend Authorization Enforcement

1. **Authentication Token**: Extracted via `access_token` HTTP-only cookie or `Authorization: Bearer <token>` header.
2. **Tenant Scoping**: Enforced via `get_current_tenant_id` in `backend/app/api/deps.py`.
3. **Assessment Ownership**: Checked via `check_assessment_access(assessment, user_id, user_role)` in `backend/app/api/v1/assessments.py`.
4. **Data Leakage Prevention**: In `GET /assessments/{id}` and `POST /assessments/{id}/submit`, `latest_snapshot` is explicitly forced to `None` for `CUSTOMER_USER`.
5. **Endpoint Guards**: Calculation (`POST /calculate`), snapshots (`GET /snapshots/*`), deliverables (`GET /deliverables/*`), and audit logs (`GET /audit-events`) return `HTTP 403 Forbidden` if invoked by `CUSTOMER_USER`.
