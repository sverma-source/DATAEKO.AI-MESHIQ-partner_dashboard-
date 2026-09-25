# ADR-005: Decoupled Headless Pure Calculation Engine

## Context
The calculation engine is the computational foundation of the DATAEKO × meshIQ Partner Dashboard. In legacy systems (Excel), calculations are tightly coupled to spreadsheet UI cells. In the web platform, we must guarantee testability, determinism, reproducibility, versioning, and zero UI dependency.

## Options Considered
1. **Pure Headless Python Calculation Package**: A zero-dependency computational module that takes normalized in-memory DTOs and produces immutable calculation snapshots.
2. **Database-Stored SQL Calculations / Stored Procedures**: Performing calculation math inside PostgreSQL stored functions or views.
3. **Frontend-Driven TypeScript Calculations**: Performing calculations directly in the browser React components.

## Decision
`[CONFIRMED]` **Implement the Calculation Engine as a Pure, Headless Python Package (`core/calculation_engine`).**

## Rationale
* **Zero UI & Zero Database Dependencies**: The engine has no database calls, no HTTP requests, and no UI bindings. It can be tested in complete isolation using pure unit tests.
* **Deterministic & Reproducible**: Given the same input dictionary, rule version, and benchmark catalog, it outputs identical results every time.
* **Versioned Rule Sets**: Calculation rules reside in versioned submodules (e.g., `rules/v1_0_0/`), allowing historical assessments to execute their exact historical rule versions without regression drift.
* **Controlled States**: Natively maps missing or invalid data into controlled evaluation wrappers (`INSUFFICIENT_DATA`, `CANNOT_CALCULATE`), preventing spreadsheet `#VALUE!` errors.

## Consequences
* **Positive**: High testability ($\ge 95\%$ coverage target), portable across CLI/Web/batch tools, robust audit provenance.
* **Negative**: Requires maintaining explicit serialization/deserialization DTOs between the database and the calculation engine.

## Status
`Accepted` (Directly aligned with Confirmed Requirements `REQ-002`, `REQ-006`, `REQ-007`)
