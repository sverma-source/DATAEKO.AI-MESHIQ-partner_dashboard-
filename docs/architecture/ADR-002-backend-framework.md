# ADR-002: Backend Application Framework Selection

## Context
The application requires a robust, high-performance API backend to manage multi-tenant customer records, orchestrate assessment lifecycles, execute the pure calculation engine, manage immutable snapshots, compile executive reports, and enforce security policies.

## Options Considered
1. **Python 3.11+ / FastAPI**: Modern, asynchronous Python web framework built on Starlette and Pydantic with native OpenAPI documentation generation.
2. **Node.js / Express or NestJS (TypeScript)**: Popular JavaScript runtime. Good async I/O, but weaker native numerical/analytical calculation ergonomics compared to Python.
3. **Go / Gin or Fiber**: High performance compiled language. Excellent raw speed, but slower development iteration cycle for complex, frequently evolving business calculation rule sets.
4. **Java / Spring Boot**: Traditional enterprise framework. High overhead, verbose boilerplate, and heavier infrastructure footprint for early-stage consulting platforms.

## Decision
`[RECOMMENDATION]` **Adopt Python 3.11+ with FastAPI, Pydantic v2, and Uvicorn.**

## Rationale
* **Data Science & Calculation Ergonomics**: Python is the industry standard for analytical calculation engines, statistical modeling, and financial formulas.
* **Pydantic Validation**: Strict schema validation on all inputs and outputs matches our requirement for typed DTOs and controlled error states (`INSUFFICIENT_DATA`).
* **Automatic OpenAPI Specs**: Real-time generation of interactive Swagger/OpenAPI documentation accelerates frontend-backend synchronization.
* **Asynchronous Performance**: Built-in `async/await` ensures high concurrency for API requests and background report generation.

## Consequences
* **Positive**: Rapid development of calculation rules, strict validation, rich analytical libraries, automated API docs.
* **Negative**: Two runtime languages in repo (TypeScript frontend, Python backend), requiring dual CI lint/test pipelines.

## Status
`Needs Review` (Pending Human Approval Gate)
