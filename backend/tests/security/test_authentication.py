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
