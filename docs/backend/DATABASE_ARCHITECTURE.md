# Backend Database & Persistence Architecture Specification

**Version:** 1.0.0 (Phase 4 Delivery)  
**Status:** VALIDATED  
**Classification:** Enterprise Multi-Tenant Relational Foundation & Immutable Calculation Snapshots

---

## 1. Domain Model Architecture

The persistence layer is implemented with **SQLAlchemy 2.0 (Async)** and migrated via **Alembic**. It centers around 5 core relational entities:

```mermaid
erDiagram
    TENANT ||--o{ CUSTOMER : owns
    TENANT ||--o{ ASSESSMENT : manages
    TENANT ||--o{ CALCULATION_SNAPSHOT : tracks
    CUSTOMER ||--o{ ASSESSMENT : has
    ASSESSMENT ||--|| ASSESSMENT_RESPONSE : contains
    ASSESSMENT ||--o{ CALCULATION_SNAPSHOT : versions

    TENANT {
        string id PK
        string name
        string slug UK
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    CUSTOMER {
        string id PK
        string tenant_id FK
        string name
        string industry
        string primary_contact_name
        string primary_contact_email
        string notes
        datetime created_at
        datetime updated_at
    }

    ASSESSMENT {
        string id PK
        string tenant_id FK
        string customer_id FK
        string title
        string status
        string assessment_version
        string description
        datetime created_at
        datetime updated_at
    }

    ASSESSMENT_RESPONSE {
        string id PK
        string assessment_id FK,UK
        string q01_company_name
        string q02_industry
        string q03_environment_scale
        decimal q04_weekly_admin_hours
        string q05_mq_role_split
        string q06_frequency_text
        decimal q06_frequency_override
        string q07_labor_hours_text
        decimal q07_labor_hours_override
        string q08_duration_text
        string q09_root_cause_categories
        string q10_problem_types
        string q11_monitoring_status
        string q12_business_impact
        decimal q13_annual_outage_count
        string q14_duration_text
        decimal q14_duration_override
        decimal q15_hourly_cost_override
        string q16_config_management_method
        string q17_audit_frequency
        string q18_audit_effort
        string q19_documentation_effort
        decimal q20_annual_labor_rate
        decimal q21_annual_mq_spend
        string q22_migration_plans
        json raw_responses
        datetime created_at
        datetime updated_at
    }

    CALCULATION_SNAPSHOT {
        string id PK
        string assessment_id FK
        string tenant_id FK
        string calculation_engine_version
        string assessment_version
        datetime calculated_at
        json normalized_inputs
        json computed_metrics
        json summary_metrics
        json assumptions_used
        json benchmarks_used
        json provenance_summary
        datetime created_at
        datetime updated_at
    }
```

---

## 2. Calculation Engine Integration & Single Source of Truth

The backend adheres strictly to the rule that **the calculation engine is the single source of calculation truth**:
* Zero formulas or business calculations exist in FastAPI routes, services, database models, or SQL queries.
* When calculation is requested (`POST /api/v1/assessments/{id}/calculate`), `CalculationService` extracts the stored responses, creates an `AssessmentInputs` dataclass, and executes `calculate_assessment(inputs)`.
* The resulting `CalculationResults` are serialized and stored as an immutable `CalculationSnapshot`.

---

## 3. Transaction Boundaries

1. **Response Persistence**:
   - Updates to `assessment_responses` are transactional.
   - If the assessment was in `DRAFT` status, it atomically transitions to `IN_PROGRESS`.
2. **Calculation Execution & Snapshot Persistence**:
   - `CalculationSnapshot` creation and assessment transition to `CALCULATED` status occur in a single atomic database transaction.
   - If snapshot insertion fails, status changes are rolled back.
3. **Assessment Deletion**:
   - Deleting an `Assessment` cascades to its `AssessmentResponse` and all associated `CalculationSnapshot` rows.

---

## 4. Multi-Tenant Security & Defense in Depth

* Every database query is scoped to `tenant_id` supplied via header `X-Tenant-ID` (with a secure default for single-tenant mode).
* Foreign keys enforce tenant consistency across customers, assessments, and snapshots.
* Direct object references without tenant scoping (anti-IDOR) are prohibited at the repository/service layer.

---

## 5. API Endpoints Catalog (`/api/v1`)

| Method | Path | Summary | Transaction Scope |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | System, database, and calculation engine health check. | Read-only |
| `POST` | `/customers` | Create a new enterprise customer record. | Commit on success |
| `GET` | `/customers` | List customers for current tenant. | Read-only |
| `GET` | `/customers/{id}` | Get customer details. | Read-only |
| `PUT` | `/customers/{id}` | Update customer details. | Commit on success |
| `DELETE` | `/customers/{id}` | Delete customer and cascade. | Commit on success |
| `POST` | `/assessments` | Create assessment for a verified customer. | Commit on success |
| `GET` | `/assessments` | List assessments (optional `customer_id` filter). | Read-only |
| `GET` | `/assessments/{id}` | Get assessment detail (with customer, responses, latest snapshot). | Read-only |
| `PUT` | `/assessments/{id}` | Update assessment metadata (title, description, status). | Commit on success |
| `PUT` | `/assessments/{id}/responses` | Save or update Q01-Q22 responses (transitions to `IN_PROGRESS`). | Atomic commit |
| `GET` | `/assessments/{id}/responses` | Retrieve saved responses. | Read-only |
| `POST` | `/assessments/{id}/calculate` | Run calculation engine & persist immutable snapshot. | Atomic commit |
| `GET` | `/assessments/{id}/snapshots` | List historical calculation snapshots. | Read-only |
| `GET` | `/assessments/{id}/snapshots/latest` | Retrieve latest calculation snapshot. | Read-only |
| `DELETE` | `/assessments/{id}` | Delete assessment and cascade. | Commit on success |
