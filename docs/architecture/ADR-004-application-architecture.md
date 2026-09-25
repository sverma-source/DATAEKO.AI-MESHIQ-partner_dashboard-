# ADR-004: Application Architecture & Modular Monolith Pattern

## Context
We must determine the macro-architectural boundary structure for the application. The system requires multiple logical domains: Customer Management, Assessment Intake, Calculation Engine, Scenario Modeling, Reporting, and Audit Logging.

## Options Considered
1. **Modular Monolith**: A single, well-structured codebase with strictly enforced internal domain boundaries and independent layers (API, Domain Services, Pure Calculation Core, Repositories).
2. **Microservices Architecture**: Splitting the system into independent services (Auth Service, Assessment Service, Calculation Service, Report Service) communicating over gRPC or HTTP.
3. **Serverless Functions**: Deploying individual calculation and report generation endpoints as AWS Lambda / GCP Cloud Functions.

## Decision
`[RECOMMENDATION]` **Adopt a Modular Monolith architecture for Phase 1.**

## Rationale
* **Avoid Premature Complexity**: Microservices introduce significant operational overhead (distributed tracing, network latency, distributed transactions, complex CI/CD) without business justification for an early-stage assessment portal.
* **Tight Calculation Integration**: Application services can invoke the pure calculation engine in-memory with sub-millisecond latency, avoiding network serialization penalties.
* **Clear Future Extraction Path**: Because the calculation engine and report builder are designed as zero-dependency domain packages, they can easily be extracted into dedicated microservices or serverless functions later if scale demands it.

## Consequences
* **Positive**: Simple deployment (single backend container), fast local development, atomic transactional consistency, low infrastructure cost.
* **Negative**: Scaling is applied to the entire monolith rather than individual sub-components (acceptable for initial enterprise assessment volumes).

## Status
`Needs Review` (Pending Human Approval Gate)
