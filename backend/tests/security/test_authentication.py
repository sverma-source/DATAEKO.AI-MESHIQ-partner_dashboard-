import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_login_success_and_cookie(client: AsyncClient):
    # Attempt login with default seed user
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )
    assert resp.status_code == 200
    data = resp.json()
    
    # Verify raw access token is NOT exposed in JSON response body
    assert "access_token" not in data
    assert "token_type" not in data
    assert data["user"]["email"] == "consultant@dataeko.ai"
    assert "assessment:calculate" in data["permissions"]
    
    # Check HTTP-only, Secure cookie presence
    assert "access_token" in resp.cookies


@pytest.mark.asyncio
async def test_auth_login_invalid_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "WrongPassword123!"},
    )
    assert resp.status_code == 401
    data = resp.json()
    assert data["error_type"] == "AuthenticationError"


@pytest.mark.asyncio
async def test_auth_login_nonexistent_user(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@unknown.com", "password": "Password123!"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_authenticated_and_logout(client: AsyncClient):
    # 1. Login to receive HTTP-only cookie
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.cookies

    # 2. Access /auth/me strictly via cookie
    me_resp = await client.get(
        "/api/v1/auth/me",
        cookies=login_resp.cookies,
    )
    assert me_resp.status_code == 200
    assert "access_token" not in me_resp.json()
    assert me_resp.json()["user"]["email"] == "consultant@dataeko.ai"

    # 3. Logout using cookie
    logout_resp = await client.post(
        "/api/v1/auth/logout",
        cookies=login_resp.cookies,
    )
    assert logout_resp.status_code == 200


@pytest.mark.asyncio
async def test_auth_jwt_contains_auth_version_and_validates(client: AsyncClient):
    """Verify that newly created JWTs contain auth_version and authenticate successfully."""
    from app.core.security import create_access_token, decode_access_token
    from app.config import settings

    # 1. Login to receive valid cookie
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "consultant@dataeko.ai", "password": "Consultant123!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.cookies["access_token"]

    payload = decode_access_token(token)
    assert payload is not None
    assert "auth_version" in payload
    assert payload["auth_version"] == 1


@pytest.mark.asyncio
async def test_auth_jwt_mismatched_auth_version_rejected(client: AsyncClient):
    """Verify that a JWT with an outdated/mismatched auth_version is rejected with 401."""
    from app.core.security import create_access_token
    from app.core.rbac import Role

    # Create a token with auth_version=999 (mismatched with database version 1)
    stale_token = create_access_token(
        subject="00000000-0000-0000-0000-000000000002",
        tenant_id="00000000-0000-0000-0000-000000000001",
        role=Role.CONSULTANT.value,
        email="consultant@dataeko.ai",
        auth_version=999,
    )

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {stale_token}"},
    )
    assert resp.status_code == 401
    assert "invalidated" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_auth_jwt_missing_auth_version_rejected(client: AsyncClient):
    """Verify that a legacy token without auth_version claim is rejected with 401."""
    import jwt
    from datetime import datetime, timedelta, timezone
    from app.config import settings
    from app.core.rbac import Role

    # Forge a token without auth_version claim (legacy pre-Batch 4E token)
    now = datetime.now(timezone.utc)
    legacy_payload = {
        "sub": "00000000-0000-0000-0000-000000000002",
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "role": Role.CONSULTANT.value,
        "email": "consultant@dataeko.ai",
        "exp": now + timedelta(hours=1),
        "iat": now,
        "nbf": now,
    }
    legacy_token = jwt.encode(legacy_payload, settings.effective_secret_key, algorithm="HS256")

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {legacy_token}"},
    )
    assert resp.status_code == 401
    assert "invalidated" in resp.json()["detail"].lower()
