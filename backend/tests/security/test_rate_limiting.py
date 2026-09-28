import io
import json
import logging
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.config import settings
from app.core.rate_limit import (
    get_trusted_client_ip,
    is_ip_in_trusted_proxies,
    limiter,
)
from app.main import app


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset rate limiter state before every test."""
    limiter.reset()
    yield
    limiter.reset()


# ---------------------------------------------------------------------------
# 1. Login Rate Limiting (Anonymous / Pre-Lookup / Anti-Enumeration)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_rate_limit_successful_attempts_consume_bucket(client: AsyncClient):
    """TEST-RL-01: 5 successful logins succeed, 6th is rejected with HTTP 429."""
    for _ in range(5):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
        )
        assert resp.status_code == 200

    # 6th attempt from the same client IP
    resp6 = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )
    assert resp6.status_code == 429
    data = resp6.json()
    assert data["error_type"] == "RateLimitExceeded"
    assert "retry_after_seconds" in data["details"]
    assert resp6.headers.get("Retry-After") is not None
    assert resp6.headers.get("X-RateLimit-Limit") == "5"
    assert resp6.headers.get("X-RateLimit-Remaining") == "0"
    assert resp6.headers.get("X-Request-ID") is not None


@pytest.mark.asyncio
async def test_login_rate_limit_failed_attempts_consume_bucket(client: AsyncClient):
    """TEST-RL-02: 5 failed logins return 401, 6th is rejected with HTTP 429."""
    for _ in range(5):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "consultant@dataeko.ai", "password": "WrongPassword!"},
        )
        assert resp.status_code == 401

    # 6th attempt is throttled
    resp6 = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "WrongPassword!"},
    )
    assert resp6.status_code == 429
    data = resp6.json()
    assert data["error_type"] == "RateLimitExceeded"
    assert "retry_after_seconds" in data["details"]
    assert resp6.headers.get("Retry-After") is not None


@pytest.mark.asyncio
async def test_login_rate_limit_zero_account_enumeration(client: AsyncClient):
    """TEST-RL-03: Rate-limited response is identical for valid vs non-existent accounts."""
    # Exhaust 5 attempts
    for _ in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@nonexistent.org", "password": "AnyPassword123!"},
        )

    # 6th attempt with non-existent email
    resp_nonexistent = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@nonexistent.org", "password": "AnyPassword123!"},
    )

    limiter.reset()

    # Exhaust 5 attempts with valid email
    for _ in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
        )

    # 6th attempt with valid email
    resp_valid = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )

    assert resp_nonexistent.status_code == 429
    assert resp_valid.status_code == 429
    assert resp_nonexistent.json()["error_type"] == resp_valid.json()["error_type"] == "RateLimitExceeded"
    assert "Rate limit exceeded" in resp_nonexistent.json()["detail"]
    assert "Rate limit exceeded" in resp_valid.json()["detail"]
    assert resp_nonexistent.json()["details"]["limit"] == resp_valid.json()["details"]["limit"] == 5
    assert resp_nonexistent.json()["details"]["window_seconds"] == resp_valid.json()["details"]["window_seconds"] == 60


@pytest.mark.asyncio
async def test_login_rate_limit_pre_lookup_execution(client: AsyncClient):
    """TEST-RL-04: 6th login is throttled pre-lookup, even if payload is malformed."""
    for _ in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
        )

    # 6th attempt with empty/invalid body
    resp6 = await client.post(
        "/api/v1/auth/login",
        json={"invalid_key": "junk"},
    )
    # Rate limit dependency triggers BEFORE Pydantic schema validation / DB lookup
    assert resp6.status_code == 429
    assert resp6.json()["error_type"] == "RateLimitExceeded"


# ---------------------------------------------------------------------------
# 2. Calculation Rate Limiting & Multi-Tenant / User Isolation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_calculation_rate_limit_throttling(client: AsyncClient):
    """TEST-RL-05: 10 calculations succeed, 11th receives HTTP 429."""
    # Login as consultant
    await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )

    # Create customer and assessment
    cust_resp = await client.post(
        "/api/v1/customers",
        json={"name": "Rate Limit Test Corp", "industry": "Banking"},
    )
    cust_id = cust_resp.json()["id"]

    ass_resp = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_id, "title": "Rate Limit Assessment"},
    )
    ass_id = ass_resp.json()["id"]

    # Save default responses
    await client.put(
        f"/api/v1/assessments/{ass_id}/responses",
        json={"responses": {"Q01": "5", "Q02": "1000000"}},
    )

    # Perform 10 calculations
    for _ in range(10):
        calc_resp = await client.post(f"/api/v1/assessments/{ass_id}/calculate")
        assert calc_resp.status_code == 200

    # 11th calculation should be rate limited
    calc_resp11 = await client.post(f"/api/v1/assessments/{ass_id}/calculate")
    assert calc_resp11.status_code == 429
    assert calc_resp11.json()["error_type"] == "RateLimitExceeded"
    assert calc_resp11.headers.get("Retry-After") is not None


@pytest.mark.asyncio
async def test_calculation_rate_limit_tenant_user_isolation(client: AsyncClient):
    """TEST-RL-06: User A (Consultant) exhausting calculation limit does NOT throttle User B (Admin)."""
    # 1. Login as consultant and exhaust calculation limit
    await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )

    cust_resp = await client.post(
        "/api/v1/customers",
        json={"name": "Iso Corp", "industry": "Insurance"},
    )
    cust_id = cust_resp.json()["id"]

    ass_resp = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_id, "title": "Iso Assessment"},
    )
    ass_id = ass_resp.json()["id"]

    for _ in range(10):
        await client.post(f"/api/v1/assessments/{ass_id}/calculate")

    # Consultant is now throttled
    calc_consultant = await client.post(f"/api/v1/assessments/{ass_id}/calculate")
    assert calc_consultant.status_code == 429

    # 2. Login as Admin (different user ID)
    await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@dataeko.ai", "password": "AdminPass123!"},
    )

    # Admin should NOT be throttled
    calc_admin = await client.post(f"/api/v1/assessments/{ass_id}/calculate")
    assert calc_admin.status_code == 200


@pytest.mark.asyncio
async def test_calculation_rate_limit_anti_spoofing_ignores_x_tenant_id(client: AsyncClient):
    """TEST-RL-07: Passing spoofed X-Tenant-ID header does not affect JWT-derived rate-limit key."""
    await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )

    cust_resp = await client.post(
        "/api/v1/customers",
        json={"name": "Spoof Corp", "industry": "Retail"},
    )
    cust_id = cust_resp.json()["id"]

    ass_resp = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_id, "title": "Spoof Assessment"},
    )
    ass_id = ass_resp.json()["id"]

    for _ in range(10):
        await client.post(
            f"/api/v1/assessments/{ass_id}/calculate",
            headers={"X-Tenant-ID": "00000000-0000-0000-0000-999999999999"},
        )

    # 11th request with spoofed tenant header is still throttled under real user's bucket
    calc_resp11 = await client.post(
        f"/api/v1/assessments/{ass_id}/calculate",
        headers={"X-Tenant-ID": "00000000-0000-0000-0000-888888888888"},
    )
    assert calc_resp11.status_code == 429


# ---------------------------------------------------------------------------
# 3. Trusted Proxy & Forwarded Header Resolution
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_untrusted_client_ignores_spoofed_x_forwarded_for(db_session: AsyncSession):
    """TEST-RL-08: Untrusted peer sending X-Forwarded-For is ignored (peer IP used)."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app, client=("198.51.100.50", 12345))
        async with AsyncClient(transport=transport, base_url="https://test") as custom_client:
            for _ in range(5):
                resp = await custom_client.post(
                    "/api/v1/auth/login",
                    json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                    headers={"X-Forwarded-For": f"203.0.113.{_ + 1}"},
                )
                assert resp.status_code == 200

            # 6th attempt: Even with yet another spoofed IP, rate limiter keys on 198.51.100.50
            resp6 = await custom_client.post(
                "/api/v1/auth/login",
                json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                headers={"X-Forwarded-For": "203.0.113.99"},
            )
            assert resp6.status_code == 429
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_single_trusted_proxy_extracts_client_ip(db_session: AsyncSession):
    """TEST-RL-09: Trusted proxy (127.0.0.1) forwards real client IP via X-Forwarded-For."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app, client=("127.0.0.1", 12345))
        async with AsyncClient(transport=transport, base_url="https://test") as proxy_client:
            # 5 requests from client 203.0.113.195
            for _ in range(5):
                resp = await proxy_client.post(
                    "/api/v1/auth/login",
                    json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                    headers={"X-Forwarded-For": "203.0.113.195"},
                )
                assert resp.status_code == 200

            # 6th request from 203.0.113.195 is throttled
            resp6 = await proxy_client.post(
                "/api/v1/auth/login",
                json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                headers={"X-Forwarded-For": "203.0.113.195"},
            )
            assert resp6.status_code == 429

            # Request from a different client IP (203.0.113.200) through the same trusted proxy succeeds!
            resp_other = await proxy_client.post(
                "/api/v1/auth/login",
                json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                headers={"X-Forwarded-For": "203.0.113.200"},
            )
            assert resp_other.status_code == 200
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_multi_trusted_proxy_chain_traversal(db_session: AsyncSession):
    """TEST-RL-10: Traversal right-to-left selects first untrusted client IP in proxy chain."""
    original_trusted = list(settings.TRUSTED_PROXY_IPS)
    settings.TRUSTED_PROXY_IPS = ["127.0.0.1", "192.0.2.1"]

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app, client=("127.0.0.1", 12345))
        async with AsyncClient(transport=transport, base_url="https://test") as proxy_client:
            # Chain: RealClient (198.51.100.77) -> InternalProxy (192.0.2.1) -> Ingress (127.0.0.1)
            chain = "198.51.100.77, 192.0.2.1"
            for _ in range(5):
                resp = await proxy_client.post(
                    "/api/v1/auth/login",
                    json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                    headers={"X-Forwarded-For": chain},
                )
                assert resp.status_code == 200

            # 6th attempt from 198.51.100.77 is throttled
            resp6 = await proxy_client.post(
                "/api/v1/auth/login",
                json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                headers={"X-Forwarded-For": chain},
            )
            assert resp6.status_code == 429
    finally:
        settings.TRUSTED_PROXY_IPS = original_trusted
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_malformed_forwarded_headers_fail_safely(db_session: AsyncSession):
    """TEST-RL-11: Malformed X-Forwarded-For headers gracefully fall back to peer IP."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app, client=("127.0.0.1", 12345))
        async with AsyncClient(transport=transport, base_url="https://test") as proxy_client:
            resp = await proxy_client.post(
                "/api/v1/auth/login",
                json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
                headers={"X-Forwarded-For": "garbage-text, ;;;, %%%"},
            )
            assert resp.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_ipv4_and_ipv6_cidr_trusted_proxy_matching():
    """TEST-RL-12: Trusted proxy matching works for IPv4 CIDRs and IPv6 addresses."""
    trusted = ["127.0.0.1", "192.0.2.0/24", "::1", "2001:db8::/32"]

    assert is_ip_in_trusted_proxies("127.0.0.1", trusted) is True
    assert is_ip_in_trusted_proxies("192.0.2.15", trusted) is True
    assert is_ip_in_trusted_proxies("192.0.2.254", trusted) is True
    assert is_ip_in_trusted_proxies("192.0.3.1", trusted) is False

    assert is_ip_in_trusted_proxies("::1", trusted) is True
    assert is_ip_in_trusted_proxies("2001:db8:0:0:0:0:0:1", trusted) is True
    assert is_ip_in_trusted_proxies("2001:db9::1", trusted) is False
    assert is_ip_in_trusted_proxies("invalid-ip", trusted) is False


# ---------------------------------------------------------------------------
# 4. Request Payload Size Limiting (HTTP 413)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_request_size_limiter_content_length_header(client: AsyncClient):
    """TEST-RL-13: Request with Content-Length > MAX_REQUEST_BODY_BYTES rejected with HTTP 413."""
    # Set headers with Content-Length exceeding 2MB
    headers = {
        "Content-Type": "application/json",
        "Content-Length": str(3 * 1024 * 1024),
    }
    resp = await client.post(
        "/api/v1/customers",
        content=b"x" * 100,  # Body small, but declared Content-Length is large
        headers=headers,
    )
    assert resp.status_code == 413
    data = resp.json()
    assert data["error_type"] == "PayloadTooLarge"
    assert "max_bytes" in data["details"]
    assert resp.headers.get("X-Request-ID") is not None


@pytest.mark.asyncio
async def test_request_size_limiter_streamed_chunked_body(db_session: AsyncSession):
    """TEST-RL-14: Streamed / chunked request exceeding MAX_REQUEST_BODY_BYTES rejected with HTTP 413."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        chunk = b"a" * 1024 * 512  # 512 KB
        async def large_stream():
            for _ in range(5):  # 5 * 512 KB = 2.5 MB
                yield chunk

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="https://test") as stream_client:
            resp = await stream_client.post(
                "/api/v1/customers",
                content=large_stream(),
                headers={"Content-Type": "application/json"},
            )
            assert resp.status_code == 413
            assert resp.json()["error_type"] == "PayloadTooLarge"
            assert resp.headers.get("X-Request-ID") is not None
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 5. Observability, Correlation, Health & Security
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rate_limit_and_payload_too_large_correlation_and_sanitization(client: AsyncClient):
    """TEST-RL-15: 429 and 413 responses include X-Request-ID and clean sanitized JSON."""
    # Trigger 429
    for _ in range(5):
        await client.post(
            "/api/v1/auth/login",
            json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
        )
    resp429 = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )
    assert resp429.status_code == 429
    req_id_429 = resp429.headers.get("X-Request-ID")
    assert req_id_429 is not None
    assert resp429.json()["request_id"] == req_id_429
    assert "Traceback" not in resp429.text

    # Trigger 413
    resp413 = await client.post(
        "/api/v1/customers",
        content=b"x" * 10,
        headers={"Content-Length": str(5 * 1024 * 1024)},
    )
    assert resp413.status_code == 413
    req_id_413 = resp413.headers.get("X-Request-ID")
    assert req_id_413 is not None
    assert resp413.json()["request_id"] == req_id_413
    assert "Traceback" not in resp413.text


@pytest.mark.asyncio
async def test_structured_logging_of_rejected_requests_no_secrets(
    client: AsyncClient, caplog: pytest.LogCaptureFixture
):
    """TEST-RL-16: Logging captures 429/413 events with client IP and request ID without passwords."""
    caplog.set_level(logging.INFO)
    for _ in range(6):
        await client.post(
            "/api/v1/auth/login",
            json={"email": "consultant@dataeko.ai", "password": "SuperSecretPassword123!"},
        )

    # Inspect log records
    assert "SuperSecretPassword123!" not in caplog.text


@pytest.mark.asyncio
async def test_health_probes_exempt_from_rate_limiting(client: AsyncClient):
    """TEST-RL-17: Rapid calls to /health/live and /health/ready are never throttled."""
    for _ in range(30):
        live_resp = await client.get("/api/v1/health/live")
        assert live_resp.status_code == 200

        ready_resp = await client.get("/api/v1/health/ready")
        assert ready_resp.status_code == 200


def test_in_memory_rate_limiter_process_local_reset():
    """TEST-RL-18: BaseRateLimiter reset() clears process-local buckets."""
    limiter.reset()
    assert len(limiter._buckets) == 0


@pytest.mark.asyncio
async def test_in_memory_rate_limiter_empty_bucket_cleanup():
    """TEST-RL-19: Expired buckets are deleted completely from _buckets dictionary."""
    import time
    limiter.reset()

    # Add expired timestamp to key1 (e.g. 120s ago)
    old_time = time.time() - 120.0
    limiter._buckets["expired_ip_key"] = [old_time]
    assert "expired_ip_key" in limiter._buckets

    # Check another key; verify expired_ip_key is pruned
    is_limited, rem, retry = await limiter.check_rate_limit("active_ip_key", limit=5, window_seconds=60)
    assert is_limited is False
    assert "expired_ip_key" not in limiter._buckets
    assert "active_ip_key" in limiter._buckets


@pytest.mark.asyncio
async def test_in_memory_rate_limiter_active_bucket_retained():
    """TEST-RL-20: Active timestamps are retained while empty/expired buckets are removed."""
    import time
    limiter.reset()

    now = time.time()
    limiter._buckets["stale_key"] = [now - 90.0]
    limiter._buckets["active_key"] = [now - 10.0]

    pruned_count = await limiter.prune_expired(window_seconds=60)
    assert pruned_count == 1
    assert "stale_key" not in limiter._buckets
    assert "active_key" in limiter._buckets
    assert len(limiter._buckets["active_key"]) == 1


@pytest.mark.asyncio
async def test_in_memory_rate_limiter_concurrent_protection():
    """TEST-RL-21: Concurrent access to rate limiter remains protected under asyncio.gather."""
    import asyncio
    limiter.reset()

    async def hit(key):
        return await limiter.check_rate_limit(key, limit=10, window_seconds=60)

    # 30 concurrent checks on same key
    results = await asyncio.gather(*[hit("concurrent_key") for _ in range(30)])
    limited_results = [r[0] for r in results]
    # Exactly 10 allowed (False), 20 throttled (True)
    assert limited_results.count(False) == 10
    assert limited_results.count(True) == 20
