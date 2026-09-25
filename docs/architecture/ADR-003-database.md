# ADR-003: Database & Persistence Layer Selection

## Context
The platform requires a persistent database to manage enterprise organizations, customers, versioned question sets, assessment responses, calculation snapshots, audit logs, and user sessions. The system demands strict relational integrity, JSON document storage for calculation snapshots, and strong tenant isolation.

## Options Considered
1. **PostgreSQL 16 (Relational + JSONB)**: Open-source enterprise relational database with native JSONB support, Row-Level Security (RLS), full-text search, and ACID compliance.
2. **MySQL 8.0**: Mature relational database, but inferior JSON querying capabilities, lacks native Row-Level Security features, and has less flexible indexing for audit logs.
3. **MongoDB / DocumentDB**: Document database. Flexible schema, but lacks native relational constraints and foreign keys required for strict customer-assessment-user ownership boundaries.
4. **SQLite**: Embedded database. Good for single-user desktop tools, but unsuitable for multi-tenant concurrent enterprise web applications.

## Decision
`[RECOMMENDATION]` **Adopt PostgreSQL 16 managed via SQLAlchemy 2.0 (async) and Alembic migrations.**

## Rationale
* **Relational Integrity**: Enforces strict customer ownership, assessment lifecycles, and user access boundaries via foreign keys and constraints.
* **JSONB for Snapshots**: Allows storing complex, versioned calculation output trees (`computed_metrics`, `input_trace`) in indexed JSONB columns without losing queryability.
* **Row-Level Security (RLS)**: Provides a defense-in-depth security boundary ensuring multi-tenant data isolation at the database engine level.
* **Audit Trail**: Reliable timestamping, transactional consistency, and append-only table structures.

## Consequences
* **Positive**: High reliability, enterprise security standards, flexible snapshot modeling, industry-standard tooling.
* **Negative**: Requires provisioning and maintaining a PostgreSQL instance in development and deployment environments.

## Status
`Needs Review` (Pending Human Approval Gate)
