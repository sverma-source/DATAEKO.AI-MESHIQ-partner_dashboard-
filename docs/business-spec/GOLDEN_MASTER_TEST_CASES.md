# Golden Master Test Cases & Verification Specification

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION (RECONCILED)`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`

---

## 1. Test Strategy & Validation Protocol

`[CONFIRMED]` The Golden Master suite defines the normative test cases required to verify that the future software calculation engine produces results identical to the legacy Excel workbook.

> **CRITICAL VERIFICATION DISTINCTION**:  
> * **Golden Master Test Definitions**: `[COMPLETED / ESTABLISHED]` (Formally documented below).  
> * **Golden Master Execution & Parity Validation**: `[PENDING]` (Execution will occur in Phase 3 when the headless calculation engine code is executed and compared against known Excel test fixtures).

---

## 2. Test Case Fixture Catalog

### TC-01: Standard Baseline Assessment (Default Rates)
* **Description**: Mid-market enterprise with standard frequency, moderate maintenance, and default labor rates.
* **Inputs**:
  * Q04 (Quarterly Admin Hours): `80`
  * Q06 (Trb Frequency): `About weekly` (52 events)
  * Q07 (Staff Hours/Investigation): `3–5 hours` (4.0 hrs)
  * Q12 (Business Impact): `Significant`
  * Q14 (Disruption Duration): `1.5–4 hours` (2.75 hrs)
  * Q15 (Financial Rate): `Blank` (Triggers ITIC $300,000/hr)
  * Q20 (Loaded Labor Cost): `Blank` (Defaults to $180,000/yr)
* **Expected Deterministic Outputs**:
  * Annual Admin Hours ($H_{admin}$): $80 \times 4 = \mathbf{320.0 \text{ hrs}}$
  * Annual Trb Hours ($H_{trb}$): $52 \times 4.0 = \mathbf{208.0 \text{ hrs}}$
  * Loaded Hourly Rate ($R_{hr}$): $\$180,000 / 2,080 = \mathbf{86.5384615... \text{ / hr}}$
  * Annual Admin Labor Cost ($C_{admin}$): $320 \times \$86.5384615... = \mathbf{\$27,692.31}$
  * Annual Trb Labor Cost ($C_{trb}$): $208 \times \$86.5384615... = \mathbf{\$18,000.00}$
  * Total Quantified Labor ($C_{total}$): $\mathbf{\$45,692.31}$
  * Operational FTE Burden: $528 / 2,080 = \mathbf{0.2538... \text{ FTE}}$
  * Potential Financial Exposure: $2.75 \times \$300,000 = \mathbf{\$825,000.00}$
  * Admin Hours Recovered ($H_{rec\_admin}$): $320 \times 0.50 \times 0.50 = \mathbf{80.0 \text{ hrs}}$
  * Investigation Hours Recovered ($H_{rec\_inv}$): $208 \times 0.25 = \mathbf{52.0 \text{ hrs}}$
  * Total Recovered Hours ($H_{rec\_total}$): $80 + 52 = \mathbf{132.0 \text{ hrs}}$
  * Illustrative Economic Value: $132 \times \$86.5384615... = \mathbf{\$11,423.08}$
  * Troubleshooting Productivity Opportunity: $\$18,000 \times 0.10 = \mathbf{\$1,800.00}$
* **Execution Status**: `[PENDING PHASE 3 EXECUTION]`

---

### TC-02: Customer Fact Overrides (Custom Rates)
* **Description**: Enterprise with customer-provided labor rate and custom downtime impact.
* **Inputs**:
  * Q04: `250`
  * Q06: `Multiple times per week` (104 events)
  * Q07: `6–10 hours` (8.0 hrs)
  * Q12: `Critical`
  * Q14: `4–8 hours` (6.0 hrs)
  * Q15 (Financial Rate): `\$500,000` (`[CUSTOMER_FACT]`)
  * Q20 (Loaded Labor Cost): `\$240,000` (`[CUSTOMER_FACT]`)
* **Expected Deterministic Outputs**:
  * Annual Admin Hours: $250 \times 4 = \mathbf{1,000.0 \text{ hrs}}$
  * Annual Trb Hours: $104 \times 8.0 = \mathbf{832.0 \text{ hrs}}$
  * Loaded Hourly Rate: $\$240,000 / 2,080 = \mathbf{115.384615... \text{ / hr}}$
  * Total Quantified Labor: $(1,000 + 832) \times \$115.384615... = \mathbf{\$211,384.62}$
  * Operational FTE Burden: $1,832 / 2,080 = \mathbf{0.8807... \text{ FTE}}$
  * Potential Financial Exposure: $6.0 \times \$500,000 = \mathbf{\$3,000,000.00}$
  * Recovered Admin Hours: $1,000 \times 0.50 \times 0.50 = \mathbf{250.0 \text{ hrs}}$
  * Recovered Investigation Hours: $832 \times 0.25 = \mathbf{208.0 \text{ hrs}}$
  * Total Recovered Hours: $250 + 208 = \mathbf{458.0 \text{ hrs}}$
  * Illustrative Economic Value: $458 \times \$115.384615... = \mathbf{\$52,846.15}$
* **Execution Status**: `[PENDING PHASE 3 EXECUTION]`

---

### TC-03: Missing Admin Hours (Partial Intake State)
* **Description**: Customer completes troubleshooting and downtime sections, but quarterly admin hours (Q04) is unknown.
* **Inputs**:
  * Q04: `Not sure` / `Blank`
  * Q06: `About monthly` (12 events)
  * Q07: `1–2 hours` (1.5 hrs)
  * Q12: `Significant`, Q14: `11–45 minutes` (0.467 hrs), Q15: `Blank`
* **Expected Controlled States**:
  * Annual Admin Hours ($H_{admin}$): `INSUFFICIENT_DATA`
  * Annual Admin Labor Cost ($C_{admin}$): `INSUFFICIENT_DATA`
  * Annual Trb Hours ($H_{trb}$): $12 \times 1.5 = \mathbf{18.0 \text{ hrs}}$ (`VALID`)
  * Annual Trb Labor Cost ($C_{trb}$): $18 \times \$86.5384615... = \mathbf{\$1,557.69}$ (`VALID`)
  * Total Quantified Labor ($C_{total}$): `INSUFFICIENT_DATA`
  * Total Recovered Hours: `INSUFFICIENT_DATA`
  * Potential Financial Exposure: $0.467 \times \$300,000 = \mathbf{\$140,100.00}$ (`VALID`)
* **Execution Status**: `[PENDING PHASE 3 EXECUTION]`

---

### TC-04: Non-Qualifying Business Impact (Moderate Outage)
* **Description**: Outage severity is classified as Moderate; customer does not know exact hourly downtime rate.
* **Inputs**:
  * Q12 (Business Impact): `Moderate`
  * Q14 (Disruption Duration): `1.5–4 hours` (2.75 hrs)
  * Q15 (Financial Rate): `Blank` / `Unknown`
* **Expected State**:
  * Applicable Financial Rate: `NOT_MODELED` (ITIC benchmark ineligible per `BR-005`)
  * Potential Financial Exposure: `NOT_MODELED` (Cleanly suppressed without error)
* **Execution Status**: `[PENDING PHASE 3 EXECUTION]`

---

### TC-05: Source Anomaly — "Varies significantly" in Q07
* **Description**: Customer selects `Varies significantly` for Q07 (staff hours per investigation).
* **Inputs**:
  * Q06: `Multiple times per month` (30 events)
  * Q07: `Varies significantly`
* **Expected State**:
  * Staff Hours per Investigation ($H_{inv}$): `UNMAPPED`
  * Annual Troubleshooting Hours ($H_{trb}$): `INSUFFICIENT_DATA` (Does not fabricate a midpoint; prompts for numeric override)
* **Execution Status**: `[PENDING PHASE 3 EXECUTION]`

---

## 3. Summary Test Matrix

| Fixture ID | Test Profile | Key Variations | Expected Output State | Parity Execution Status |
| :--- | :--- | :--- | :--- | :--- |
| `TC-01` | Minimal Standard Baseline | Default $180k labor, ITIC $300k benchmark | All metrics `VALID` | `[PENDING_PHASE_3]` |
| `TC-02` | Custom Overrides | $240k labor, $500k/hr downtime | All metrics `VALID` with `[CUSTOMER_FACT]` tags | `[PENDING_PHASE_3]` |
| `TC-03` | Missing Admin Input | Q04 = `Unknown` | Admin metrics `INSUFFICIENT_DATA`, Outage `VALID` | `[PENDING_PHASE_3]` |
| `TC-04` | Non-Qualifying Impact | Q12 = `Moderate`, Q15 = `Blank` | Financial Exposure `NOT_MODELED` | `[PENDING_PHASE_3]` |
| `TC-05` | Unmapped Dropdown Option | Q07 = `Varies significantly` | Troubleshooting hours `INSUFFICIENT_DATA` | `[PENDING_PHASE_3]` |
| `TC-06` | Zero Operational Friction | Q06 = `Rarely or never` (0 events) | Trb labor = $0.00, Admin labor = `VALID` | `[PENDING_PHASE_3]` |
| `TC-07` | Sub-Hour Disruption | Q14 = `10 minutes or less` (0.167 hrs) | Exposure = $0.167 \times \text{Rate}$ | `[PENDING_PHASE_3]` |
| `TC-08` | Extended Outage Boundary | Q14 = `More than 8 hours` (10.0 hrs) | Exposure = $10.0 \times \text{Rate}$ | `[PENDING_PHASE_3]` |
| `TC-09` | High Investigation Band | Q07 = `More than 20 hours` (24.0 hrs) | Trb hours = $N_{events} \times 24.0$ | `[PENDING_PHASE_3]` |
| `TC-10` | Full Discovery Missing | All fields = `Not sure` | All calculated outputs `NOT_MODELED` | `[PENDING_PHASE_3]` |
