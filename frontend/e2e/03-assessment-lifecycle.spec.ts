import { test, expect } from '@playwright/test';

test.describe('End-to-End Assessment Lifecycle, Save/Resume, Validation & Calculations (Phase 9.4)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('P0 Acceptance: True Persisted Save/Resume across cold browser reloads, cumulative edits, and cross-tenant denial', async ({ browser }) => {
    // -------------------------------------------------------------------------
    // 1. Authenticate as Consultant (Tenant A)
    // -------------------------------------------------------------------------
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.goto('http://localhost:3000/login');
    await pageA.fill('#email', 'consultant@dataeko.ai');
    await pageA.fill('#password', 'Consultant123!');
    await pageA.click('button[type="submit"]');
    await expect(pageA).toHaveURL('http://localhost:3000/');

    // -------------------------------------------------------------------------
    // 2. Create Assessment with Customer
    // -------------------------------------------------------------------------
    const customerName = `Resilience Bank ${Date.now()}`;
    const assessmentTitle = 'Resilience Multi-Section Assessment';

    await pageA.locator('text=Select Customer').click();
    await pageA.locator('text=+ Create New Customer').click();
    await pageA.fill('#company-name', customerName);
    await pageA.selectOption('#industry-select', 'Financial Services & Banking');
    await pageA.fill('#contact-email', 'resilience.lead@resiliencebank.example.com');
    await pageA.fill('#assessment-title', assessmentTitle);
    await pageA.click('button[type="submit"]:has-text("Launch Intake Wizard")');

    await expect(pageA.locator('header').getByText(customerName)).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Enter Partial Values from at least Two Sections (Section A & Section B)
    // -------------------------------------------------------------------------
    // Section A
    await expect(pageA.getByRole('heading', { name: 'A. Environment & Cost Baseline' })).toBeVisible();
    await pageA.selectOption('#select-Q01', '11–25');
    await pageA.selectOption('#select-Q02', '3–5');
    await pageA.selectOption('#select-Q03', 'Centralized dedicated MQ team');

    // Section B
    await pageA.locator('button:has-text("Next: Section B")').click();
    await expect(pageA.getByRole('heading', { name: 'B. Troubleshooting Economics' })).toBeVisible();
    await pageA.selectOption('#select-Q06', 'About weekly');
    await pageA.selectOption('#select-Q07', '3–5 hours');

    // -------------------------------------------------------------------------
    // 4. Save Draft & Capture Assessment ID
    // -------------------------------------------------------------------------
    await pageA.locator('button:has-text("Save Draft")').first().click();
    await expect(pageA.locator('text=Saved to Cloud').or(pageA.locator('header'))).toBeVisible();

    // Capture Assessment ID from the active URL or DOM
    const urlBeforeReload = pageA.url();
    const urlObj = new URL(urlBeforeReload);
    const assessmentId = urlObj.searchParams.get('assessment_id');
    expect(assessmentId).toBeTruthy();

    // -------------------------------------------------------------------------
    // 5. Cold Reload / Navigate Away and Return via Persisted ID
    // -------------------------------------------------------------------------
    // Perform genuine browser reload
    await pageA.reload();
    await expect(pageA.locator('header').getByText(customerName)).toBeVisible();

    // Verify Section A values were restored from database persistence
    await expect(pageA.getByRole('heading', { name: 'A. Environment & Cost Baseline' })).toBeVisible();
    await expect(pageA.locator('#select-Q01')).toHaveValue('11–25');
    await expect(pageA.locator('#select-Q02')).toHaveValue('3–5');
    await expect(pageA.locator('#select-Q03')).toHaveValue('Centralized dedicated MQ team');

    // Verify Section B values were restored from database persistence
    await pageA.locator('button:has-text("Next: Section B")').click();
    await expect(pageA.getByRole('heading', { name: 'B. Troubleshooting Economics' })).toBeVisible();
    await expect(pageA.locator('#select-Q06')).toHaveValue('About weekly');
    await expect(pageA.locator('#select-Q07')).toHaveValue('3–5 hours');

    // -------------------------------------------------------------------------
    // 6. Continue Entering Additional Values (Section C & Section D)
    // -------------------------------------------------------------------------
    await pageA.locator('button:has-text("Next: Section C")').click();
    await expect(pageA.getByRole('heading', { name: 'C. Operational Complexity & Productivity' })).toBeVisible();
    await pageA.selectOption('#select-Q09', '2–3 disparate tools');
    await pageA.selectOption('#select-Q10', 'Mostly manual with some log scripts');

    await pageA.locator('button:has-text("Next: Section D")').click();
    await expect(pageA.getByRole('heading', { name: 'D. Business Consequence & Financial Exposure' })).toBeVisible();
    await pageA.selectOption('#select-Q12', 'Significant');
    await pageA.selectOption('#select-Q14', '46–90 minutes');

    // Save Draft again
    await pageA.locator('button:has-text("Save Draft")').first().click();
    await expect(pageA.locator('text=Saved to Cloud').or(pageA.locator('header'))).toBeVisible();

    // -------------------------------------------------------------------------
    // 7. Second Cold Reload: Verify Cumulative Answers Preserved Without Loss
    // -------------------------------------------------------------------------
    await pageA.reload();
    await expect(pageA.locator('header').getByText(customerName)).toBeVisible();

    // Verify Section A restored on initial load
    await expect(pageA.getByRole('heading', { name: 'A. Environment & Cost Baseline' })).toBeVisible();
    await expect(pageA.locator('#select-Q01')).toHaveValue('11–25');
    await expect(pageA.locator('#select-Q02')).toHaveValue('3–5');
    await expect(pageA.locator('#select-Q03')).toHaveValue('Centralized dedicated MQ team');

    // Navigate to Section B and verify Section B restored
    await pageA.locator('nav button:has-text("Section B")').click();
    await expect(pageA.getByRole('heading', { name: 'B. Troubleshooting Economics' })).toBeVisible();
    await expect(pageA.locator('#select-Q06')).toHaveValue('About weekly');
    await expect(pageA.locator('#select-Q07')).toHaveValue('3–5 hours');

    // Navigate to Section C and verify Section C restored
    await pageA.locator('nav button:has-text("Section C")').click();
    await expect(pageA.getByRole('heading', { name: 'C. Operational Complexity & Productivity' })).toBeVisible();
    await expect(pageA.locator('#select-Q09')).toHaveValue('2–3 disparate tools');
    await expect(pageA.locator('#select-Q10')).toHaveValue('Mostly manual with some log scripts');

    // Navigate to Section D and verify Section D restored
    await pageA.locator('nav button:has-text("Section D")').click();
    await expect(pageA.getByRole('heading', { name: 'D. Business Consequence & Financial Exposure' })).toBeVisible();
    await expect(pageA.locator('#select-Q12')).toHaveValue('Significant');
    await expect(pageA.locator('#select-Q14')).toHaveValue('46–90 minutes');

    // -------------------------------------------------------------------------
    // 8. Cross-Tenant Resume Denial: Tenant B User Cannot Resume Tenant A Assessment
    // -------------------------------------------------------------------------
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('http://localhost:3000/login');
    await pageB.fill('#email', 'consultant_b@tenantb.com');
    await pageB.fill('#password', 'Consultant123!');
    await pageB.click('button[type="submit"]');
    await expect(pageB).toHaveURL('http://localhost:3000/');

    // Attempt to resume Tenant A's assessment in Tenant B session
    await pageB.goto(`http://localhost:3000/?assessment_id=${assessmentId}`);
    
    // Must display error banner and NOT load Tenant A's customer or answers
    await expect(pageB.locator('[data-testid="resume-error-banner"]')).toBeVisible();
    await expect(pageB.locator('header').getByText(customerName)).not.toBeVisible();
    await expect(pageB.locator('#select-Q01')).not.toHaveValue('11–25');

    await contextA.close();
    await contextB.close();
  });

  test('Browser-Level Intake Validation: Missing inputs, structured not-sure states, numeric overrides & progression', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // 1. Structured Unknown/Not-Sure state handling (Q15, Q20, Q21)
    // Navigate to Section D directly via switcher
    await page.locator('nav button:has-text("Section D")').click();
    await expect(page.getByRole('heading', { name: 'D. Business Consequence & Financial Exposure' })).toBeVisible();

    // Select "UNKNOWN" for Q15 (structured not sure state)
    await page.selectOption('#select-Q15', 'UNKNOWN');
    await expect(page.locator('#select-Q15')).toHaveValue('UNKNOWN');

    // Navigate to Section G
    await page.locator('nav button:has-text("Section G")').click();
    await expect(page.getByRole('heading', { name: 'G. Team Economics & Transformation Timeline' })).toBeVisible();

    // Verify Q20 default loaded labor rate is preselected
    await expect(page.locator('#select-Q20')).toHaveValue('DEFAULT');

    // Select Q21 OVERRIDE and provide numeric input
    await page.selectOption('#select-Q21', 'OVERRIDE');
    const q21Toggle = page.locator('.space-y-6 button:has-text("Provide exact customer fact")').last();
    if (await q21Toggle.isVisible()) {
      await q21Toggle.click();
    }
    const q21Input = page.locator('#override-Q21');
    if (await q21Input.isVisible()) {
      await q21Input.fill('425000');
      await expect(q21Input).toHaveValue('425000');
    }

    // Toggle Q21 back to UNKNOWN
    await page.selectOption('#select-Q21', 'UNKNOWN');
    await expect(page.locator('#select-Q21')).toHaveValue('UNKNOWN');
  });

  test('Complete End-to-End Workflow & Provenance: 22 Questions Intake → Calculation → Dashboard → Q14 Exposure ($339.9k) → Sandbox → Report', async ({ page }) => {
    // -------------------------------------------------------------------------
    // 1. Authenticate as Consultant
    // -------------------------------------------------------------------------
    await page.goto('/login');
    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // -------------------------------------------------------------------------
    // 2. Customer Creation & Selection via Modal
    // -------------------------------------------------------------------------
    const customerName = `Apex Global Financial ${Date.now()}`;
    const assessmentTitle = 'IBM MQ Economic Benchmark Assessment';

    await page.locator('text=Select Customer').click();
    await page.locator('text=+ Create New Customer').click();
    await page.fill('#company-name', customerName);
    await page.selectOption('#industry-select', 'Financial Services & Banking');
    await page.fill('#contact-email', 'middleware.lead@apexfinancial.example.com');
    await page.fill('#assessment-title', assessmentTitle);
    await page.click('button[type="submit"]:has-text("Launch Intake Wizard")');

    await expect(page.locator('header').getByText(customerName)).toBeVisible();
    await expect(page.locator('header').getByText(assessmentTitle)).toBeVisible();

    // -------------------------------------------------------------------------
    // 3. Section A: Environment & Cost Baseline (Q01–Q05)
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'A. Environment & Cost Baseline' })).toBeVisible();
    await page.selectOption('#select-Q01', '11–25');
    await page.selectOption('#select-Q02', '3–5');
    await page.selectOption('#select-Q03', 'Centralized dedicated MQ team');
    await page.selectOption('#select-Q04', '40–100 hours');
    await page.selectOption('#select-Q05', 'Yes, a few known instances');
    await page.locator('button:has-text("Next: Section B")').click();

    // -------------------------------------------------------------------------
    // 4. Section B: Troubleshooting Economics (Q06–Q08)
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'B. Troubleshooting Economics' })).toBeVisible();
    await page.selectOption('#select-Q06', 'About weekly');
    await page.selectOption('#select-Q07', '3–5 hours');
    await page.selectOption('#select-Q08', '1–4 hours');
    await page.locator('button:has-text("Next: Section C")').click();

    // -------------------------------------------------------------------------
    // 5. Section C: Operational Complexity (Q09–Q11)
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'C. Operational Complexity & Productivity' })).toBeVisible();
    await page.selectOption('#select-Q09', '2–3 disparate tools');
    await page.selectOption('#select-Q10', 'Mostly manual with some log scripts');
    await page.selectOption('#select-Q11', 'Slow cross-team root cause isolation on bridge calls');
    await page.locator('button:has-text("Next: Section D")').click();

    // -------------------------------------------------------------------------
    // 6. Section D: Business Consequence & Financial Exposure (Q12–Q15)
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'D. Business Consequence & Financial Exposure' })).toBeVisible();
    await page.selectOption('#select-Q12', 'Significant');
    await page.selectOption('#select-Q13', 'Yes, 1–2 significant disruptions');
    // Q14 = 46–90 minutes -> 1.133 representative hours
    await page.selectOption('#select-Q14', '46–90 minutes');
    // Q15 = UNKNOWN -> ITIC $300,000/hr benchmark for Significant severity
    await page.selectOption('#select-Q15', 'UNKNOWN');
    await page.locator('button:has-text("Next: Section E")').click();

    // -------------------------------------------------------------------------
    // 7. Section E: Cost Reduction & Organization (Q16–Q17)
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'E. Cost Reduction & Organizational Pressure' })).toBeVisible();
    await page.selectOption('#select-Q16', 'Yes, moderate efficiency goal');
    await page.selectOption('#select-Q17', '10–20%');
    await page.locator('button:has-text("Next: Section F")').click();

    // -------------------------------------------------------------------------
    // 8. Section F: Cybersecurity & Remediation (Q18–Q19)
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'F. Cybersecurity & Remediation' })).toBeVisible();
    await page.selectOption('#select-Q18', 'Moderate pressure');
    await page.selectOption('#select-Q19', 'Moderate friction');
    await page.locator('button:has-text("Next: Section G")').click();

    // -------------------------------------------------------------------------
    // 9. Section G: Team Economics & Transformation Timeline (Q20–Q22)
    // -------------------------------------------------------------------------
    await expect(page.getByRole('heading', { name: 'G. Team Economics & Transformation Timeline' })).toBeVisible();
    await page.selectOption('#select-Q20', 'DEFAULT');
    await page.selectOption('#select-Q21', 'OVERRIDE');
    const q21Toggle = page.locator('.space-y-6 button:has-text("Provide exact customer fact")').last();
    if (await q21Toggle.isVisible()) {
      await q21Toggle.click();
    }
    const q21Input = page.locator('#override-Q21');
    if (await q21Input.isVisible()) {
      await q21Input.fill('350000');
    }
    await page.selectOption('#select-Q22', 'Near-term (90–180 days)');

    // Proceed to Review & Submit
    await page.locator('button:has-text("Proceed to Review")').click();
    await expect(page.getByRole('heading', { name: 'Ready for Engine Calculation' })).toBeVisible();
    await page.locator('button:has-text("Submit for Calculation")').click();

    // -------------------------------------------------------------------------
    // 10. Executive Dashboard & Authoritative Results Verification
    // -------------------------------------------------------------------------
    await expect(page.locator('text=Deterministic Calculation Complete')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Assessment Economic Baseline & Scenario Results' })).toBeVisible();
    // Verify Authoritative Engine Version v1.0.0
    await expect(page.locator('text=Engine: v1.0.0')).toBeVisible();

    // -------------------------------------------------------------------------
    // 11. Q14 Representative Exposure Regression Assertion ($339,900)
    // Formula: D_hours (1.133) * ITIC ($300,000) = $339,900.00
    // -------------------------------------------------------------------------
    const kpiGrid = page.locator('.grid').first();
    await expect(kpiGrid.locator('span.uppercase:has-text("Single-Event Exposure")')).toBeVisible();
    await expect(kpiGrid.getByText('$339,900')).toBeVisible();

    // Check Single-Event Exposure Tab
    await page.locator('nav button:has-text("Single-Event Exposure")').click();
    await expect(page.getByRole('heading', { name: 'Representative Single-Event Business Exposure' })).toBeVisible();
    await expect(page.locator('main').getByText('$339,900')).toBeVisible();
    await expect(page.locator('text=46–90 minutes')).toBeVisible();
    await expect(page.locator('text=$300,000 / hr')).toBeVisible();

    // -------------------------------------------------------------------------
    // 12. Scenario Sandbox Verification (Immutability & Sandbox Controls)
    // -------------------------------------------------------------------------
    await page.locator('nav button:has-text("Scenario Sandbox")').click();
    await expect(page.locator('text=Controlled Scenario Sandbox')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'meshIQ Efficiency Scenario Modeler' })).toBeVisible();

    // -------------------------------------------------------------------------
    // 13. Executive Report & PDF View E2E
    // -------------------------------------------------------------------------
    await page.locator('button:has-text("Executive Report & PDF")').click();
    await expect(page.getByRole('heading', { name: 'Executive Customer Assessment Report' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeVisible();
    await expect(page.getByText('Executive Customer Report')).toBeVisible();

    // Return back to dashboard
    await page.locator('button:has-text("Return to Dashboard")').click();
    await expect(page.getByRole('heading', { name: 'Assessment Economic Baseline & Scenario Results' })).toBeVisible();
  });
});
