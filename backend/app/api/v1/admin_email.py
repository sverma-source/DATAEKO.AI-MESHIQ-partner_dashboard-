import asyncio
import logging
import os
from pathlib import Path
import secrets
import time
from typing import Any, Dict, List, Optional
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DEFAULT_TENANT_ID, get_db, require_role
from app.config import Settings, settings as global_settings
from app.core.audit import log_audit_event
from app.core.rate_limit import get_trusted_client_ip
from app.core.rbac import Role
from app.models.user import User

logger = logging.getLogger("app.email.admin")
router = APIRouter()

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"


class OAuthStateRegistry:
    """
    Process-local, thread-safe in-memory registry for binding OAuth state tokens
    to the initiating Platform Admin in single-process development environments.

    NOTE: This in-memory implementation is strictly for local development and testing.
    In a distributed production environment with multiple worker processes,
    a shared Redis or cryptographic encrypted session state mechanism must be used.
    """

    def __init__(self):
        self._states: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def create_state(
        self,
        admin_user_id: str,
        tenant_id: str,
        ttl_seconds: int = 600,
    ) -> str:
        """
        Generates an unguessable 256-bit URL-safe state token and stores it
        bound to the authenticated admin's ID and tenant.
        """
        token = secrets.token_urlsafe(32)
        now = time.time()
        async with self._lock:
            # Prune expired states
            expired = [k for k, v in self._states.items() if now > v.get("expires_at", 0)]
            for k in expired:
                del self._states[k]

            self._states[token] = {
                "admin_user_id": str(admin_user_id),
                "tenant_id": str(tenant_id),
                "created_at": now,
                "expires_at": now + ttl_seconds,
                "used": False,
            }
        return token

    async def consume_state(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Atomically consumes and returns the state entry.
        Returns None if the state is unknown, expired, or has already been used.
        """
        now = time.time()
        async with self._lock:
            state_entry = self._states.pop(token, None)
            if not state_entry:
                return None
            if now > state_entry.get("expires_at", 0):
                return None
            if state_entry.get("used"):
                return None
            state_entry["used"] = True
            return state_entry

    async def clear(self) -> None:
        """Clears all states (used in test fixtures)."""
        async with self._lock:
            self._states.clear()


oauth_state_registry = OAuthStateRegistry()


def persist_refresh_token_local(refresh_token: str, settings: Settings) -> bool:
    """
    Safely and atomically persists the Gmail OAuth refresh token into the local
    gitignored .env file for local development convenience.

    In production environments, writing to .env is strictly prohibited and
    secret management (e.g. AWS Secrets Manager, GCP Secret Manager, Vault) must be used.
    """
    if settings.ENVIRONMENT == "production":
        raise ValueError(
            "Production security constraint: Direct .env credential persistence is prohibited in production. "
            "Configure a secure Secret Manager or KMS."
        )

    # Update in-memory settings instance
    settings.GMAIL_REFRESH_TOKEN = refresh_token

    # Find candidate .env paths
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parents[4] / ".env",
        Path(__file__).resolve().parents[3] / ".env",
    ]
    env_path: Optional[Path] = None
    for p in candidates:
        if p.exists() and p.is_file():
            env_path = p
            break

    if not env_path:
        env_path = Path.cwd() / ".env"

    token_line = f"GMAIL_REFRESH_TOKEN={refresh_token}\n"
    new_lines: List[str] = []
    found = False

    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("GMAIL_REFRESH_TOKEN="):
                    new_lines.append(token_line)
                    found = True
                else:
                    new_lines.append(line)

    if not found:
        new_lines.append(token_line)

    # Atomic write via temporary file
    temp_path = env_path.with_name(f"{env_path.name}.tmp.{os.getpid()}")
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        os.replace(temp_path, env_path)
    except Exception as exc:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
        raise exc

    return True


@router.get(
    "/oauth/authorize",
    summary="Initiate Gmail API OAuth 2.0 Authorization Flow",
)
async def authorize_gmail_oauth(
    request: Request,
    redirect: bool = False,
    current_user: User = Depends(require_role([Role.PLATFORM_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Initiates Google OAuth 2.0 authorization for Gmail API dispatch.
    Strictly restricted to Platform Admin users.
    Generates a cryptographically random, single-use state token bound to the admin session.
    """
    client_ip = get_trusted_client_ip(request)

    if not global_settings.GMAIL_CLIENT_ID or not global_settings.GMAIL_CLIENT_ID.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot initiate Gmail OAuth flow: GMAIL_CLIENT_ID is not configured.",
        )
    if not global_settings.GMAIL_CLIENT_SECRET or not global_settings.GMAIL_CLIENT_SECRET.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot initiate Gmail OAuth flow: GMAIL_CLIENT_SECRET is not configured.",
        )
    if not global_settings.GMAIL_REDIRECT_URI or not global_settings.GMAIL_REDIRECT_URI.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot initiate Gmail OAuth flow: GMAIL_REDIRECT_URI is not configured.",
        )

    # Generate state token bound to this admin
    state_token = await oauth_state_registry.create_state(
        admin_user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        ttl_seconds=600,
    )

    # Log audit event
    await log_audit_event(
        session=db,
        event_type="EMAIL_OAUTH_AUTHORIZATION_STARTED",
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        status="SUCCESS",
        details={
            "sender_target": global_settings.GMAIL_AUTHORIZED_SENDER,
            "scope": GMAIL_SEND_SCOPE,
        },
        ip_address=client_ip,
    )
    await db.commit()

    # Construct Google OAuth 2.0 URL
    auth_params = {
        "client_id": global_settings.GMAIL_CLIENT_ID.strip(),
        "redirect_uri": global_settings.GMAIL_REDIRECT_URI.strip(),
        "response_type": "code",
        "scope": GMAIL_SEND_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state_token,
    }
    authorization_url = f"{GOOGLE_AUTH_ENDPOINT}?{urllib.parse.urlencode(auth_params)}"

    if redirect or request.headers.get("accept", "").startswith("text/html"):
        return RedirectResponse(url=authorization_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    return {
        "status": "initiated",
        "authorization_url": authorization_url,
        "authorized_sender": global_settings.GMAIL_AUTHORIZED_SENDER,
        "scope": GMAIL_SEND_SCOPE,
    }


@router.get(
    "/oauth/callback",
    summary="Handle Gmail API OAuth 2.0 Authorization Callback",
)
async def callback_gmail_oauth(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Receives authorization code from Google OAuth redirect, validates the bound state,
    and exchanges authorization code for OAuth tokens.

    NOTE: Does NOT require the Platform Admin cookie because SameSite=Strict on
    session cookies may prevent cookie transmission during cross-site browser redirects.
    State-to-admin binding in OAuthStateRegistry guarantees authenticity.
    """
    client_ip = get_trusted_client_ip(request)

    # 1. Handle Google-side OAuth errors (e.g. user clicked cancel)
    if error:
        logger.warning("Gmail OAuth callback received Google error: %s", error)
        state_entry = await oauth_state_registry.consume_state(state.strip()) if state else None
        admin_id = state_entry["admin_user_id"] if state_entry else None
        tenant_id = state_entry["tenant_id"] if state_entry else DEFAULT_TENANT_ID

        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=tenant_id,
            user_id=admin_id,
            status="FAILURE",
            details={"reason": error, "error_type": "GoogleOAuthError"},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth authorization failed: {error}",
        )

    # 2. Validate state presence
    if not state or not state.strip():
        logger.warning("Gmail OAuth callback invoked without state parameter")
        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=DEFAULT_TENANT_ID,
            user_id=None,
            status="FAILURE",
            details={"reason": "Missing state parameter", "error_type": "InvalidState"},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or previously used OAuth state.",
        )

    # 3. Atomically validate and consume state from registry BEFORE exchanging code
    state_entry = await oauth_state_registry.consume_state(state.strip())
    if not state_entry:
        logger.warning("Gmail OAuth callback received invalid, expired, or replayed state")
        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=DEFAULT_TENANT_ID,
            user_id=None,
            status="FAILURE",
            details={"reason": "Invalid or expired state", "error_type": "InvalidState"},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or previously used OAuth state.",
        )

    admin_user_id = state_entry["admin_user_id"]
    tenant_id = state_entry["tenant_id"]

    # 4. Validate code presence
    if not code or not code.strip():
        logger.warning("Gmail OAuth callback invoked without authorization code")
        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=tenant_id,
            user_id=admin_user_id,
            status="FAILURE",
            details={"reason": "Missing authorization code", "error_type": "MissingCode"},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code in OAuth callback.",
        )

    # 5. Exchange authorization code for tokens via Google token endpoint
    token_payload = {
        "grant_type": "authorization_code",
        "code": code.strip(),
        "client_id": (global_settings.GMAIL_CLIENT_ID or "").strip(),
        "client_secret": (global_settings.GMAIL_CLIENT_SECRET or "").strip(),
        "redirect_uri": (global_settings.GMAIL_REDIRECT_URI or "").strip(),
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            token_resp = await http_client.post(GOOGLE_TOKEN_ENDPOINT, data=token_payload)
    except Exception as exc:
        logger.error("Gmail OAuth token exchange network failure: %s", type(exc).__name__)
        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=tenant_id,
            user_id=admin_user_id,
            status="FAILURE",
            details={"reason": "Token exchange network error", "error_type": type(exc).__name__},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gmail OAuth token exchange failed.",
        )

    if token_resp.status_code != 200:
        logger.error(
            "Gmail OAuth token exchange failed with HTTP status %d",
            token_resp.status_code,
        )
        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=tenant_id,
            user_id=admin_user_id,
            status="FAILURE",
            details={"reason": f"Google returned status {token_resp.status_code}", "error_type": "TokenExchangeFailed"},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gmail OAuth token exchange failed.",
        )

    try:
        token_data = token_resp.json()
    except Exception:
        logger.error("Gmail OAuth token response contained malformed JSON")
        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=tenant_id,
            user_id=admin_user_id,
            status="FAILURE",
            details={"reason": "Malformed JSON in token response", "error_type": "MalformedResponse"},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gmail OAuth token exchange failed.",
        )

    refresh_token = token_data.get("refresh_token")
    if not refresh_token or not isinstance(refresh_token, str) or not refresh_token.strip():
        logger.warning("Gmail OAuth token exchange completed without refresh_token")
        await log_audit_event(
            session=db,
            event_type="EMAIL_OAUTH_AUTHORIZATION_FAILED",
            tenant_id=tenant_id,
            user_id=admin_user_id,
            status="FAILURE",
            details={"reason": "No refresh_token returned by Google", "error_type": "MissingRefreshToken"},
            ip_address=client_ip,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gmail OAuth authorization completed without a refresh token. Please authorize again.",
        )

    # 6. Securely persist refresh token for local development
    clean_refresh_token = refresh_token.strip()
    try:
        persist_refresh_token_local(clean_refresh_token, global_settings)
    except ValueError as exc:
        logger.error("Production token storage constraint triggered: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Production configuration error: direct .env token storage is prohibited in production; secret manager required.",
        )

    # 7. Audit successful authorization
    await log_audit_event(
        session=db,
        event_type="EMAIL_OAUTH_AUTHORIZATION_COMPLETED",
        tenant_id=tenant_id,
        user_id=admin_user_id,
        status="SUCCESS",
        details={
            "authorized_sender": global_settings.GMAIL_AUTHORIZED_SENDER,
            "scope": GMAIL_SEND_SCOPE,
            "refresh_token_acquired": True,
        },
        ip_address=client_ip,
    )
    await db.commit()

    logger.info(
        "Gmail API OAuth authorization successfully completed for sender %s",
        global_settings.GMAIL_AUTHORIZED_SENDER,
    )

    # 8. Return safe sanitized metadata ONLY
    return {
        "status": "success",
        "message": "Gmail API OAuth authorization completed successfully.",
        "authorized_sender": global_settings.GMAIL_AUTHORIZED_SENDER,
        "scope": GMAIL_SEND_SCOPE,
        "refresh_token_acquired": True,
    }
