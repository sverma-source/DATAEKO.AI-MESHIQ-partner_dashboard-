# 07. Database Architecture & Data Model

> **Status**: IMPLEMENTED  
> **Source Directory**: [`backend/app/models/`](file:///Users/roop/DATAEKO.AI-MESHIQ-partner_dashboard-/backend/app/models/), [`backend/alembic/versions/`](file:///Users/roop/DATAEKO.AI-MESHIQ-partner_dashboard-/backend/alembic/versions/)

---

## 1. Database Architecture & Engine Drivers

The platform utilizes **SQLAlchemy 2.0 Async** ORM with support for dual database backends:
- **Local Development**: SQLite via `aiosqlite` (`sqlite+aiosqlite:///./test.db`).
- **Production / Staging**: PostgreSQL via `asyncpg` (`postgresql+asyncpg://user:pass@host:5432/dbname`).

All schema modifications are strictly managed through sequential **Alembic** migrations.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    TENANT ||--o{ CUSTOMER : owns
    TENANT ||--o{ USER : contains
    TENANT ||--o{ ASSESSMENT : scopes
    TENANT ||--o{ CALCULATION_SNAPSHOT : archives
    TENANT ||--o{ AUDIT_EVENT : logs

    CUSTOMER ||--o{ USER : employs
    CUSTOMER ||--o{ ASSESSMENT : owns

    USER ||--o{ ASSESSMENT : creates
    USER ||--o{ USER_CREDENTIAL_TOKEN : issues
    USER ||--o{ AUDIT_EVENT : triggers

    ASSESSMENT ||--|| ASSESSMENT_RESPONSE : contains
    ASSESSMENT ||--o{ CALCULATION_SNAPSHOT : produces

    TENANT {
        uuid id PK
        string name
        string slug UK
        boolean is_active
        datetime created_at
    }

    CUSTOMER {
        uuid id PK
        uuid tenant_id FK
        string name
        string industry
        string region
        boolean is_active
        datetime created_at
    }

    USER {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK "nullable"
        string email UK
        string hashed_password
        string full_name
        string role "PLATFORM_ADMIN, PARTNER_ADMIN, CONSULTANT, CUSTOMER_ADMIN, CUSTOMER_USER"
        integer auth_version "Default: 1"
        boolean is_active
        datetime created_at
    }

    USER_CREDENTIAL_TOKEN {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        string token_type "INVITATION, PASSWORD_RESET"
        datetime expires_at
        datetime used_at "nullable"
        datetime created_at
    }

    ASSESSMENT {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        uuid created_by_user_id FK "nullable"
        string title
        string status "DRAFT, SUBMITTED, CALCULATED, ARCHIVED"
        string version
        datetime created_at
        datetime updated_at
    }

    ASSESSMENT_RESPONSE {
        uuid id PK
        uuid assessment_id FK UK
        string q01_company_name
        string q02_industry
        string q03_environment_scale
        numeric q04_weekly_admin_hours "Stores exact quarterly hours"
        string q06_incident_frequency
        string q07_investigation_hours
        numeric q08_diagnostics_clock_hours
        numeric q14_outage_duration
        numeric q15_downtime_hourly_cost
        numeric q20_loaded_hourly_rate
        numeric q21_annual_mq_spend
        jsonb raw_responses "Full 22 question key-value map"
        datetime created_at
        datetime updated_at
    }

    CALCULATION_SNAPSHOT {
        uuid id PK
        uuid assessment_id FK
        uuid tenant_id FK
        string engine_version "1.0.0"
        string rules_version "calc-rules-v1.0.0"
        string calculation_status "VALID, INSUFFICIENT_DATA"
        jsonb computed_metrics "All calculated metrics"
        jsonb summary_metrics "Executive rollup metrics"
        jsonb assumptions "Applied constants & baselines"
        jsonb scenarios "Model-projected scenarios"
        jsonb audit_trail "Execution metadata"
        datetime created_at
    }

    AUDIT_EVENT {
        uuid id PK
        uuid tenant_id FK "nullable"
        uuid user_id FK "nullable"
        string action "LOGIN, ASSESSMENT_SUBMIT, USER_CREATE, etc."
        string resource_type
        string resource_id "nullable"
        jsonb details
        string ip_address
        datetime created_at
    }
```

---

## 3. Authoritative Alembic Migrations

| Migration | Version Identifier | Purpose & Schema Scope |
| :--- | :--- | :--- |
| **0001** | `0001_initial_schema.py` | Baseline tables: `tenants`, `customers`, `users`, `assessments`, `assessment_responses`, `calculation_snapshots`, `audit_events`. |
| **0002** | `0002_calc_snapshots_idx.py` | Indexes on `calculation_snapshots (assessment_id, created_at DESC)` for fast snapshot retrieval. |
| **0003** | `0003_assessment_created_by.py` | Adds `created_by_user_id` foreign key on `assessments` for individual client assessment ownership. |
| **0004** | `0004_user_customer_id.py` | Adds `customer_id` foreign key on `users` for `CUSTOMER_ADMIN` and `CUSTOMER_USER` scoping. |
| **0005** | `0005_user_credential_tokens.py` | Adds `user_credential_tokens` table for SHA-256 invitation and password reset token management. |
| **0006** | `0006_user_auth_version.py` | Adds `auth_version` integer column on `users` table for instant JWT session invalidation. |

---

## 4. Key Table Columns & Data Constraints

### A. `assessments` Table
- `status`: Enum (`DRAFT`, `SUBMITTED`, `CALCULATED`, `ARCHIVED`).
- **Immutability Contract**: When `status == 'SUBMITTED'`, subsequent direct `PUT /responses` API requests are rejected by the service layer with `HTTP 409 Conflict`.

### B. `assessment_responses` Table
- `q04_weekly_admin_hours`: Note on legacy naming: Column name retains `q04_weekly_admin_hours: Numeric(10, 2)` for backward compatibility, but its **authoritative value represents exact quarterly hours**.
- `raw_responses`: JSONB dictionary containing the complete state of all 22 questions, options, text overrides, and flags.

### C. `calculation_snapshots` Table (Immutable Record)
- Persists exact calculation runs. Once written, records in this table are **NEVER modified or deleted**.
- All reporting, dashboards, PDF generators, and CSV exporters read strictly from snapshot columns.

---
