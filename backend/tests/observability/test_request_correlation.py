import pytest
import re
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generated_request_id_in_response(client: AsyncClient):
    """Verify that requests without X-Request-ID receive a newly generated X-Request-ID header."""
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert "X-Request-ID" in response.headers
    req_id = response.headers["X-Request-ID"]
    assert len(req_id) >= 16
    assert re.match(r"^[a-zA-Z0-9_-]+$", req_id)


@pytest.mark.asyncio
async def test_valid_client_request_id_propagated(client: AsyncClient):
    """Verify that a valid client-supplied X-Request-ID is preserved and returned in the response."""
    custom_id = "client-trace-abc-12345"
    response = await client.get("/api/v1/health/live", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == custom_id


@pytest.mark.asyncio
async def test_oversized_request_id_replaced(client: AsyncClient):
    """Verify that an oversized client-supplied X-Request-ID is safely replaced."""
    oversized_id = "a" * 128
    response = await client.get("/api/v1/health/live", headers={"X-Request-ID": oversized_id})
    assert response.status_code == 200
    req_id = response.headers.get("X-Request-ID")
    assert req_id != oversized_id
    assert len(req_id) <= 64


@pytest.mark.asyncio
async def test_malformed_request_id_replaced(client: AsyncClient):
    """Verify that an X-Request-ID containing invalid characters (e.g. injection, spaces, CR/LF) is replaced."""
    malformed_id = "test\r\nInjected-Header: evil\x00<script>"
    response = await client.get("/api/v1/health/live", headers={"X-Request-ID": malformed_id})
    assert response.status_code == 200
    req_id = response.headers.get("X-Request-ID")
    assert req_id != malformed_id
    assert re.match(r"^[a-zA-Z0-9_-]+$", req_id)


@pytest.mark.asyncio
async def test_request_id_present_on_auth_failure_401(client: AsyncClient):
    """Verify that 401 Unauthorized responses include the X-Request-ID header and in JSON payload."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "X-Request-ID" in response.headers
    data = response.json()
    assert "request_id" in data
    assert data["request_id"] == response.headers["X-Request-ID"]


@pytest.mark.asyncio
async def test_request_id_present_on_not_found_404(client: AsyncClient):
    """Verify that 404 Not Found responses include the X-Request-ID header."""
    # Login as consultant first
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )
    assert login_resp.status_code == 200
    
    # Query non-existent assessment
    response = await client.get("/api/v1/assessments/00000000-0000-0000-0000-000000009999")
    assert response.status_code == 404
    assert "X-Request-ID" in response.headers
    data = response.json()
    assert "request_id" in data
    assert data["request_id"] == response.headers["X-Request-ID"]
