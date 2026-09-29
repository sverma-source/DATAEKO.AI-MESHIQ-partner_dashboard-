import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.core.security import create_access_token, decode_access_token, get_password_hash
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.user import User
from app.services.credential_service import CredentialService


@pytest.mark.asyncio
async def test_real_session_property_password_reset_invalidation(
    client: AsyncClient, db_session: AsyncSession
):
    """
    REAL SESSION PROPERTY TEST (PASSWORD RESET):
    Step 1: Create user and login.
    Step 2: Capture valid JWT A.
    Step 3: Confirm JWT A authenticates against /auth/me.
    Step 4: Perform password reset (increments auth_version).
    Step 5: Attempt /auth/me using JWT A -> EXPECTED 401 Unauthorized.
    Step 6: Login again using new password.
    Step 7: Capture JWT B.
    Step 8: Confirm JWT B authenticates successfully with new auth_version.
    """
    tenant_id = str(uuid.uuid4())
    tenant = Tenant(id=tenant_id, name="Test Tenant", slug=f"tenant-{uuid.uuid4().hex[:6]}")
    db_session.add(tenant)
    await db_session.flush()

    user_email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    initial_password = "InitialPassword123!"
    new_password = "UpdatedPassword456!"

    user = User(
        id=str(uuid.uuid4()),
        email=user_email,
        hashed_password=get_password_hash(initial_password),
        full_name="Session Test User",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_id,
        is_active=True,
        auth_version=1,
    )
    db_session.add(user)
    await db_session.commit()

    # Step 1 & 2: Login and capture JWT A
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": initial_password},
    )
    assert login_resp.status_code == 200
    jwt_a_cookie = login_resp.cookies["access_token"]
    payload_a = decode_access_token(jwt_a_cookie)
    assert payload_a["auth_version"] == 1

    # Step 3: Confirm JWT A authenticates
    me_resp_a = await client.get("/api/v1/auth/me", cookies={"access_token": jwt_a_cookie})
    assert me_resp_a.status_code == 200
    assert me_resp_a.json()["user"]["email"] == user_email

    # Step 4: Perform password reset
    # Generate reset token
    await CredentialService.request_password_reset(db=db_session, email=user_email)

    # Fetch raw reset token via direct test helper / service execution
    from app.models.user_credential_token import TokenType, UserCredentialToken
    token_stmt = select(UserCredentialToken).where(
        UserCredentialToken.user_id == user.id,
        UserCredentialToken.token_type == TokenType.PASSWORD_RESET.value,
        UserCredentialToken.is_used == False,
    )
    token_res = await db_session.execute(token_stmt)
    token_record = token_res.scalar_one()

    # Reset password using service with mock token
    raw_token = "test_reset_token_secret_12345"
    token_record.token_hash = CredentialService.hash_token(raw_token)
    await db_session.commit()

    reset_resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": new_password},
    )
    assert reset_resp.status_code == 200

    # Verify user in database has auth_version = 2
    await db_session.refresh(user)
    assert user.auth_version == 2

    # Step 5: Attempt /auth/me using JWT A -> MUST BE 401
    me_resp_stale = await client.get("/api/v1/auth/me", cookies={"access_token": jwt_a_cookie})
    assert me_resp_stale.status_code == 401
    assert "invalidated" in me_resp_stale.json()["detail"].lower()

    # Step 6 & 7: Login again with new password
    login_resp_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": new_password},
    )
    assert login_resp_b.status_code == 200
    jwt_b_cookie = login_resp_b.cookies["access_token"]
    payload_b = decode_access_token(jwt_b_cookie)
    assert payload_b["auth_version"] == 2

    # Step 8: Confirm JWT B authenticates
    me_resp_b = await client.get("/api/v1/auth/me", cookies={"access_token": jwt_b_cookie})
    assert me_resp_b.status_code == 200
    assert me_resp_b.json()["user"]["email"] == user_email


@pytest.mark.asyncio
async def test_real_session_property_deactivation_and_reactivation_invalidation(
    client: AsyncClient, db_session: AsyncSession
):
    """
    REAL SESSION PROPERTY TEST (DEACTIVATION & REACTIVATION):
    Step 1: Create admin and target user. Login as target user -> capture JWT A.
    Step 2: Confirm JWT A authenticates.
    Step 3: Admin deactivates target user (increments auth_version to 2, is_active=False).
    Step 4: Attempt /auth/me with JWT A -> EXPECTED 401 (inactive / invalidated).
    Step 5: Admin reactivates target user (is_active=True, auth_version remains 2).
    Step 6: Attempt /auth/me with pre-deactivation JWT A -> STILL 401 (mismatched auth_version).
    Step 7: Fresh login as target user -> captures JWT B (auth_version=2).
    Step 8: JWT B succeeds.
    """
    tenant_id = str(uuid.uuid4())
    tenant = Tenant(id=tenant_id, name="Test Tenant", slug=f"tenant-{uuid.uuid4().hex[:6]}")
    db_session.add(tenant)
    await db_session.flush()

    admin_email = f"admin_{uuid.uuid4().hex[:6]}@dataeko.ai"
    user_email = f"target_{uuid.uuid4().hex[:6]}@dataeko.ai"
    password = "UserPassword123!"

    admin_user = User(
        id=str(uuid.uuid4()),
        email=admin_email,
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Tenant Admin",
        role=Role.PARTNER_ADMIN.value,
        tenant_id=tenant_id,
        is_active=True,
        auth_version=1,
    )
    target_user = User(
        id=str(uuid.uuid4()),
        email=user_email,
        hashed_password=get_password_hash(password),
        full_name="Target User",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_id,
        is_active=True,
        auth_version=1,
    )
    db_session.add_all([admin_user, target_user])
    await db_session.commit()

    admin_token = create_access_token(admin_user.id, tenant_id, admin_user.role, admin_user.email, auth_version=1)

    # Step 1: Login as target user -> JWT A
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": password},
    )
    assert login_resp.status_code == 200
    jwt_a_cookie = login_resp.cookies["access_token"]
    assert decode_access_token(jwt_a_cookie)["auth_version"] == 1

    # Step 2: Confirm JWT A authenticates
    me_resp_a = await client.get("/api/v1/auth/me", cookies={"access_token": jwt_a_cookie})
    assert me_resp_a.status_code == 200

    # Step 3: Admin deactivates target user
    client.cookies.clear()
    deact_resp = await client.put(
        f"/api/v1/users/{target_user.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deact_resp.status_code == 200
    await db_session.refresh(target_user)
    assert target_user.is_active is False
    assert target_user.auth_version == 2

    # Step 4: JWT A rejected while deactivated
    me_resp_deact = await client.get("/api/v1/auth/me", cookies={"access_token": jwt_a_cookie})
    assert me_resp_deact.status_code == 401

    # Step 5: Admin reactivates target user
    client.cookies.clear()
    react_resp = await client.put(
        f"/api/v1/users/{target_user.id}",
        json={"is_active": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert react_resp.status_code == 200
    await db_session.refresh(target_user)
    assert target_user.is_active is True
    assert target_user.auth_version == 2  # Unchanged, NOT decremented

    # Step 6: Pre-deactivation JWT A MUST STILL BE REJECTED
    client.cookies.clear()
    me_resp_stale = await client.get("/api/v1/auth/me", cookies={"access_token": jwt_a_cookie})
    assert me_resp_stale.status_code == 401
    assert "invalidated" in me_resp_stale.json()["detail"].lower()

    # Step 7 & 8: Fresh login succeeds with JWT B (auth_version=2)
    client.cookies.clear()
    login_resp_b = await client.post(
        "/api/v1/auth/login",
        json={"email": user_email, "password": password},
    )
    assert login_resp_b.status_code == 200
    jwt_b_cookie = login_resp_b.cookies["access_token"]
    assert decode_access_token(jwt_b_cookie)["auth_version"] == 2

    me_resp_b = await client.get("/api/v1/auth/me", cookies={"access_token": jwt_b_cookie})
    assert me_resp_b.status_code == 200


@pytest.mark.asyncio
async def test_non_deactivation_user_update_does_not_increment_auth_version(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify that updating a user's name does NOT increment auth_version or invalidate active sessions."""
    tenant_id = str(uuid.uuid4())
    tenant = Tenant(id=tenant_id, name="Test Tenant", slug=f"tenant-{uuid.uuid4().hex[:6]}")
    db_session.add(tenant)
    await db_session.flush()

    admin_user = User(
        id=str(uuid.uuid4()),
        email=f"admin_{uuid.uuid4().hex[:6]}@dataeko.ai",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin",
        role=Role.PARTNER_ADMIN.value,
        tenant_id=tenant_id,
        is_active=True,
        auth_version=1,
    )
    target_user = User(
        id=str(uuid.uuid4()),
        email=f"user_{uuid.uuid4().hex[:6]}@dataeko.ai",
        hashed_password=get_password_hash("Password123!"),
        full_name="Original Name",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_id,
        is_active=True,
        auth_version=1,
    )
    db_session.add_all([admin_user, target_user])
    await db_session.commit()

    admin_token = create_access_token(admin_user.id, tenant_id, admin_user.role, admin_user.email, auth_version=1)
    user_token = create_access_token(target_user.id, tenant_id, target_user.role, target_user.email, auth_version=1)

    # Update full name only
    update_resp = await client.put(
        f"/api/v1/users/{target_user.id}",
        json={"full_name": "Updated Name"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_resp.status_code == 200
    await db_session.refresh(target_user)
    assert target_user.auth_version == 1

    # Existing user token continues to authenticate
    me_resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["full_name"] == "Updated Name"
