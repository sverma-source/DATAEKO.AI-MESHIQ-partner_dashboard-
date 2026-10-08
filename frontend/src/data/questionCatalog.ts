import { AssessmentResponseState, QuestionDefinition, SectionDefinition } from "../types/assessment";

export const SECTIONS: SectionDefinition[] = [
  {
    id: "A",
    title: "A. Environment & Cost Baseline",
    subtitle: "Infrastructure scale, staffing model, administration hours, and legacy debt",
    questionIds: ["Q01", "Q02", "Q03", "Q04", "Q05"],
  },
  {
    id: "B",
    title: "B. Troubleshooting Economics",
    subtitle: "Incident volume, bridge team investigation effort, and diagnostic clock duration",
    questionIds: ["Q06", "Q07", "Q08"],
  },
  {
    id: "C",
    title: "C. Operational Complexity & Productivity",
    subtitle: "Monitoring tool sprawl, cross-technology tracing, and primary operational constraints",
    questionIds: ["Q09", "Q10", "Q11"],
  },
  {
    id: "D",
    title: "D. Business Consequence & Financial Exposure",
    subtitle: "Outage severity, downtime frequency, recovery duration, and hourly financial impact",
    questionIds: ["Q12", "Q13", "Q14", "Q15"],
  },
  {
    id: "E",
    title: "E. Cost Reduction & Organizational Pressure",
    subtitle: "Executive OpEx reduction mandate and target percentage improvement",
    questionIds: ["Q16", "Q17"],
  },
  {
    id: "F",
    title: "F. Cybersecurity & Remediation",
    subtitle: "Audit pressure, compliance remediation friction, and configuration drift",
    questionIds: ["Q18", "Q19"],
  },
  {
    id: "G",
    title: "G. Team Economics & Transformation Timeline",
    subtitle: "Labor rate assumptions, customer annual IBM MQ spend, and transformation timeline",
    questionIds: ["Q20", "Q21", "Q22"],
  },
];

export const QUESTIONS: Record<string, QuestionDefinition> = {
  Q01: {
    id: "Q01",
    number: 1,
    code: "Q01",
    sectionId: "A",
    title: "Queue Manager Estate Scale",
    questionText: "Approximately how many IBM MQ queue managers are in your production and pre-production estate?",
    responseType: "DROPDOWN_WITH_NUMERIC_OVERRIDE",
    options: [
      { value: "1–10", label: "1–10 Queue Managers" },
      { value: "11–25", label: "11–25 Queue Managers" },
      { value: "26–50", label: "26–50 Queue Managers" },
      { value: "51–100", label: "51–100 Queue Managers" },
      { value: "101–250", label: "101–250 Queue Managers" },
      { value: "251–500", label: "251–500 Queue Managers" },
      { value: "500+", label: "500+ Queue Managers (Hyper-Scale)" },
      { value: "Not sure", label: "Not sure / In Discovery", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: true,
    overrideLabel: "Exact Queue Manager Count",
    overridePlaceholder: "e.g. 75",
    exampleHint: "Example: 24 queue managers",
    sellerGuidance: "Probe for pre-prod vs prod ratio, multi-platform hosting (Mainframe z/OS vs Distributed vs Cloud containers).",
    theme: "Infrastructure Scale",
    feedsCalculation: false,
    calculationNote: "Contextual scale baseline; does not participate directly in financial multipliers.",
  },
  Q02: {
    id: "Q02",
    number: 2,
    code: "Q02",
    sectionId: "A",
    title: "Staffing & Administration Resources",
    questionText: "How many full-time or shared staff members are involved in managing, maintaining, and supporting IBM MQ?",
    responseType: "DROPDOWN_WITH_NUMERIC_OVERRIDE",
    options: [
      { value: "1–2", label: "1–2 Engineers" },
      { value: "3–5", label: "3–5 Engineers" },
      { value: "6–10", label: "6–10 Engineers" },
      { value: "11–20", label: "11–20 Engineers" },
      { value: "20+", label: "20+ Engineers" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: true,
    overrideLabel: "Exact Staff Count",
    overridePlaceholder: "e.g. 4",
    exampleHint: "Example: 3 engineers",
    sellerGuidance: "Count both dedicated middleware admins and shared infrastructure/application support engineers.",
    theme: "Resource Allocation",
    feedsCalculation: false,
    calculationNote: "Used as context to compare against calculated Operational FTE Burden.",
  },
  Q03: {
    id: "Q03",
    number: 3,
    code: "Q03",
    sectionId: "A",
    title: "Staffing & Operational Model",
    questionText: "How is your IBM MQ support team staffed?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Centralized dedicated MQ team", label: "Centralized dedicated MQ team" },
      { value: "Shared middleware / platform team", label: "Shared middleware / platform team" },
      { value: "Application teams manage their own MQ", label: "Application teams manage their own MQ" },
      { value: "Outsourced / Managed service provider", label: "Outsourced / Managed service provider" },
      { value: "Hybrid model", label: "Hybrid model (Centralized governance + DevOps self-service)" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Identifies organizational centralization vs decentralized sprawl.",
    theme: "Operating Model",
    feedsCalculation: false,
  },
  Q04: {
    id: "Q04",
    number: 4,
    code: "Q04",
    sectionId: "A",
    title: "Quarterly Administration Time Overhead",
    questionText: "Over a typical quarter, approximately how many total staff hours are spent on routine IBM MQ administration and management?",
    responseType: "NUMERIC_HOURS_OR_UNKNOWN",
    options: [
      { value: "OVERRIDE", label: "Estimated Quarterly Administration Hours" },
      { value: "UNKNOWN", label: "Not sure / To be assessed", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: true,
    overrideLabel: "Estimated quarterly hours (approximate is fine)",
    overridePlaceholder: "80",
    overrideUnit: "hours / quarter",
    exampleHint: "Example: 80 hours per quarter",
    sellerGuidance: "Enter a rough estimate of total team hours per quarter. An exact figure isn't required.",
    theme: "Administration Overhead",
    feedsCalculation: true,
    calculationNote: "Feeds Annual Administration Hours (H_admin = Q04 × 4) and Administration Labor Cost.",
  },
  Q05: {
    id: "Q05",
    number: 5,
    code: "Q05",
    sectionId: "A",
    title: "Retired Infrastructure & Technical Debt",
    questionText: "Do you still run or maintain older or unused IBM MQ queue managers or applications because shutting them down could disrupt other systems?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Yes, significant technical debt", label: "Yes, significant technical debt (10+ inactive/unmapped instances)" },
      { value: "Yes, a few known instances", label: "Yes, a few known instances (1–5 legacy queue managers)" },
      { value: "No, active estate only", label: "No, active estate only (Strict decommissioning lifecycle)" },
      { value: "Not sure", label: "Not sure / Visibility gap", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Highlights visibility gaps and risk of unmapped message channels.",
    theme: "Technical Debt",
    feedsCalculation: false,
  },
  Q06: {
    id: "Q06",
    number: 6,
    code: "Q06",
    sectionId: "B",
    title: "Troubleshooting & Incident Frequency",
    questionText: "How often do IBM MQ problems require manual investigation such as stuck messages, failed deliveries, or queues at capacity?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Multiple times per week", label: "Multiple times per week (104 events/year)" },
      { value: "About weekly", label: "About weekly (52 events/year)" },
      { value: "Multiple times per month", label: "Multiple times per month (30 events/year)" },
      { value: "About monthly", label: "About monthly (12 events/year)" },
      { value: "About quarterly", label: "About quarterly (4 events/year)" },
      { value: "Less than quarterly", label: "Less than quarterly (2 events/year)" },
      { value: "Rarely or never", label: "Rarely or never (0 events/year)" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Probe for queue depth spikes, channel disconnects, dead letter queues, and unconsumed messages.",
    theme: "Incident Volume",
    feedsCalculation: true,
    calculationNote: "Authoritative lookup table maps selected frequency directly to Annual Troubleshooting Events (N_events).",
  },
  Q07: {
    id: "Q07",
    number: 7,
    code: "Q07",
    sectionId: "B",
    title: "Staff Hours Expended Per Investigation (Staff Effort)",
    questionText: "When an IBM MQ issue or message flow problem occurs, what is the average total staff hours expended across all team members to investigate, triage, and resolve it?",
    responseType: "DROPDOWN_WITH_NUMERIC_OVERRIDE",
    options: [
      { value: "Less than 1 hour", label: "Less than 1 hour (0.5 hrs representative)" },
      { value: "1–2 hours", label: "1–2 hours (1.5 hrs representative)" },
      { value: "3–5 hours", label: "3–5 hours (4.0 hrs representative)" },
      { value: "6–10 hours", label: "6–10 hours (8.0 hrs representative)" },
      { value: "11–20 hours", label: "11–20 hours (15.5 hrs representative)" },
      { value: "More than 20 hours", label: "More than 20 hours (24.0 hrs representative)" },
      { value: "Varies significantly", label: "Varies significantly (Requires exact override)", isUnknownOrNotSure: true },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: true,
    overrideLabel: "Exact Staff Labor Hours per Incident",
    overridePlaceholder: "e.g. 4.0",
    overrideUnit: "staff-hours / event",
    exampleHint: "Example: 4.5 total staff hours across all responders",
    sellerGuidance: "Emphasize total person-hours across all engineers on the bridge call.",
    theme: "Diagnostic Staff Effort",
    feedsCalculation: true,
    calculationNote: "Feeds Staff Labor Hours per Event (H_inv). If 'Varies significantly' or 'Not sure' is chosen without override, evaluates to INSUFFICIENT_DATA.",
  },
  Q08: {
    id: "Q08",
    number: 8,
    code: "Q08",
    sectionId: "B",
    title: "Elapsed Investigation Duration (Clock Time)",
    questionText: "For complex IBM MQ issues, how long does it take to identify the root cause after the problem is detected?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Under 30 minutes", label: "Under 30 minutes" },
      { value: "30–60 minutes", label: "30–60 minutes" },
      { value: "1–4 hours", label: "1–4 hours" },
      { value: "4–12 hours", label: "4–12 hours" },
      { value: "1–3 days", label: "1–3 days" },
      { value: "Multiple days", label: "Multiple days" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Measures elapsed clock duration (diagnostic speed) distinct from total staff person-hours in Q07.",
    theme: "Diagnostic Clock Duration",
    feedsCalculation: false,
    calculationNote: "Contextual fact; never substituted for staff labor hours in calculations.",
  },
  Q09: {
    id: "Q09",
    number: 9,
    code: "Q09",
    sectionId: "C",
    title: "Monitoring Tools & Management Consoles",
    questionText: "How many distinct tools, consoles, or scripts do your teams typically access when diagnosing an end-to-end messaging problem?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "1 integrated tool", label: "1 integrated tool (Single pane of glass)" },
      { value: "2–3 disparate tools", label: "2–3 disparate tools (e.g. MQ Explorer + APM + custom scripts)" },
      { value: "4–6 disparate tools", label: "4–6 disparate tools (Multiple team silos)" },
      { value: "7+ disparate tools / custom scripts", label: "7+ disparate tools / custom scripts (High swivel-chair friction)" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Establishes 'swivel-chair' management friction and lack of unified observability.",
    theme: "Tooling Complexity",
    feedsCalculation: false,
  },
  Q10: {
    id: "Q10",
    number: 10,
    code: "Q10",
    sectionId: "C",
    title: "Cross-Technology Manual Correlation Friction",
    questionText: "How much manual effort is required to trace a message transaction across IBM MQ, brokers, applications, and hybrid/cloud endpoints?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Fully automated end-to-end tracing", label: "Fully automated end-to-end tracing" },
      { value: "Mostly manual with some log scripts", label: "Mostly manual with some log scripts" },
      { value: "Entirely manual log correlation across teams", label: "Entirely manual log correlation across teams" },
      { value: "Nearly impossible / high friction", label: "Nearly impossible / high friction (Frequent blind spots)" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Key indicator for meshIQ 360-degree observability value proposition.",
    theme: "Manual Tracing Friction",
    feedsCalculation: false,
  },
  Q11: {
    id: "Q11",
    number: 11,
    code: "Q11",
    sectionId: "C",
    title: "Operational Productivity Constraint",
    questionText: "What is the biggest challenge affecting your messaging team’s daily productivity?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Repetitive manual queue configuration & provisioning", label: "Repetitive manual queue configuration & provisioning" },
      { value: "Lack of message-level tracing / blind spots", label: "Lack of message-level tracing / blind spots" },
      { value: "Excessive false-positive alerts & noise", label: "Excessive false-positive alerts & noise" },
      { value: "Slow cross-team root cause isolation on bridge calls", label: "Slow cross-team root cause isolation on bridge calls" },
      { value: "Developer wait time / self-service bottleneck", label: "Developer wait time / self-service bottleneck" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Qualifies the primary operational friction driver for meshIQ solution alignment.",
    theme: "Operational Productivity Constraint",
    feedsCalculation: false,
  },
  Q12: {
    id: "Q12",
    number: 12,
    code: "Q12",
    sectionId: "D",
    title: "Severity of Business Impact",
    questionText: "What is the severity of business impact when a primary IBM MQ queue manager or critical message flow experiences an unplanned outage?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Critical", label: "Critical (Immediate customer revenue / transaction halt)" },
      { value: "Significant", label: "Significant (Severe degradation / SLAs breached)" },
      { value: "Moderate", label: "Moderate (Internal friction / delayed batch cycle)" },
      { value: "Minor", label: "Minor (Minimal operational impact)" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Key qualifier for benchmark financial impact calculation.",
    theme: "Outage Severity",
    feedsCalculation: true,
    calculationNote: "Triggers ITIC $300,000/hour benchmark rate when 'Critical' or 'Significant' and Q15 is unprovided.",
  },
  Q13: {
    id: "Q13",
    number: 13,
    code: "Q13",
    sectionId: "D",
    title: "Recent Disruption Experience",
    questionText: "Has your organization had a major messaging outage or batch processing delay in the past 12–24 months?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Yes, multiple major disruptions", label: "Yes, multiple major disruptions" },
      { value: "Yes, 1–2 significant disruptions", label: "Yes, 1–2 significant disruptions" },
      { value: "Minor disruptions only", label: "Minor disruptions only" },
      { value: "No disruptions experienced", label: "No disruptions experienced" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Validates historical disruption experience.",
    theme: "Historical Disruption",
    feedsCalculation: false,
  },
  Q14: {
    id: "Q14",
    number: 14,
    code: "Q14",
    sectionId: "D",
    title: "Representative Disruption Duration",
    questionText: "When a major messaging issue occurs, how long does it typically take to fully restore service?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "10 minutes or less", label: "10 minutes or less (0.167 hrs representative)" },
      { value: "11–45 minutes", label: "11–45 minutes (0.467 hrs representative)" },
      { value: "46–90 minutes", label: "46–90 minutes (1.133 hrs representative)" },
      { value: "1.5–4 hours", label: "1.5–4 hours (2.750 hrs representative)" },
      { value: "4–8 hours", label: "4–8 hours (6.000 hrs representative)" },
      { value: "More than 8 hours", label: "More than 8 hours (10.000 hrs representative)" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Translates customer perception to decimal duration hours (D_hours).",
    theme: "Disruption Duration",
    feedsCalculation: true,
    calculationNote: "Feeds Representative Single-Event Exposure (Exposure = D_hours × R_impact).",
  },
  Q15: {
    id: "Q15",
    number: 15,
    code: "Q15",
    sectionId: "D",
    title: "Estimated Financial Cost Per Hour of Downtime",
    questionText: "How much does an hour of critical system downtime cost your organization, including lost revenue, service agreement penalties, and customer impact?",
    responseType: "NUMERIC_CURRENCY_OR_UNKNOWN",
    options: [
      { value: "OVERRIDE", label: "Customer Provided Custom Amount ($/hour)" },
      { value: "UNKNOWN", label: "Unknown / Use Industry Benchmark if applicable", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: true,
    overrideLabel: "Hourly Downtime Cost Override ($/hr)",
    overridePlaceholder: "e.g. 150000",
    overrideUnit: "$ / hour",
    exampleHint: "Example: $100,000 per hour",
    sellerGuidance: "Customer fact. If unknown, system evaluates Q12 severity to apply the $300k/hr ITIC benchmark.",
    theme: "Financial Downtime Rate",
    feedsCalculation: true,
    calculationNote: "Highest priority in 3-tier hierarchy. Customer override > ITIC $300k benchmark (if Q12 Significant/Critical) > NOT_MODELED.",
  },
  Q16: {
    id: "Q16",
    number: 16,
    code: "Q16",
    sectionId: "E",
    title: "Cost-Reduction Mandate",
    questionText: "Is your infrastructure / middleware leadership under an active mandate to reduce operating expenditures (OpEx) or modernize legacy messaging?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Yes, aggressive OpEx reduction target", label: "Yes, aggressive OpEx reduction target" },
      { value: "Yes, moderate efficiency goal", label: "Yes, moderate efficiency goal" },
      { value: "Cost-neutral / Flat budget", label: "Cost-neutral / Flat budget" },
      { value: "Growing investment budget", label: "Growing investment budget" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Qualifies executive sponsorship and budget urgency.",
    theme: "Cost Reduction Mandate",
    feedsCalculation: false,
  },
  Q17: {
    id: "Q17",
    number: 17,
    code: "Q17",
    sectionId: "E",
    title: "Target OpEx Reduction Percentage",
    questionText: "What percentage reduction in operational effort or middleware tooling spend is leadership targeting over the next 12–24 months?",
    responseType: "DROPDOWN_PERCENTAGE_OR_NUMERIC",
    options: [
      { value: "5–10%", label: "5–10% Target OpEx Reduction" },
      { value: "10–20%", label: "10–20% Target OpEx Reduction" },
      { value: "20–30%", label: "20–30% Target OpEx Reduction" },
      { value: "30%+", label: "30%+ Aggressive Transformation" },
      { value: "No specific % target", label: "No specific % target" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: true,
    overrideLabel: "Custom Target Reduction (%)",
    overridePlaceholder: "e.g. 15",
    overrideUnit: "%",
    exampleHint: "Example: 20% target reduction",
    sellerGuidance: "Establishes customer-defined target reduction benchmark.",
    theme: "Target Reduction Percentage",
    feedsCalculation: false,
  },
  Q18: {
    id: "Q18",
    number: 18,
    code: "Q18",
    sectionId: "F",
    title: "Cybersecurity & Audit Pressure",
    questionText: "How much pressure is your IBM MQ team facing to meet cybersecurity requirements, pass audits, or fix security vulnerabilities?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "High pressure", label: "High pressure (Active audit findings / urgent CVE remediation)" },
      { value: "Moderate pressure", label: "Moderate pressure (Routine compliance & quarterly cycles)" },
      { value: "Low / standard security review", label: "Low / standard security review" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Identifies governance overhead and security compliance urgency.",
    theme: "Cybersecurity Pressure",
    feedsCalculation: false,
  },
  Q19: {
    id: "Q19",
    number: 19,
    code: "Q19",
    sectionId: "F",
    title: "Vulnerability Remediation & Configuration Friction",
    questionText: "How difficult is it for your team to meet IBM MQ security requirements for patching and fixing vulnerabilities?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Significant friction", label: "Significant friction (High risk of breaking channels / extensive manual checks)" },
      { value: "Moderate friction", label: "Moderate friction (Scripted but requires substantial testing)" },
      { value: "Low friction / automated deployment", label: "Low friction / automated deployment" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Measures security maintenance overhead and friction.",
    theme: "Remediation Friction",
    feedsCalculation: false,
  },
  Q20: {
    id: "Q20",
    number: 20,
    code: "Q20",
    sectionId: "G",
    title: "Fully Loaded Annual Labor Cost Override",
    questionText: "What is the estimated annual cost of an infrastructure or middleware engineer, including salary, bonus, benefits, and overhead?",
    responseType: "NUMERIC_CURRENCY_OR_DEFAULT",
    options: [
      { value: "OVERRIDE", label: "Customer Specific Annual Loaded Cost ($/year)" },
      { value: "DEFAULT", label: "Use Model Baseline ($180,000 / year)" },
    ],
    allowNumericOverride: true,
    overrideLabel: "Custom Annual Loaded Salary ($/yr)",
    overridePlaceholder: "180000",
    overrideUnit: "$ / year",
    exampleHint: "Example: $180,000 per year",
    defaultValue: 180000,
    sellerGuidance: "Default baseline is $180,000/yr ($86.54/hr based on 2,080 working hours). Customer figure overrides default.",
    theme: "Labor Rate Override",
    feedsCalculation: true,
    calculationNote: "Computes internal unrounded Loaded Hourly Rate (R_hr = Q20 / 2,080).",
  },
  Q21: {
    id: "Q21",
    number: 21,
    code: "Q21",
    sectionId: "G",
    title: "Customer-Reported Total Annual IBM MQ Spend",
    questionText: "How much does your organization spend each year on IBM MQ licenses, maintenance, and dedicated support?",
    responseType: "NUMERIC_CURRENCY_OR_UNKNOWN",
    options: [
      { value: "OVERRIDE", label: "Customer Provided Annual Spend ($/year)" },
      { value: "UNKNOWN", label: "Unknown / Not Disclosed", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: true,
    overrideLabel: "Total Annual IBM MQ Spend ($/yr)",
    overridePlaceholder: "e.g. 500000",
    overrideUnit: "$ / year",
    exampleHint: "Example: $450,000 per year on licenses and support",
    sellerGuidance: "Customer fact. If unknown, kept as independent unknown fact; never derived or estimated from other answers.",
    theme: "Customer Reported Total IBM MQ Spend",
    feedsCalculation: false,
    calculationNote: "Preserved as independent customer fact; never synthesized.",
  },
  Q22: {
    id: "Q22",
    number: 22,
    code: "Q22",
    sectionId: "G",
    title: "Time to Act & Measurable Improvement Target",
    questionText: "What is your timeline for improving messaging operations and reducing costs?",
    responseType: "DROPDOWN_SINGLE_SELECT",
    options: [
      { value: "Immediate (Within 30–60 days)", label: "Immediate (Within 30–60 days)" },
      { value: "Near-term (90–180 days)", label: "Near-term (90–180 days)" },
      { value: "Strategic (Next fiscal year)", label: "Strategic (Next fiscal year)" },
      { value: "Not sure", label: "Not sure", isUnknownOrNotSure: true },
    ],
    allowNumericOverride: false,
    sellerGuidance: "Determines delivery urgency and PoC milestone timeline.",
    theme: "Time to Act",
    feedsCalculation: false,
  },
};

/**
 * Normalizes an assessment response (structured database columns + raw_responses)
 * into a complete, consistent client AssessmentResponseState.
 *
 * Guarantees:
 * 1. Base structured fields are populated from backend columns (e.g. q03_environment_scale).
 * 2. Any additional raw_responses (e.g. q02_staffing, overrides, conditional selections) are merged seamlessly.
 * 3. Any recursive raw_responses nesting is stripped.
 * 4. Dropdown values (e.g. "51-100 Queue Managers" or "51–100 Queue Managers") are normalized
 *    to match approved question catalog option values ("51–100").
 */
export function normalizeResponseState(
  response: any,
  questionsMap: Record<string, QuestionDefinition> = QUESTIONS
): AssessmentResponseState {
  if (!response) {
    return { q20_use_default: true };
  }

  // 1. Structured canonical mapping
  const base: AssessmentResponseState = {
    q01_scale: response.q03_environment_scale || undefined,
    q03_staffing_model: response.q05_mq_role_split || undefined,
    q04_admin_hours:
      response.q04_weekly_admin_hours !== null && response.q04_weekly_admin_hours !== undefined
        ? Number(response.q04_weekly_admin_hours)
        : response.raw_responses?.q04_admin_hours !== null && response.raw_responses?.q04_admin_hours !== undefined
        ? Number(response.raw_responses.q04_admin_hours)
        : undefined,
    q04_dropdown:
      response.raw_responses?.q04_dropdown ||
      (response.q04_weekly_admin_hours !== null && response.q04_weekly_admin_hours !== undefined
        ? "OVERRIDE"
        : undefined),
    q06_frequency: response.q06_frequency_text || undefined,
    q07_labor_hours: response.q07_labor_hours_text || undefined,
    q07_override:
      response.q07_labor_hours_override !== null && response.q07_labor_hours_override !== undefined
        ? Number(response.q07_labor_hours_override)
        : undefined,
    q08_duration: response.q08_duration_text || undefined,
    q09_tools_count: response.q09_root_cause_categories || undefined,
    q10_manual_tracing: response.q10_problem_types || undefined,
    q11_productivity_constraint: response.q11_monitoring_status || undefined,
    q12_business_impact: response.q12_business_impact || undefined,
    q14_disruption_duration: response.q14_duration_text || undefined,
    q15_dropdown:
      response.raw_responses?.q15_dropdown ||
      (response.q15_hourly_cost_override !== null && response.q15_hourly_cost_override !== undefined
        ? "OVERRIDE"
        : response.raw_responses?.q15_is_unknown === true
        ? "UNKNOWN"
        : undefined),
    q15_hourly_cost_override:
      response.q15_hourly_cost_override !== null && response.q15_hourly_cost_override !== undefined
        ? Number(response.q15_hourly_cost_override)
        : undefined,
    q15_is_unknown:
      response.q15_hourly_cost_override === null && response.raw_responses?.q15_is_unknown === true,
    q16_cost_mandate: response.q16_config_management_method || undefined,
    q18_audit_effort: response.q18_audit_effort || undefined,
    q19_documentation_effort: response.q19_documentation_effort || undefined,
    q20_dropdown:
      response.raw_responses?.q20_dropdown ||
      (response.q20_annual_labor_rate !== null && response.q20_annual_labor_rate !== undefined
        ? "OVERRIDE"
        : response.raw_responses?.q20_use_default === false
        ? "OVERRIDE"
        : "DEFAULT"),
    q20_annual_labor_rate:
      response.q20_annual_labor_rate !== null && response.q20_annual_labor_rate !== undefined
        ? Number(response.q20_annual_labor_rate)
        : undefined,
    q20_use_default:
      response.raw_responses?.q20_use_default !== undefined
        ? Boolean(response.raw_responses.q20_use_default)
        : (response.q20_annual_labor_rate === null || response.q20_annual_labor_rate === undefined),
    q21_dropdown:
      response.raw_responses?.q21_dropdown ||
      (response.q21_annual_mq_spend !== null && response.q21_annual_mq_spend !== undefined
        ? "OVERRIDE"
        : response.raw_responses?.q21_is_unknown === true
        ? "UNKNOWN"
        : undefined),
    q21_annual_mq_spend:
      response.q21_annual_mq_spend !== null && response.q21_annual_mq_spend !== undefined
        ? Number(response.q21_annual_mq_spend)
        : undefined,
    q21_is_unknown:
      response.q21_annual_mq_spend === null && response.raw_responses?.q21_is_unknown === true,
    q22_migration_plans: response.q22_migration_plans || undefined,
  };

  // 2. Merge raw_responses if present
  let merged: AssessmentResponseState = { ...base };
  if (response.raw_responses && typeof response.raw_responses === "object") {
    const rawCopy = { ...response.raw_responses };
    delete (rawCopy as any).raw_responses;
    merged = {
      ...merged,
      ...rawCopy,
    };
  }

  // 3. Dropdown option normalization against catalog options
  for (const [qCode, qDef] of Object.entries(questionsMap)) {
    if (!qDef.options || qDef.options.length === 0) continue;

    const codeLower = qCode.toLowerCase();
    const candidateKeys = [
      `${codeLower}_scale`,
      `${codeLower}_staffing`,
      `${codeLower}_staffing_model`,
      `${codeLower}_dropdown`,
      `${codeLower}_tech_debt`,
      `${codeLower}_frequency`,
      `${codeLower}_labor_hours`,
      `${codeLower}_duration`,
      `${codeLower}_tools_count`,
      `${codeLower}_manual_tracing`,
      `${codeLower}_productivity_constraint`,
      `${codeLower}_business_impact`,
      `${codeLower}_recent_disruptions`,
      `${codeLower}_disruption_duration`,
      `${codeLower}_cost_mandate`,
      `${codeLower}_opex_reduction`,
      `${codeLower}_audit_effort`,
      `${codeLower}_documentation_effort`,
      `${codeLower}_migration_plans`,
    ];

    for (const key of candidateKeys) {
      const val = (merged as any)[key];
      if (val !== undefined && val !== null && typeof val === "string" && val !== "") {
        const normalizedValDash = val.replace(/[\u2013\u2014]/g, "-").trim();
        const matched = qDef.options.find((opt) => {
          if (opt.value === val || opt.label === val) return true;
          const optValDash = opt.value.replace(/[\u2013\u2014]/g, "-").trim();
          const optLabelDash = opt.label.replace(/[\u2013\u2014]/g, "-").trim();
          if (optValDash === normalizedValDash || optLabelDash === normalizedValDash) return true;
          if (normalizedValDash.startsWith(optValDash) || optLabelDash.startsWith(normalizedValDash)) return true;
          return false;
        });
        if (matched) {
          (merged as any)[key] = matched.value;
        }
      }
    }
  }

  return merged;
}

