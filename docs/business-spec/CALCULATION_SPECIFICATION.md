# Calculation Specification & Mathematical Engine Model

> **Document Status**: `AUTHORITATIVE BUSINESS SPECIFICATION (RECONCILED)`  
> **Source Artifact**: `IBM MQ Economic Cost & Efficiency Assessment.xlsx (Calc Engine Sheet)`  
> **Classification Standard**: `[CONFIRMED]`, `[INFERENCE]`, `[RECOMMENDATION]`, `[OPEN BUSINESS QUESTION]`

---

## 1. Mathematical Pipeline

```mermaid
flowchart TD
    subgraph Intake Inputs
        Q04[Q04: Quarterly Admin Hours]
        Q06[Q06: Troubleshooting Freq]
        Q07[Q07: Staff Hours/Investigation]
        Q12[Q12: Business Impact]
        Q14[Q14: Disruption Duration]
        Q15[Q15: Financial Impact Rate]
        Q20[Q20: Loaded Labor Cost]
    end

    subgraph Operational Labor Calculations
        Q04 -->|× 4| H_admin[Annual Admin Hours]
        Q06 -->|Lookup Multiplier| N_events[Annual Events]
        Q07 -->|Lookup Midpoint| H_inv[Staff Hours per Investigation]
        N_events & H_inv -->|×| H_trb[Annual Troubleshooting Hours]
        
        Q20 -->|Default: $180,000| C_annual[Loaded Annual Labor Cost]
        C_annual -->|÷ 2,080 (Unrounded)| R_hr[Loaded Hourly Rate: $86.5385...]
        
        H_admin & R_hr -->|×| C_admin[Annual Admin Labor Cost]
        H_trb & R_hr -->|×| C_trb[Annual Troubleshooting Labor Cost]
        
        C_admin & C_trb -->|+| C_total[Total Quantified MQ Labor Cost]
        H_admin & H_trb -->|+| H_total[Total Quantified Staff Hours]
        H_total -->|÷ 2,080| FTE[Total Operational FTE Burden]
    end

    subgraph Disruption Exposure Calculations
        Q14 -->|Lookup Decimal Hours| D_hours[Representative Duration]
        Q12 & Q15 -->|Customer Fact or ITIC $300k/hr| R_impact[Applicable Financial Rate]
        D_hours & R_impact -->|×| EXP[Potential Single-Event Financial Exposure]
    end
```

---

## 2. Core Operational Labor Formulas

### 2.1 Annual Administration Hours ($H_{admin}$)
* **Formula**:
  $$H_{admin} = \text{Quarterly Admin Hours (Q04)} \times 4$$
* **Inputs**: Response to Question 04.
* **Controlled State**: If Q04 is `UNKNOWN` or `NOT_PROVIDED`, $H_{admin} = \text{INSUFFICIENT\_DATA}$.

---

### 2.2 Annual Troubleshooting Events ($N_{events}$)
* **Formula**: Lookup from Question 06 response:
  $$N_{events} = \begin{cases} 
  104 & \text{if Q06} = \text{"Multiple times per week"} \\
  52 & \text{if Q06} = \text{"About weekly"} \\
  30 & \text{if Q06} = \text{"Multiple times per month"} \\
  12 & \text{if Q06} = \text{"About monthly"} \\
  4 & \text{if Q06} = \text{"About quarterly"} \\
  2 & \text{if Q06} = \text{"Less than quarterly"} \\
  0 & \text{if Q06} = \text{"Rarely or never"} \\
  \text{NOT\_MODELED} & \text{if Q06} = \text{"Not sure"}
  \end{cases}$$

---

### 2.3 Staff Hours Expended Per Investigation ($H_{inv}$)
* **Formula**: Lookup from Question 07 response (represents **total staff person-hours**, distinct from Q08 elapsed clock duration):
  $$H_{inv} = \begin{cases} 
  0.5 & \text{if Q07} = \text{"Less than 1 hour"} \\
  1.5 & \text{if Q07} = \text{"1–2 hours"} \\
  4.0 & \text{if Q07} = \text{"3–5 hours"} \\
  8.0 & \text{if Q07} = \text{"6–10 hours"} \\
  15.5 & \text{if Q07} = \text{"11–20 hours"} \\
  24.0 & \text{if Q07} = \text{"More than 20 hours"} \\
  \text{UNMAPPED} & \text{if Q07} = \text{"Varies significantly"} \quad \text{[OPEN BUSINESS QUESTION]} \\
  \text{NOT\_MODELED} & \text{if Q07} = \text{"Not sure"}
  \end{cases}$$
* **Rule**: If `"Varies significantly"` is selected, the calculation engine does not invent an artificial midpoint; it evaluates to `INSUFFICIENT_DATA` until a numeric override is provided.

---

### 2.4 Annual Troubleshooting Staff Hours ($H_{trb}$)
* **Formula**:
  $$H_{trb} = N_{events} \times H_{inv}$$
* **Controlled State**: If either $N_{events}$ or $H_{inv}$ is `NOT_MODELED` or `UNMAPPED`, $H_{trb} = \text{INSUFFICIENT\_DATA}$.

---

### 2.5 Loaded Hourly Labor Rate ($R_{hr}$)
* **Formula**:
  $$\text{Loaded Annual Labor Cost } (C_{labor}) = \begin{cases} 
  \text{Customer Value (Q20)} & \text{if provided} \\
  \$180,000 & \text{if blank / default}
  \end{cases}$$
  $$R_{hr} = \frac{C_{labor}}{2,080}$$
* **Precision Rule**: Internal calculations retain full floating/decimal precision ($180,000 / 2,080 = \mathbf{86.538461538...}$). UI display may format to two decimal places ($\mathbf{\$86.54/hr}$).

---

### 2.6 Annual Administration Labor Cost ($C_{admin}$)
* **Formula**:
  $$C_{admin} = H_{admin} \times R_{hr}$$

---

### 2.7 Annual Troubleshooting Labor Cost ($C_{trb}$)
* **Formula**:
  $$C_{trb} = H_{trb} \times R_{hr}$$

---

### 2.8 Total Quantified IBM MQ Operational Labor ($C_{total}$)
* **Formula**:
  $$C_{total} = C_{admin} + C_{trb}$$

---

### 2.9 Total Operational Full-Time Equivalents (FTE Burden)
* **Formula**:
  $$H_{total} = H_{admin} + H_{trb}$$
  $$\text{FTE} = \frac{H_{total}}{2,080}$$

---

## 3. Disruption & Financial Exposure Formulas

### 3.1 Representative Disruption Duration ($D_{hours}$)
* **Formula**: Lookup from Question 14 response:
  $$D_{hours} = \begin{cases} 
  0.167 & \text{if Q14} = \text{"10 minutes or less"} \quad (10/60) \\
  0.467 & \text{if Q14} = \text{"11–45 minutes"} \quad (28/60) \\
  1.133 & \text{if Q14} = \text{"46–90 minutes"} \quad (68/60) \\
  2.750 & \text{if Q14} = \text{"1.5–4 hours"} \\
  6.000 & \text{if Q14} = \text{"4–8 hours"} \\
  10.000 & \text{if Q14} = \text{"More than 8 hours"} \\
  \text{NOT\_MODELED} & \text{if Q14} = \text{"Not sure"}
  \end{cases}$$

---

### 3.2 Applicable Financial Impact Rate ($R_{impact}$)
* **Formula**:
  $$R_{impact} = \begin{cases} 
  \text{Customer Value (Q15)} & \text{if Q15 is provided} \\
  \$300,000 \text{ / hr} & \text{if Q15 is blank AND Q12} \in \{\text{"Critical"}, \text{"Significant"}\} \\
  \text{NOT\_MODELED} & \text{otherwise}
  \end{cases}$$

---

### 3.3 Potential Financial Exposure ($\text{Exposure}_{single}$)
* **Formula**:
  $$\text{Exposure}_{single} = D_{hours} \times R_{impact}$$
* **CRITICAL BUSINESS NOTE**: This metric quantifies the modeled financial risk of **one representative major outage event**. It is **NOT** an annualized cumulative loss.

---

## 4. Improvement Scenario & Decomposition Rules

`[CONFIRMED]` The legacy improvement scenario preserves distinct operational levers rather than collapsing them:

### 4.1 Admin Hours Recovered ($H_{rec\_admin}$)
* **Formula**:
  $$H_{rec\_admin} = H_{admin} \times \text{Addressable Admin Share (50\%)} \times \text{Admin Efficiency Improvement (50\%)}$$
  $$H_{rec\_admin} = H_{admin} \times 0.50 \times 0.50 = H_{admin} \times \mathbf{0.25}$$

### 4.2 Investigation Hours Recovered ($H_{rec\_inv}$)
* **Formula**:
  $$H_{rec\_inv} = H_{trb} \times \text{Investigation Improvement (25\%)}$$
  $$H_{rec\_inv} = H_{trb} \times \mathbf{0.25}$$

### 4.3 Total Hours Recovered ($H_{rec\_total}$)
* **Formula**:
  $$H_{rec\_total} = H_{rec\_admin} + H_{rec\_inv}$$

### 4.4 Illustrative Annual Economic Value ($V_{illustrative}$)
* **Formula**:
  $$V_{illustrative} = H_{rec\_total} \times R_{hr}$$

### 4.5 Distinct Troubleshooting Productivity Opportunity
* **Formula**:
  $$\text{Opportunity}_{trb} = C_{trb} \times \mathbf{10\%}$$
* **Rule**: This is a distinct metric representing a conservative 10% financial friction floor on troubleshooting labor, separate from the 25% engineering time recovery in $H_{rec\_inv}$.
