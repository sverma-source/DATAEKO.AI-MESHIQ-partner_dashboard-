import { test, expect } from '@playwright/test';

test.describe('Authentication Lifecycle & Security Boundary (Phase 9.4)', () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies before each test for clean session state
    await context.clearCookies();
  });

  test('Test A — Unauthenticated Access redirects to /login and protects content', async ({ page }) => {
    // Attempt direct navigation to protected root
    await page.goto('/');

    // Verify redirected to /login
    await expect(page).toHaveURL(/\/login/);

    // Verify login form is visible
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Verify protected dashboard/wizard content is NOT rendered
    await expect(page.locator('text=Assessment Economic Baseline')).not.toBeVisible();
    await expect(page.locator('text=Deterministic Calculation Complete')).not.toBeVisible();
  });

  test('Test B — Invalid Login fails with safe user error and no JWT leakage', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Safe error message visible in UI
    const errorAlert = page.locator('.bg-rose-950\\/80[role="alert"], form [role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/Invalid credentials|Incorrect email or password/i);

    // Verify NO stack trace or internal SQL error
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Traceback');
    expect(pageContent).not.toContain('sqlalchemy');
    expect(pageContent).not.toContain('password_hash');

    // Verify localStorage and sessionStorage do NOT store JWT or tokens
    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
    const sessionStorageKeys = await page.evaluate(() => Object.keys(sessionStorage));
    expect(localStorageKeys).not.toContain('access_token');
    expect(localStorageKeys).not.toContain('jwt');
    expect(sessionStorageKeys).not.toContain('access_token');
    expect(sessionStorageKeys).not.toContain('jwt');
  });

  test('Test C — Valid Login succeeds with HttpOnly SameSite=Strict cookie and no token in web storage', async ({ page, context }) => {
    await page.goto('/login');

    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');

    // Navigates to authenticated dashboard/wizard
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('text=DATAEKO')).toBeVisible();
    await expect(page.locator('text=Lead MQ Consultant')).toBeVisible();

    // Inspect browser cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'access_token');
    expect(authCookie).toBeDefined();
    expect(authCookie?.httpOnly).toBe(true);
    expect(authCookie?.sameSite.toLowerCase()).toBe('strict');
    expect(authCookie?.path).toBe('/');

    // Verify NO token stored in localStorage or sessionStorage
    const localStorageContent = await page.evaluate(() => JSON.stringify(localStorage));
    const sessionStorageContent = await page.evaluate(() => JSON.stringify(sessionStorage));
    expect(localStorageContent).not.toContain('Bearer');
    expect(localStorageContent).not.toContain('eyJ');
    expect(sessionStorageContent).not.toContain('Bearer');
    expect(sessionStorageContent).not.toContain('eyJ');
  });

  test('Test D — Session Persistence across browser reload', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('text=Lead MQ Consultant')).toBeVisible();

    // 2. Reload page
    await page.reload();

    // 3. User remains authenticated without redirect to login
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.locator('text=Lead MQ Consultant')).toBeVisible();
    await expect(page.locator('text=Backend Connected')).toBeVisible();
  });

  test('Test E — Logout clears session cookie and redirects to /login', async ({ page, context }) => {
    // 1. Log in
    await page.goto('/login');
    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // 2. Open User Menu and click Sign Out
    await page.locator('header button[aria-haspopup="true"]').click();
    await page.locator('text=Sign Out').click();

    // 3. Redirected to /login
    await expect(page).toHaveURL(/\/login/);

    // 4. Verify cookie is cleared/expired
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'access_token');
    expect(authCookie === undefined || authCookie.value === '').toBe(true);

    // 5. Attempt navigating back to protected route
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
