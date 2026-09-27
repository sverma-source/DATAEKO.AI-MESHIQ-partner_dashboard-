import { test, expect } from '@playwright/test';

test.describe('RBAC & Multi-Tenant Isolation (Phase 9.4)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('Role Identity & UI Profile Rendering across representative roles', async ({ page }) => {
    // 1. Consultant Role
    await page.goto('/login');
    await page.fill('#email', 'consultant@dataeko.ai');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // Open User Menu to verify role badge
    await page.locator('header button[aria-haspopup="true"]').click();
    await expect(page.getByText('CONSULTANT', { exact: true })).toBeVisible();
    await expect(page.locator('header p.font-semibold:has-text("Lead MQ Consultant")')).toBeVisible();

    // Sign out
    await page.locator('text=Sign Out').click();
    await expect(page).toHaveURL(/\/login/);

    // 2. Platform Admin Role
    await page.fill('#email', 'admin@dataeko.ai');
    await page.fill('#password', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    await page.locator('header button[aria-haspopup="true"]').click();
    await expect(page.getByText('PLATFORM_ADMIN', { exact: true })).toBeVisible();
    await expect(page.locator('header p.font-semibold:has-text("Platform Admin")')).toBeVisible();

    // Sign out
    await page.locator('text=Sign Out').click();
    await expect(page).toHaveURL(/\/login/);

    // 3. Customer User Role
    await page.fill('#email', 'customer_user_a@acme.com');
    await page.fill('#password', 'CustomerUser123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    await page.locator('header button[aria-haspopup="true"]').click();
    await expect(page.getByText('CUSTOMER_USER', { exact: true })).toBeVisible();
  });

  test('Tenant A vs Tenant B: Strict multi-tenant isolation and cross-tenant denial', async ({ browser }) => {
    // Context A: Tenant A Consultant Session
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.goto('http://localhost:3000/login');
    await pageA.fill('#email', 'consultant@dataeko.ai');
    await pageA.fill('#password', 'Consultant123!');
    await pageA.click('button[type="submit"]');
    await expect(pageA).toHaveURL('http://localhost:3000/');

    // Create Customer under Tenant A via API in Tenant A session
    const customerNameA = `Tenant A Isolated Corp ${Date.now()}`;
    const createCustResponseA = await pageA.request.post('http://localhost:8000/api/v1/customers', {
      data: {
        name: customerNameA,
        industry: 'Banking & Financial Markets',
        primary_contact_email: 'tenant_a_contact@example.com',
      },
    });
    expect(createCustResponseA.status()).toBe(201);
    const customerAData = await createCustResponseA.json();
    const customerAId = customerAData.id;
    expect(customerAId).toBeDefined();

    // Context B: Tenant B Consultant Session
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('http://localhost:3000/login');
    await pageB.fill('#email', 'consultant_b@tenantb.com');
    await pageB.fill('#password', 'Consultant123!');
    await pageB.click('button[type="submit"]');
    await expect(pageB).toHaveURL('http://localhost:3000/');

    // Create Customer under Tenant B
    const customerNameB = `Tenant B Private Corp ${Date.now()}`;
    const createCustResponseB = await pageB.request.post('http://localhost:8000/api/v1/customers', {
      data: {
        name: customerNameB,
        industry: 'Healthcare & Life Sciences',
        primary_contact_email: 'tenant_b_contact@example.com',
      },
    });
    expect(createCustResponseB.status()).toBe(201);

    // List customers in Tenant B session
    const listResponseB = await pageB.request.get('http://localhost:8000/api/v1/customers');
    expect(listResponseB.status()).toBe(200);
    const tenantBCustomers = await listResponseB.json();
    const tenantBCustomerNames = tenantBCustomers.map((c: any) => c.name);

    // Verify Tenant B CANNOT see Tenant A customer in list
    expect(tenantBCustomerNames).toContain(customerNameB);
    expect(tenantBCustomerNames).not.toContain(customerNameA);

    // Cross-Tenant Direct Access Attempt: Tenant B user tries to access Tenant A customer ID
    const crossTenantGetResp = await pageB.request.get(`http://localhost:8000/api/v1/customers/${customerAId}`);
    // Expected 404 (EntityNotFoundError - isolated tenant partition)
    expect(crossTenantGetResp.status()).toBe(404);
    const crossTenantError = await crossTenantGetResp.json();
    expect(crossTenantError.detail).toMatch(/not found/i);
    expect(JSON.stringify(crossTenantError)).not.toContain(customerNameA);

    // Clean up contexts
    await contextA.close();
    await contextB.close();
  });

  test('Backend RBAC: Unauthorized client-side header spoofing does not bypass tenant boundary', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log in as Tenant B Consultant
    await page.goto('http://localhost:3000/login');
    await page.fill('#email', 'consultant_b@tenantb.com');
    await page.fill('#password', 'Consultant123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // Attempt to spoof X-Tenant-ID header to Tenant A (00000000-0000-0000-0000-000000000001)
    const spoofResponse = await page.request.get('http://localhost:8000/api/v1/customers', {
      headers: {
        'X-Tenant-ID': '00000000-0000-0000-0000-000000000001',
      },
    });
    expect(spoofResponse.status()).toBe(200);
    const customers = await spoofResponse.json();

    // Verify user is strictly restricted to Tenant B and header spoofing was ignored for authenticated user
    customers.forEach((c: any) => {
      expect(c.tenant_id).toBe('00000000-0000-0000-0000-000000000002');
    });

    await context.close();
  });

  test('RBAC Negative Enforcement: Customer User cannot perform admin-only operations', async ({ page }) => {
    // 1. Authenticate as Customer User (Tenant A)
    await page.goto('/login');
    await page.fill('#email', 'customer_user_a@acme.com');
    await page.fill('#password', 'CustomerUser123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // 2. Negative Test: Customer User cannot access audit-events (lacks audit:read)
    const auditResp = await page.request.get('http://localhost:8000/api/v1/audit-events');
    expect(auditResp.status()).toBe(403);
    const auditErr = await auditResp.json();
    expect(auditErr.detail).toMatch(/lacks required permission/i);
  });

  test('RBAC Negative Enforcement: Customer Admin cannot access platform audit logs', async ({ page }) => {
    // 1. Authenticate as Customer Admin (Tenant A)
    await page.goto('/login');
    await page.fill('#email', 'customer_admin_a@acme.com');
    await page.fill('#password', 'CustomerAdmin123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // 2. Negative Test: Attempt to read audit log -> must be 403 Forbidden
    const auditResp = await page.request.get('http://localhost:8000/api/v1/audit-events');
    expect(auditResp.status()).toBe(403);
    const auditErr = await auditResp.json();
    expect(auditErr.detail).toMatch(/lacks required permission/i);
  });

  test('RBAC Platform Admin: Retains permitted cross-tenant administration and audit access', async ({ page }) => {
    // 1. Authenticate as Platform Admin
    await page.goto('/login');
    await page.fill('#email', 'admin@dataeko.ai');
    await page.fill('#password', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/');

    // 2. Permitted Test: Access audit log -> 200 OK
    const auditResp = await page.request.get('http://localhost:8000/api/v1/audit-events');
    expect(auditResp.status()).toBe(200);
    const auditData = await auditResp.json();
    expect(Array.isArray(auditData)).toBe(true);

    // 3. Permitted Cross-Tenant Test: Query Tenant B customers using X-Tenant-ID header
    const crossTenantResp = await page.request.get('http://localhost:8000/api/v1/customers', {
      headers: {
        'X-Tenant-ID': '00000000-0000-0000-0000-000000000002',
      },
    });
    expect(crossTenantResp.status()).toBe(200);
    const tenantBCustomers = await crossTenantResp.json();
    tenantBCustomers.forEach((c: any) => {
      expect(c.tenant_id).toBe('00000000-0000-0000-0000-000000000002');
    });
  });
});
