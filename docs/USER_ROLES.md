# Proposed User Roles & Access Governance

> **Document Status**: `FOUNDATION PHASE 0B`  
> **Last Updated**: 2026-09-25  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN QUESTION]`

---

## 1. Notice of Proposed Scope

`[CONFIRMED]` The role definitions and permission structures detailed in this document are **proposed models** subject to formal stakeholder review and confirmation. RBAC implementation is deferred to subsequent implementation phases.

---

## 2. Proposed Role Profiles

### 2.1 System Administrator (`ROLE_ADMIN`)
* `[RECOMMENDATION]` **Profile**: Technical and operational administrators managing platform health, user provisioning, global configuration, and security audits.
* **Proposed Responsibilities**:
  * Manage organizations and user accounts.
  * Configure and publish Question Sets and Calculation Rule versions.
  * Maintain benchmark assumption databases.
  * Access comprehensive system audit logs and diagnostic telemetry.

### 2.2 Dataeko Consultant / Sales Representative (`ROLE_DATAEKO_CONSULTANT`)
* `[RECOMMENDATION]` **Profile**: Primary client-facing practitioners who initiate, facilitate, and present assessment engagements.
* **Proposed Responsibilities**:
  * Create customer profiles and initiate new assessments.
  * Facilitate data collection interviews and enter assessment responses.
  * Execute calculations, analyze cost drivers, and adjust improvement scenarios.
  * Generate and deliver executive reports to customer stakeholders.

### 2.3 meshIQ Product Specialist (`ROLE_MESHIQ_SPECIALIST`)
* `[RECOMMENDATION]` **Profile**: Subject matter experts from meshIQ providing technical oversight, benchmark calibration, and product optimization guidance.
* **Proposed Responsibilities**:
  * Review assessment parameters for complex MQ / multi-broker topologies.
  * Validate efficiency improvement assumptions and meshIQ capability mappings.
  * Assist in co-authoring specialized customer findings.

### 2.4 Enterprise Customer User (`ROLE_CUSTOMER_USER`)
* `[RECOMMENDATION]` **Profile**: Client-side IT/infrastructure leaders or analysts granted direct platform access.
* **Proposed Responsibilities**:
  * View assigned assessment progress.
  * Complete direct question intake sections (if self-service intake is enabled).
  * Review finalized executive dashboards and interactive reports.
  * Strict boundary: Strictly isolated to their own organization's assessment instances.

---

## 3. Proposed Permissions Matrix

`[RECOMMENDATION]` The conceptual access control matrix:

| Capability / Resource | System Admin | Dataeko Consultant | meshIQ Specialist | Customer User |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Organizations & Users** | ✅ Full | ❌ None | ❌ None | ❌ None |
| **Edit Calculation Rules & Benchmarks** | ✅ Full | ❌ Read Only | ⚠️ Propose/Review | ❌ None |
| **Create New Customer & Assessment** | ✅ Full | ✅ Full | ❌ None | ❌ None |
| **Enter / Edit Assessment Responses** | ✅ Full | ✅ Assigned Only | ⚠️ Assigned Only | ⚠️ Assigned (Self-service) |
| **Execute Calculation Engine** | ✅ Full | ✅ Assigned Only | ✅ Assigned Only | ❌ None |
| **Adjust Scenario Modeling Levers** | ✅ Full | ✅ Assigned Only | ✅ Assigned Only | 👁️ View Only |
| **Generate & Download Executive Report**| ✅ Full | ✅ Assigned Only | ✅ Assigned Only | 👁️ View / Download |
| **View Audit Logs** | ✅ Global | ⚠️ Assessment Level | ⚠️ Assessment Level | ❌ None |

---

## 4. Open Questions Regarding Roles

* `[OPEN QUESTION]` Will Customer Users have direct login access in Phase 1, or will all initial assessments be consultant-driven?
* `[OPEN QUESTION]` Do meshIQ Specialists belong to the same organizational tenancy as Dataeko Consultants, or do they reside in a distinct partner organization tenant?
* `[OPEN QUESTION]` Is single sign-on (SSO) required for enterprise customers and partner teams (e.g., Azure AD / Okta)?
