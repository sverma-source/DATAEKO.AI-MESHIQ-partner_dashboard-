import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Content-Security-Policy" in headers


@pytest.mark.asyncio
async def test_error_sanitization_no_traceback_leakage(client: AsyncClient):
    # Request non-existent entity with invalid UUID format
    res = await client.get("/api/v1/customers/invalid-uuid-format-12345")
    assert res.status_code == 404
    data = res.json()

    assert "detail" in data
    assert "error_type" in data
    assert "Traceback" not in res.text
    assert "psycopg" not in res.text
    assert "sqlite" not in res.text
    assert "SELECT " not in res.text
    assert "/Users/" not in res.text
