import { test, expect } from '@playwright/test';

test.describe('Observability, Health Probes & Error Sanitization E2E (Phase 9.4)', () => {
  test('Health Probes: /api/v1/health/live and /api/v1/health/ready respond with valid status', async ({ page }) => {
    // 1. Liveness probe
    const liveResp = await page.request.get('http://localhost:8000/api/v1/health/live');
    expect(liveResp.status()).toBe(200);
    const liveData = await liveResp.json();
    expect(liveData.status).toBe('alive');

    // 2. Readiness probe
    const readyResp = await page.request.get('http://localhost:8000/api/v1/health/ready');
    expect(readyResp.status()).toBe(200);
    const readyData = await readyResp.json();
    expect(readyData.status).toBe('ready');
    expect(readyData.database).toBe('connected');
    expect(readyData.calculation_engine_version).toBe('3.0.0');

    // 3. Frontend loads successfully
    const feResp = await page.goto('http://localhost:3000/login');
    expect(feResp?.status()).toBe(200);
  });

  test('Request Correlation: X-Request-ID attached and propagated across requests', async ({ page }) => {
    const customReqId = `e2e-req-${Date.now()}`;
    const response = await page.request.get('http://localhost:8000/api/v1/health/ready', {
      headers: {
        'X-Request-ID': customReqId,
      },
    });

    expect(response.status()).toBe(200);
    const responseHeaders = response.headers();
    expect(responseHeaders['x-request-id']).toBe(customReqId);
  });

  test('Error Sanitization & Safe Failure Paths (No leaks of SQL, tracebacks, or secrets)', async ({ page }) => {
    // 1. Non-existent Entity (404)
    const notFoundResp = await page.request.get('http://localhost:8000/api/v1/customers/00000000-9999-9999-9999-000000000000');
    expect(notFoundResp.status()).toBe(404);
    const notFoundHeaders = notFoundResp.headers();
    expect(notFoundHeaders['x-request-id']).toBeDefined();

    const notFoundBody = await notFoundResp.text();
    expect(notFoundBody).not.toContain('Traceback');
    expect(notFoundBody).not.toContain('SELECT');
    expect(notFoundBody).not.toContain('postgresql');
    expect(notFoundBody).not.toContain('password');

    // 2. Validation Error (422) with Malformed Payload
    const invalidResp = await page.request.post('http://localhost:8000/api/v1/customers', {
      data: {
        // Missing required 'name' field
        industry: 'Banking',
      },
    });
    expect(invalidResp.status()).toBe(422);
    const invalidBody = await invalidResp.text();
    expect(invalidBody).toContain('name');
    expect(invalidBody).not.toContain('Traceback');
    expect(invalidBody).not.toContain('secret');
  });
});
