# ADR-007: Comprehensive Multi-Tier Testing Strategy

## Context
Assessment outputs directly influence multi-million dollar IT modernization and software procurement decisions. Formula errors, regression drift, or data leakage would compromise commercial credibility. A structured, automated testing strategy is required.

## Options Considered
1. **Multi-Tier Testing Pyramid (Unit + Integration + Regression Golden Masters + E2E + Security)**:
   * **Unit**: Pytest for Calculation Engine ($\ge 95\%$ target).
   * **Regression**: Golden Master fixtures matching legacy Excel outputs bit-for-bit.
   * **Integration**: API endpoint & state transition tests.
   * **UI / E2E**: Vitest for components and Playwright for full customer lifecycle.
   * **Security**: Automated tenant boundary and IDOR penetration checks.
2. **E2E-Heavy Testing Only**: Focusing almost exclusively on browser automation tests. Slower test execution, brittle tests, poor debugging for arithmetic edge cases.
3. **Manual QA / Spreadsheet Comparison**: Manual comparison before customer meetings. High risk of human error and regression.

## Decision
`[CONFIRMED]` **Adopt the Multi-Tier Testing Pyramid with mandatory Golden Master Regression Suites.**

## Rationale
* **Calculation Math Verification**: Pure unit tests can evaluate hundreds of edge cases (division by zero, missing inputs, boundary numbers) in seconds.
* **Regression Protection**: Golden Master test fixtures ensure formula changes never silently alter historical calculation snapshots.
* **End-to-End Reliability**: Playwright automates the complete consultant workflow: Customer Creation → Assessment Intake → Calculation → Scenario Modeling → PDF Report Export.

## Consequences
* **Positive**: High confidence in calculation accuracy, rapid refactoring safety, robust security boundary verification.
* **Negative**: Requires upfront investment in authoring and maintaining golden master test fixtures.

## Status
`Accepted` (Directly aligned with Confirmed Requirements `REQ-007`, `REQ-018`, `REQ-020`)
