import os
from pathlib import Path
import time
import urllib.parse
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import select

from app.api.deps import DEFAULT_TENANT_ID
from app.api.v1.admin_email import (
    GMAIL_SEND_SCOPE,
    GOOGLE_AUTH_ENDPOINT,
    GOOGLE_TOKEN_ENDPOINT,
    oauth_state_registry,
    persist_refresh_token_local,
)
from app.config import Settings, settings as global_settings
from app.models.audit_event import AuditEvent


@pytest.fixture(autouse=True)
def clear_oauth_state():
    """Ensure clean OAuth state before and after each test."""
    oauth_state_registry._states.clear()
    yield
    oauth_state_registry._states.clear()


@pytest.fixture(autouse=True)
def configure_gmail_test_settings(monkeypatch):
    """Ensure test environment has Gmail configuration configured."""
    monkeypatch.setattr(global_settings, "GMAIL_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(global_settings, "GMAIL_CLIENT_SECRET", "test-client-secret-abc")
    monkeypatch.setattr(global_settings, "GMAIL_REDIRECT_URI", "http://127.0.0.1:8000/api/v1/admin/email/oauth/callback")
    monkeypatch.setattr(global_settings, "GMAIL_AUTHORIZED_SENDER", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(global_settings, "ENVIRONMENT", "test")


# ==============================================================================
# AUTHORIZATION ENDPOINT TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_oauth_authorize_unauthenticated_blocked(client):
    """Unauthenticated request must be rejected with HTTP 401."""
    resp = await client.get("/api/v1/admin/email/oauth/authorize")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_oauth_authorize_non_admin_forbidden(client, auth_headers):
    """Non-Platform-Admin user (e.g. CONSULTANT) must be rejected with HTTP 403."""
    resp = await client.get("/api/v1/admin/email/oauth/authorize", headers=auth_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_oauth_authorize_platform_admin_success(client, admin_auth_headers):
    """
    Platform Admin can initiate OAuth authorization flow.
    Confirms exact parameters, exact scope, and absence of prohibited scopes.
    """
    resp = await client.get("/api/v1/admin/email/oauth/authorize", headers=admin_auth_headers)
    assert resp.status_code == 200

    data = resp.json()
    assert data["status"] == "initiated"
    assert data["authorized_sender"] == "r.sabbavarapu@dataeko.ai"
    assert data["scope"] == "https://www.googleapis.com/auth/gmail.send"

    auth_url = data["authorization_url"]
    parsed = urllib.parse.urlparse(auth_url)
    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == GOOGLE_AUTH_ENDPOINT

    query = urllib.parse.parse_qs(parsed.query)
    assert query["client_id"] == ["test-client-id.apps.googleusercontent.com"]
    assert query["redirect_uri"] == ["http://127.0.0.1:8000/api/v1/admin/email/oauth/callback"]
    assert query["response_type"] == ["code"]
    assert query["access_type"] == ["offline"]
    assert query["prompt"] == ["consent"]
    assert query["scope"] == ["https://www.googleapis.com/auth/gmail.send"]

    # Prohibited scopes verification
    assert "https://mail.google.com/" not in auth_url
    assert "gmail.readonly" not in auth_url
    assert "gmail.modify" not in auth_url
    assert "gmail.compose" not in auth_url
    assert "openid" not in auth_url
    assert "profile" not in auth_url

    # State validation
    state = query["state"][0]
    assert len(state) >= 32


@pytest.mark.asyncio
async def test_oauth_authorize_redirect_param(client, admin_auth_headers):
    """When redirect=true, returns HTTP 307 redirecting to Google."""
    resp = await client.get(
        "/api/v1/admin/email/oauth/authorize?redirect=true",
        headers=admin_auth_headers,
        follow_redirects=False,
    )
    assert resp.status_code == 307
    location = resp.headers["location"]
    assert location.startswith(GOOGLE_AUTH_ENDPOINT)
    assert "client_id=test-client-id" in location


@pytest.mark.asyncio
async def test_oauth_authorize_missing_config_fails_safely(client, admin_auth_headers, monkeypatch):
    """Missing client configuration rejects with HTTP 400 without crashing."""
    monkeypatch.setattr(global_settings, "GMAIL_CLIENT_ID", "")
    resp = await client.get("/api/v1/admin/email/oauth/authorize", headers=admin_auth_headers)
    assert resp.status_code == 400
    assert "GMAIL_CLIENT_ID is not configured" in resp.json()["detail"]


# ==============================================================================
# STATE REGISTRY TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_oauth_state_registry_lifecycle():
    """Validates state generation, binding, and atomic single-use consumption."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    tenant_id = DEFAULT_TENANT_ID

    token = await oauth_state_registry.create_state(admin_id, tenant_id, ttl_seconds=600)
    assert len(token) >= 32

    # First consumption succeeds
    entry = await oauth_state_registry.consume_state(token)
    assert entry is not None
    assert entry["admin_user_id"] == admin_id
    assert entry["tenant_id"] == tenant_id

    # Second consumption fails (replay protection)
    replayed = await oauth_state_registry.consume_state(token)
    assert replayed is None


@pytest.mark.asyncio
async def test_oauth_state_registry_expiration():
    """Expired states must be rejected upon consumption."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    tenant_id = DEFAULT_TENANT_ID

    # Create state with negative TTL (already expired)
    token = await oauth_state_registry.create_state(admin_id, tenant_id, ttl_seconds=-1)
    entry = await oauth_state_registry.consume_state(token)
    assert entry is None


@pytest.mark.asyncio
async def test_oauth_state_registry_unknown_state_rejected():
    """Unissued/forged states must be rejected."""
    entry = await oauth_state_registry.consume_state("forged-state-xyz1234567890")
    assert entry is None


# ==============================================================================
# CALLBACK ENDPOINT TESTS
# ==============================================================================

class MockHttpResponse:
    def __init__(self, status_code: int = 200, json_data: dict = None, text: str = "", raise_json: bool = False):
        self.status_code = status_code
        self._json_data = json_data
        self.text = text or str(json_data or "")
        self.raise_json = raise_json

    def json(self):
        if self.raise_json:
            raise ValueError("Invalid JSON")
        return self._json_data if self._json_data is not None else {}


@pytest.mark.asyncio
async def test_oauth_callback_success(client, monkeypatch):
    """
    Valid callback exchanges authorization code with Google token endpoint,
    persists refresh token, logs audit event, and returns safe metadata.
    """
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    mock_token_resp = MockHttpResponse(
        status_code=200,
        json_data={
            "access_token": "mock-access-token-secret-999",
            "refresh_token": "mock-refresh-token-secret-888",
            "expires_in": 3600,
            "token_type": "Bearer",
            "scope": "https://www.googleapis.com/auth/gmail.send",
        },
    )

    mock_post = AsyncMock(return_value=mock_token_resp)
    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)

    # Mock persist_refresh_token_local to verify it was invoked with clean token
    mock_persist = MagicMock(return_value=True)
    monkeypatch.setattr("app.api.v1.admin_email.persist_refresh_token_local", mock_persist)

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-auth-code-123&state={state}")
    assert resp.status_code == 200

    data = resp.json()
    assert data["status"] == "success"
    assert data["authorized_sender"] == "r.sabbavarapu@dataeko.ai"
    assert data["scope"] == "https://www.googleapis.com/auth/gmail.send"
    assert data["refresh_token_acquired"] is True

    # Confidentiality check: Zero secrets in response text
    resp_text = resp.text
    assert "mock-access-token-secret" not in resp_text
    assert "mock-refresh-token-secret" not in resp_text
    assert "mock-auth-code" not in resp_text
    assert state not in resp_text

    # Verify token endpoint was invoked with exact parameters
    mock_post.assert_called_once()
    call_args, call_kwargs = mock_post.call_args
    assert call_args[0] == GOOGLE_TOKEN_ENDPOINT
    payload = call_kwargs["data"]
    assert payload["grant_type"] == "authorization_code"
    assert payload["code"] == "mock-auth-code-123"
    assert payload["client_id"] == "test-client-id.apps.googleusercontent.com"
    assert payload["client_secret"] == "test-client-secret-abc"
    assert payload["redirect_uri"] == "http://127.0.0.1:8000/api/v1/admin/email/oauth/callback"

    # Verify persist was called with refresh token
    mock_persist.assert_called_once_with("mock-refresh-token-secret-888", global_settings)


@pytest.mark.asyncio
async def test_oauth_callback_replayed_state_blocked(client, monkeypatch):
    """Replaying the same state token must fail with HTTP 400."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    mock_token_resp = MockHttpResponse(
        status_code=200,
        json_data={"access_token": "acc", "refresh_token": "ref"},
    )
    monkeypatch.setattr("httpx.AsyncClient.post", AsyncMock(return_value=mock_token_resp))
    monkeypatch.setattr("app.api.v1.admin_email.persist_refresh_token_local", MagicMock())

    # First attempt succeeds
    resp1 = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-code-1&state={state}")
    assert resp1.status_code == 200

    # Second attempt with same state must fail
    resp2 = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-code-2&state={state}")
    assert resp2.status_code == 400
    assert "Invalid, expired, or previously used OAuth state" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_missing_state_rejected(client):
    """Callback without state parameter returns HTTP 400."""
    resp = await client.get("/api/v1/admin/email/oauth/callback?code=mock-code")
    assert resp.status_code == 400
    assert "Invalid, expired, or previously used OAuth state" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_unknown_state_rejected(client):
    """Callback with forged/unknown state returns HTTP 400."""
    resp = await client.get("/api/v1/admin/email/oauth/callback?code=mock-code&state=unknown-state-12345")
    assert resp.status_code == 400
    assert "Invalid, expired, or previously used OAuth state" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_missing_code_rejected(client):
    """Callback with valid state but missing authorization code returns HTTP 400."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?state={state}")
    assert resp.status_code == 400
    assert "Missing authorization code in OAuth callback" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_google_error_handled(client):
    """Google access_denied error in callback returns sanitized HTTP 400."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?error=access_denied&state={state}")
    assert resp.status_code == 400
    assert "Google OAuth authorization failed: access_denied" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_token_endpoint_network_failure(client, monkeypatch):
    """Network connection failure during token exchange returns HTTP 502."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    monkeypatch.setattr(
        "httpx.AsyncClient.post",
        AsyncMock(side_effect=Exception("Connection refused")),
    )

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-code&state={state}")
    assert resp.status_code == 502
    assert "Gmail OAuth token exchange failed" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_token_endpoint_http_error(client, monkeypatch):
    """Google token endpoint returning HTTP 400 returns sanitized HTTP 400."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    mock_resp = MockHttpResponse(status_code=400, json_data={"error": "invalid_grant"})
    monkeypatch.setattr("httpx.AsyncClient.post", AsyncMock(return_value=mock_resp))

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-code&state={state}")
    assert resp.status_code == 400
    assert "Gmail OAuth token exchange failed" in resp.json()["detail"]
    # Confirm raw error payload is not leaked
    assert "invalid_grant" not in resp.text


@pytest.mark.asyncio
async def test_oauth_callback_malformed_json_response(client, monkeypatch):
    """Google token endpoint returning invalid JSON returns HTTP 502."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    mock_resp = MockHttpResponse(status_code=200, text="not-json", raise_json=True)
    monkeypatch.setattr("httpx.AsyncClient.post", AsyncMock(return_value=mock_resp))

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-code&state={state}")
    assert resp.status_code == 502
    assert "Gmail OAuth token exchange failed" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_missing_refresh_token(client, monkeypatch):
    """Google token response without refresh_token returns HTTP 400 with helpful instruction."""
    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    mock_resp = MockHttpResponse(
        status_code=200,
        json_data={"access_token": "mock-acc-tok", "expires_in": 3600},
    )
    monkeypatch.setattr("httpx.AsyncClient.post", AsyncMock(return_value=mock_resp))

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-code&state={state}")
    assert resp.status_code == 400
    assert "without a refresh token" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_oauth_callback_production_mode_safeguard(client, monkeypatch):
    """In production mode, callback safely aborts before writing to .env."""
    monkeypatch.setattr(global_settings, "ENVIRONMENT", "production")

    admin_id = "00000000-0000-0000-0000-000000000003"
    state = await oauth_state_registry.create_state(admin_id, DEFAULT_TENANT_ID, ttl_seconds=600)

    mock_resp = MockHttpResponse(
        status_code=200,
        json_data={"access_token": "acc", "refresh_token": "ref"},
    )
    monkeypatch.setattr("httpx.AsyncClient.post", AsyncMock(return_value=mock_resp))

    resp = await client.get(f"/api/v1/admin/email/oauth/callback?code=mock-code&state={state}")
    assert resp.status_code == 500
    assert "secret manager required" in resp.json()["detail"]


# ==============================================================================
# AUDIT LOGGING VERIFICATION
# ==============================================================================

@pytest.mark.asyncio
async def test_oauth_audit_logging_no_secrets(client, admin_auth_headers, db_session, monkeypatch):
    """Verifies audit entries are generated and contain zero secrets or raw tokens."""
    # 1. Authorize creates EMAIL_OAUTH_AUTHORIZATION_STARTED
    auth_resp = await client.get("/api/v1/admin/email/oauth/authorize", headers=admin_auth_headers)
    assert auth_resp.status_code == 200
    auth_url = auth_resp.json()["authorization_url"]
    state = urllib.parse.parse_qs(urllib.parse.urlparse(auth_url).query)["state"][0]

    # 2. Callback creates EMAIL_OAUTH_AUTHORIZATION_COMPLETED
    mock_token_resp = MockHttpResponse(
        status_code=200,
        json_data={"access_token": "super-secret-access", "refresh_token": "super-secret-refresh"},
    )
    monkeypatch.setattr("httpx.AsyncClient.post", AsyncMock(return_value=mock_token_resp))
    monkeypatch.setattr("app.api.v1.admin_email.persist_refresh_token_local", MagicMock())

    cb_resp = await client.get(f"/api/v1/admin/email/oauth/callback?code=super-secret-code&state={state}")
    assert cb_resp.status_code == 200

    # Query audit events
    stmt = select(AuditEvent).where(
        AuditEvent.event_type.in_([
            "EMAIL_OAUTH_AUTHORIZATION_STARTED",
            "EMAIL_OAUTH_AUTHORIZATION_COMPLETED",
        ])
    )
    res = await db_session.execute(stmt)
    events = res.scalars().all()
    assert len(events) >= 2

    for ev in events:
        details_str = str(ev.details_json)
        assert "super-secret-access" not in details_str
        assert "super-secret-refresh" not in details_str
        assert "super-secret-code" not in details_str
        assert state not in details_str
