import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from app.api.deps import get_db


@pytest.mark.asyncio
async def test_liveness_probe_healthy_without_db(client: AsyncClient):
    """Verify that /health/live returns HTTP 200 with alive status and does not touch the database."""
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert "service" in data
    assert "environment" in data


@pytest.mark.asyncio
async def test_readiness_probe_healthy_with_db(client: AsyncClient):
    """Verify that /health/ready returns HTTP 200 and ready status when database is available."""
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert "calculation_engine_version" in data


@pytest.mark.asyncio
async def test_readiness_probe_fails_safely_on_db_error(client: AsyncClient):
    """Verify that /health/ready returns HTTP 503 without leaking credentials when database is unavailable."""
    async def failing_db():
        mock_session = AsyncMock()
        mock_session.execute.side_effect = ConnectionRefusedError("Database connection lost: postgresql://secret_user:secret_pass@db:5432")
        yield mock_session

    from app.main import app
    app.dependency_overrides[get_db] = failing_db

    try:
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "unavailable"
        # Verify no credentials or connection strings leaked in response body
        assert "secret_pass" not in response.text
        assert "secret_user" not in response.text
        assert "postgresql://" not in response.text
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_legacy_health_endpoint_backward_compatible(client: AsyncClient):
    """Verify that legacy /health endpoint returns HTTP 200 and healthy status."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "ok"
    assert "calculation_engine_version" in data
