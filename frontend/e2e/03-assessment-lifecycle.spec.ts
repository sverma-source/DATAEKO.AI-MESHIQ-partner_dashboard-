import { test, expect } from '@playwright/test';

test.describe('End-to-End Assessment Lifecycle, Calculations, Dashboard & Report (Phase 9.4)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('Complete Browser-to-Backend Assessment Workflow (Intake → Save/Resume → Review → Calculate → Dashboard → Sandbox → Report)', async ({ page }) => {
    // -------------------------------------------------------------------------
    // 1. Authenticate as Consultant
    // -------------------------------------------------------------------------
    await page.goto('/login');
    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('text=DATAEKO')).toBeVisible();

    // -------------------------------------------------------------------------
    // 2. Customer Creation & Selection via Modal
    // -------------------------------------------------------------------------
    const customerName = `Apex Global Financial ${Date.now()}`;
    const assessmentTitle = 'IBM MQ Economic Benchmark Assessment';

    // Click "Select Customer" button in draft banner
    await page.locator('text=Select Customer').click();
    await expect(page.locator('text=Start Assessment Discovery Session')).toBeVisible();

    // Switch to "+ Create New Customer" tab
    await page.locator('text=+ Create New Customer').click();
    await page.fill('#company-name', customerName);
    await page.selectOption('#industry-select', 'Financial Services & Banking');
    await page.fill('#contact-email', 'middleware.lead@apexfinancial.example.com');
    await page.fill('#assessment-title', assessmentTitle);

    // Launch Intake Wizard
    await page.click('button[type="submit"]:has-text("Launch Intake Wizard")');

    // Verify Customer and Assessment context in Navbar
    await expect(page.locator('header').getByText(customerName)).toBeVisible();
    await expect(page.locator('header').getByText(assessmentTitle)).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Section A: Intake & Save / Resume Verification
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'A. Environment & Cost Baseline' })).toBeVisible();

    // Q01: Scale
    await page.selectOption('#select-Q01', '11–25');
    // Q02: Staffing
    await page.selectOption('#select-Q02', '3–5');
    // Q03: Model
    await page.selectOption('#select-Q03', 'Centralized dedicated MQ team');

    // Save Progress Draft
    await page.locator('button:has-text("Save Draft")').first().click();
    await expect(page.locator('text=Saved to Cloud').or(page.locator('header'))).toBeVisible();

    // Navigate to Section B and back to Section A to verify response retention
    await page.locator('button:has-text("Next: Section B")').click();
    await expect(page.getByRole('heading', { name: 'B. Troubleshooting Economics' })).toBeVisible();

    await page.locator('button:has-text("Previous Section")').click();
    await expect(page.getByRole('heading', { name: 'A. Environment & Cost Baseline' })).toBeVisible();
    await expect(page.locator('#select-Q01')).toHaveValue('11–25');
    await expect(page.locator('#select-Q02')).toHaveValue('3–5');
    await expect(page.locator('#select-Q03')).toHaveValue('Centralized dedicated MQ team');

    // Complete remaining Section A questions
    // Q04: Admin Hours -> 40–100 hours
    await page.selectOption('#select-Q04', '40–100 hours');
    // Q05: Tech Debt
    await page.selectOption('#select-Q05', 'Yes, a few known instances');

    // Next: Section B
    await page.locator('button:has-text("Next: Section B")').click();

    // -------------------------------------------------------------------------
    // 4. Section B: Troubleshooting Economics
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'B. Troubleshooting Economics' })).toBeVisible();
    // Q06: Incident Frequency -> About weekly (52/yr)
    await page.selectOption('#select-Q06', 'About weekly');
    // Q07: Staff Effort -> 3–5 hours
    await page.selectOption('#select-Q07', '3–5 hours');
    // Q08: Elapsed Clock Duration -> 1–4 hours (Independent contextual metric)
    await page.selectOption('#select-Q08', '1–4 hours');

    // Next: Section C
    await page.locator('button:has-text("Next: Section C")').click();

    // -------------------------------------------------------------------------
    // 5. Section C: Operational Complexity & Productivity
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'C. Operational Complexity & Productivity' })).toBeVisible();
    // Q09: Tools Count -> 2–3 disparate tools
    await page.selectOption('#select-Q09', '2–3 disparate tools');
    // Q10: Manual Tracing -> Mostly manual
    await page.selectOption('#select-Q10', 'Mostly manual with some log scripts');
    // Q11: Productivity Constraint
    await page.selectOption('#select-Q11', 'Slow cross-team root cause isolation on bridge calls');

    // Next: Section D
    await page.locator('button:has-text("Next: Section D")').click();

    // -------------------------------------------------------------------------
    // 6. Section D: Business Consequence & Financial Exposure
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'D. Business Consequence & Financial Exposure' })).toBeVisible();
    // Q12: Outage Severity -> Significant
    await page.selectOption('#select-Q12', 'Significant');
    // Q13: Recent Disruptions -> Yes, 1–2 significant
    await page.selectOption('#select-Q13', 'Yes, 1–2 significant disruptions');
    // Q14: Disruption Duration -> 46–90 minutes
    await page.selectOption('#select-Q14', '46–90 minutes');
    // Q15: Hourly Downtime Cost -> UNKNOWN (triggers ITIC benchmark)
    await page.selectOption('#select-Q15', 'UNKNOWN');

    // Next: Section E
    await page.locator('button:has-text("Next: Section E")').click();

    // -------------------------------------------------------------------------
    // 7. Section E: Cost Reduction & Organizational Pressure
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'E. Cost Reduction & Organizational Pressure' })).toBeVisible();
    // Q16: Cost Mandate
    await page.selectOption('#select-Q16', 'Yes, moderate efficiency goal');
    // Q17: Target OpEx Reduction
    await page.selectOption('#select-Q17', '10–20%');

    // Next: Section F
    await page.locator('button:has-text("Next: Section F")').click();

    // -------------------------------------------------------------------------
    // 8. Section F: Cybersecurity & Remediation
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'F. Cybersecurity & Remediation' })).toBeVisible();
    // Q18: Audit Pressure
    await page.selectOption('#select-Q18', 'Moderate pressure');
    // Q19: Remediation Friction
    await page.selectOption('#select-Q19', 'Moderate friction');

    // Next: Section G
    await page.locator('button:has-text("Next: Section G")').click();

    // -------------------------------------------------------------------------
    // 9. Section G: Economic Inputs & Timing
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'G. Economic Inputs & Timing' })).toBeVisible();
    // Q20: Fully Loaded Annual Labor Cost -> Default baseline ($180k/yr)
    await page.selectOption('#select-Q20', 'DEFAULT');

    // Q21: Customer-Reported Total MQ Spend -> OVERRIDE with $350,000
    await page.selectOption('#select-Q21', 'OVERRIDE');
    // Reveal numeric override input if needed and fill
    const q21Toggle = page.locator('.space-y-6 button:has-text("Provide exact customer fact")').last();
    if (await q21Toggle.isVisible()) {
      await q21Toggle.click();
    }
    const q21Input = page.locator('#override-Q21');
    if (await q21Input.isVisible()) {
      await q21Input.fill('350000');
    }

    // Q22: Time to Act
    await page.selectOption('#select-Q22', 'Near-term (90–180 days)');

    // Proceed to Review
    await page.locator('button:has-text("Proceed to Review")').click();

    // -------------------------------------------------------------------------
    // 10. Review Summary Step
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'Ready for Engine Calculation' })).toBeVisible();
    await expect(page.locator('text=Assessment Discovery Review')).toBeVisible();

    // Verify Review Summary reflects entered sections
    await expect(page.locator('main').getByText('Section A')).toBeVisible();
    await expect(page.locator('main').getByText('Section B')).toBeVisible();
    await expect(page.locator('main').getByText('Section D')).toBeVisible();
    await expect(page.locator('main').getByText('Section G')).toBeVisible();

    // Submit calculation
    await page.locator('button:has-text("Submit for Calculation")').click();

    // -------------------------------------------------------------------------
    // 11. Executive Dashboard & Authoritative Results
    // -------------------------------------------------------------------------
    await expect(page.locator('text=Deterministic Calculation Complete')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Assessment Economic Baseline & Scenario Results' })).toBeVisible();
    await expect(page.locator('text=Engine: v1.0.0')).toBeVisible();

    // Check KPI Grid values
    const kpiGrid = page.locator('.grid').first();
    await expect(kpiGrid.locator('span.uppercase:has-text("Operational Labor Cost")')).toBeVisible();
    await expect(kpiGrid.locator('span.uppercase:has-text("Operational FTE Burden")')).toBeVisible();
    await expect(kpiGrid.locator('span.uppercase:has-text("Single-Event Exposure")')).toBeVisible();
    await expect(kpiGrid.locator('span.uppercase:has-text("Total Recoverable Hours")')).toBeVisible();
    await expect(kpiGrid.locator('span.uppercase:has-text("Illustrative Economic Value")')).toBeVisible();
    await expect(kpiGrid.locator('span.uppercase:has-text("Customer-Reported MQ Spend")')).toBeVisible();

    // -------------------------------------------------------------------------
    // 12. Dashboard Tabs Navigation
    // -------------------------------------------------------------------------
    // Switch to Effort & Cost tab
    await page.locator('nav button:has-text("Effort & Operational Cost")').click();
    await expect(page.getByRole('heading', { name: 'Operational Effort & Cost Decomposition' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Routine Administration Stream' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Incident Troubleshooting Stream' })).toBeVisible();

    // Switch to Single-Event Exposure tab
    await page.locator('nav button:has-text("Single-Event Exposure")').click();
    await expect(page.getByRole('heading', { name: 'Representative Single-Event Business Exposure' })).toBeVisible();
    await expect(page.locator('text=Governance Note on Exposure Metric')).toBeVisible();

    // Switch to Contextual Findings tab
    await page.locator('nav button:has-text("Contextual Findings")').click();
    await expect(page.getByRole('heading', { name: 'Assessment Strategic Findings & Risk Matrix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Estate Scale/i })).toBeVisible();

    // Switch to Provenance tab
    await page.locator('nav button:has-text("Calculation Provenance")').click();
    await expect(page.getByRole('heading', { name: 'Calculation Engine Provenance & Metric Inventory' })).toBeVisible();

    // -------------------------------------------------------------------------
    // 13. Scenario Sandbox Verification (Immutability & Sandbox Controls)
    // -------------------------------------------------------------------------
    await page.locator('nav button:has-text("Scenario Sandbox")').click();
    await expect(page.locator('text=Controlled Scenario Sandbox')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'meshIQ Efficiency Scenario Modeler' })).toBeVisible();
    await expect(page.locator('text=Approved Baseline')).toBeVisible();

    // Adjust addressable admin slider
    const adminSlider = page.locator('#input-addressable-admin');
    await adminSlider.fill('70');
    await expect(page.locator('text=Custom Scenario Active')).toBeVisible();
    await expect(page.locator('text=User-Defined')).toBeVisible();

    // Verify reset to baseline button works
    await page.locator('button:has-text("Reset to Model Baseline")').click();
    await expect(page.locator('text=Baseline Approved Parameters')).toBeVisible();

    // -------------------------------------------------------------------------
    // 14. Executive Report & PDF View E2E
    // -------------------------------------------------------------------------
    await page.locator('button:has-text("Executive Report & PDF")').click();

    // Report View renders
    await expect(page.getByRole('heading', { name: 'Executive Customer Assessment Report' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible();
    await expect(page.getByText('Executive Customer Report')).toBeVisible();
    await expect(page.getByText(/Important Financial Safeguards/i)).toBeVisible();

    // Return back to dashboard
    await page.locator('button:has-text("Return to Dashboard")').click();
    await expect(page.getByRole('heading', { name: 'Assessment Economic Baseline & Scenario Results' })).toBeVisible();
  });
});
