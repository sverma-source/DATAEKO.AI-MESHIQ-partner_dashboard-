import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_audit_event
from app.core.rbac import Role
from app.core.security import create_access_token, get_password_hash, verify_password
from app.main import app
from app.models.audit_event import AuditEvent
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.user import User
from app.models.user_credential_token import TokenType, UserCredentialToken
from app.services.credential_service import CredentialService


@pytest.mark.asyncio
async def test_invitation_and_credential_lifecycle_complete_suite(client: AsyncClient, db_session: AsyncSession):
    # =========================================================================
    # SETUP TEST FIXTURES: TENANTS, CUSTOMERS, USERS
    # =========================================================================
        tenant_a_id = str(uuid.uuid4())
        tenant_b_id = str(uuid.uuid4())

        tenant_a = Tenant(id=tenant_a_id, name="Tenant Alpha", slug=f"alpha-{uuid.uuid4().hex[:6]}")
        tenant_b = Tenant(id=tenant_b_id, name="Tenant Beta", slug=f"beta-{uuid.uuid4().hex[:6]}")
        db_session.add_all([tenant_a, tenant_b])
        await db_session.flush()

        cust_a1 = Customer(id=str(uuid.uuid4()), tenant_id=tenant_a_id, name="Customer A1")
        cust_a2 = Customer(id=str(uuid.uuid4()), tenant_id=tenant_a_id, name="Customer A2")
        cust_b1 = Customer(id=str(uuid.uuid4()), tenant_id=tenant_b_id, name="Customer B1")
        db_session.add_all([cust_a1, cust_a2, cust_b1])
        await db_session.flush()

        # Admin Users
        plat_admin = User(
            id=str(uuid.uuid4()),
            email=f"platform_{uuid.uuid4().hex[:6]}@dataeko.ai",
            hashed_password=get_password_hash("PlatformAdmin123!"),
            full_name="Global Platform Admin",
            role=Role.PLATFORM_ADMIN.value,
            tenant_id=tenant_a_id,
            is_active=True,
        )
        partner_admin_a = User(
            id=str(uuid.uuid4()),
            email=f"partner_a_{uuid.uuid4().hex[:6]}@dataeko.ai",
            hashed_password=get_password_hash("PartnerAdmin123!"),
            full_name="Partner Admin Alpha",
            role=Role.PARTNER_ADMIN.value,
            tenant_id=tenant_a_id,
            is_active=True,
        )
        cust_admin_a1 = User(
            id=str(uuid.uuid4()),
            email=f"cust_admin_a1_{uuid.uuid4().hex[:6]}@cust_a1.com",
            hashed_password=get_password_hash("CustomerAdmin123!"),
            full_name="Customer Admin A1",
            role=Role.CUSTOMER_ADMIN.value,
            tenant_id=tenant_a_id,
            customer_id=cust_a1.id,
            is_active=True,
        )
        consultant_a = User(
            id=str(uuid.uuid4()),
            email=f"consultant_a_{uuid.uuid4().hex[:6]}@dataeko.ai",
            hashed_password=get_password_hash("Consultant123!"),
            full_name="Consultant Alpha",
            role=Role.CONSULTANT.value,
            tenant_id=tenant_a_id,
            is_active=True,
        )
        client_user_a1 = User(
            id=str(uuid.uuid4()),
            email=f"client_a1_{uuid.uuid4().hex[:6]}@cust_a1.com",
            hashed_password=get_password_hash("Client123!"),
            full_name="Client User A1",
            role=Role.CUSTOMER_USER.value,
            tenant_id=tenant_a_id,
            customer_id=cust_a1.id,
            is_active=True,
        )

        db_session.add_all([plat_admin, partner_admin_a, cust_admin_a1, consultant_a, client_user_a1])
        await db_session.commit()

        # Auth headers
        h_plat = {"Authorization": f"Bearer {create_access_token(plat_admin.id, tenant_a_id, Role.PLATFORM_ADMIN.value, plat_admin.email)}"}
        h_partner_a = {"Authorization": f"Bearer {create_access_token(partner_admin_a.id, tenant_a_id, Role.PARTNER_ADMIN.value, partner_admin_a.email)}"}
        h_cust_admin_a1 = {"Authorization": f"Bearer {create_access_token(cust_admin_a1.id, tenant_a_id, Role.CUSTOMER_ADMIN.value, cust_admin_a1.email)}"}
        h_consultant = {"Authorization": f"Bearer {create_access_token(consultant_a.id, tenant_a_id, Role.CONSULTANT.value, consultant_a.email)}"}
        h_client = {"Authorization": f"Bearer {create_access_token(client_user_a1.id, tenant_a_id, Role.CUSTOMER_USER.value, client_user_a1.email)}"}

        # =========================================================================
        # REQ 1-4 & 24: INVITATION PROVISIONING & TOKEN HASHING AT REST
        # =========================================================================
        invite_email = f"invited_user_{uuid.uuid4().hex[:6]}@custa1.example.com"
        create_res = await client.post(
            "/api/v1/users",
            json={
                "email": invite_email,
                "full_name": "Invited User Alpha",
                "role": Role.CUSTOMER_USER.value,
                "customer_id": cust_a1.id,
            },
            headers=h_cust_admin_a1,
        )
        assert create_res.status_code == 201
        created_data = create_res.json()
        assert created_data["is_active"] is False  # REQ 24: Invited account is inactive
        assert created_data["email"] == invite_email
        assert "password" not in created_data
        assert "hashed_password" not in created_data

        # Locate user in DB
        stmt = select(User).where(User.email == invite_email)
        user_in_db = (await db_session.execute(stmt)).scalar_one()
        assert user_in_db.is_active is False

        # Verify token hash stored, raw token not stored
        token_stmt = select(UserCredentialToken).where(
            UserCredentialToken.user_id == user_in_db.id,
            UserCredentialToken.token_type == TokenType.INVITATION.value,
        )
        token_rec = (await db_session.execute(token_stmt)).scalar_one()
        assert token_rec.is_used is False
        assert len(token_rec.token_hash) == 64  # SHA-256 digest length

        # Attempt to log in with inactive account before invitation acceptance -> REQ 26
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": invite_email, "password": "AnyPassword123!"},
        )
        assert login_res.status_code == 401

        # =========================================================================
        # REQ 5: EXPIRED INVITATION TOKEN REJECTION
        # =========================================================================
        # Manually create an expired token
        exp_raw_token = CredentialService.generate_raw_token()
        exp_hash = CredentialService.hash_token(exp_raw_token)
        exp_record = UserCredentialToken(
            tenant_id=tenant_a_id,
            user_id=user_in_db.id,
            token_hash=exp_hash,
            token_type=TokenType.INVITATION.value,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            is_used=False,
        )
        db_session.add(exp_record)
        await db_session.commit()

        exp_accept = await client.post(
            "/api/v1/auth/accept-invitation",
            json={"token": exp_raw_token, "new_password": "ValidNewPassword123!"},
        )
        assert exp_accept.status_code in [400, 403, 422]
        assert "expired" in exp_accept.json()["detail"].lower()

        # =========================================================================
        # REQ 6 & 25: SUCCESSFUL INVITATION ACCEPTANCE & ACTIVATION
        # =========================================================================
        # Generate fresh invitation token
        raw_inv_token = await CredentialService.create_invitation(db_session, user_in_db, actor_id=cust_admin_a1.id)
        await db_session.commit()

        accept_res = await client.post(
            "/api/v1/auth/accept-invitation",
            json={"token": raw_inv_token, "new_password": "NewSecretPassword123!"},
        )
        assert accept_res.status_code == 200
        assert "accepted" in accept_res.json()["message"].lower()

        # Refresh user state
        await db_session.refresh(user_in_db)
        assert user_in_db.is_active is True  # REQ 25: Activated upon acceptance
        assert verify_password("NewSecretPassword123!", user_in_db.hashed_password) is True

        # REQ 6: Replay token consumption must fail
        replay_res = await client.post(
            "/api/v1/auth/accept-invitation",
            json={"token": raw_inv_token, "new_password": "AnotherPassword123!"},
        )
        assert replay_res.status_code in [400, 403, 422]
        assert "already been used" in replay_res.json()["detail"].lower()

        # =========================================================================
        # REQ 7: CONCURRENT / REPEAT INVITATION REDEMPTION
        # =========================================================================
        conc_user = User(
            id=str(uuid.uuid4()),
            email=f"conc_{uuid.uuid4().hex[:6]}@custa1.example.com",
            hashed_password=get_password_hash("Dummy123!"),
            full_name="Concurrent Test User",
            role=Role.CUSTOMER_USER.value,
            tenant_id=tenant_a_id,
            customer_id=cust_a1.id,
            is_active=False,
        )
        db_session.add(conc_user)
        await db_session.commit()

        conc_raw_token = await CredentialService.create_invitation(db_session, conc_user)
        await db_session.commit()

        res1 = await client.post("/api/v1/auth/accept-invitation", json={"token": conc_raw_token, "new_password": "Password123!"})
        res2 = await client.post("/api/v1/auth/accept-invitation", json={"token": conc_raw_token, "new_password": "Password123!"})

        # First must succeed with 200, second must fail as already used
        assert res1.status_code == 200
        assert res2.status_code in [400, 403, 422]
        assert "already been used" in res2.json()["detail"].lower()

        # =========================================================================
        # REQ 9-12: PASSWORD RESET REQUEST & COMPLETION LIFECYCLE
        # =========================================================================
        # REQ 31: Account enumeration defense
        anon_forgot = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent_random_email@nowhere.com"},
        )
        assert anon_forgot.status_code == 200
        assert "instructions have been sent" in anon_forgot.json()["message"]

        # Valid user forgot password
        valid_forgot = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": user_in_db.email},
        )
        assert valid_forgot.status_code == 200
        assert "instructions have been sent" in valid_forgot.json()["message"]

        # Check reset token hash in DB
        rst_stmt = select(UserCredentialToken).where(
            UserCredentialToken.user_id == user_in_db.id,
            UserCredentialToken.token_type == TokenType.PASSWORD_RESET.value,
            UserCredentialToken.is_used == False,
        )
        rst_rec = (await db_session.execute(rst_stmt)).scalar_one()
        assert rst_rec is not None
        assert len(rst_rec.token_hash) == 64

        # Generate fresh reset token via service to get raw value
        raw_reset_token = CredentialService.generate_raw_token()
        reset_hash = CredentialService.hash_token(raw_reset_token)
        rst_record = UserCredentialToken(
            tenant_id=user_in_db.tenant_id,
            user_id=user_in_db.id,
            token_hash=reset_hash,
            token_type=TokenType.PASSWORD_RESET.value,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            is_used=False,
        )
        db_session.add(rst_record)
        await db_session.commit()

        # Complete password reset
        reset_done = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": raw_reset_token, "new_password": "ResetSecretPass123!"},
        )
        assert reset_done.status_code == 200

        # Verify new password in DB
        await db_session.refresh(user_in_db)
        assert verify_password("ResetSecretPass123!", user_in_db.hashed_password) is True

        # REQ 11: Reset token replay fails
        reset_replay = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": raw_reset_token, "new_password": "AnotherReset123!"},
        )
        assert reset_replay.status_code in [400, 403, 422]

        # =========================================================================
        # REQ 27: DEACTIVATED USER RESET DOES NOT REACTIVATE ACCOUNT
        # =========================================================================
        user_in_db.is_active = False
        db_session.add(user_in_db)

        deact_raw_token = CredentialService.generate_raw_token()
        deact_hash = CredentialService.hash_token(deact_raw_token)
        deact_record = UserCredentialToken(
            tenant_id=user_in_db.tenant_id,
            user_id=user_in_db.id,
            token_hash=deact_hash,
            token_type=TokenType.PASSWORD_RESET.value,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            is_used=False,
        )
        db_session.add(deact_record)
        await db_session.commit()

        deact_reset_res = await client.post(
            "/api/v1/auth/reset-password",
            json={"token": deact_raw_token, "new_password": "ShouldNotWork123!"},
        )
        assert deact_reset_res.status_code in [400, 403]
        await db_session.refresh(user_in_db)
        assert user_in_db.is_active is False  # Remained deactivated!

        # =========================================================================
        # REQ 13-18: INVITATION AUTHORIZATION SCOPE
        # =========================================================================
        # Consultant cannot invite
        cons_invite = await client.post(
            "/api/v1/users",
            json={"email": "cons_target@test.com", "full_name": "Cons Target", "role": Role.CUSTOMER_USER.value},
            headers=h_consultant,
        )
        assert cons_invite.status_code == 403

        # Client cannot invite
        client_invite = await client.post(
            "/api/v1/users",
            json={"email": "client_target@test.com", "full_name": "Client Target", "role": Role.CUSTOMER_USER.value},
            headers=h_client,
        )
        assert client_invite.status_code == 403

        # Customer Admin cannot invite Partner Admin
        bad_role_inv = await client.post(
            "/api/v1/users",
            json={"email": "bad_admin@custa1.example.com", "full_name": "Bad Admin", "role": Role.PARTNER_ADMIN.value},
            headers=h_cust_admin_a1,
        )
        assert bad_role_inv.status_code == 403

        # Customer Admin resend invitation for own customer user
        resend_res = await client.post(
            f"/api/v1/users/{user_in_db.id}/resend-invitation",
            headers=h_cust_admin_a1,
        )
        assert resend_res.status_code == 200
        assert "resent" in resend_res.json()["message"].lower()

        # =========================================================================
        # REQ 37-41: AUDIT EVENTS SAFEGUARDED
        # =========================================================================
        audit_events_stmt = select(AuditEvent).where(
            AuditEvent.event_type.in_([
                "USER_INVITATION_CREATED",
                "USER_INVITATION_ACCEPTED",
                "USER_PASSWORD_RESET_REQUESTED",
                "USER_PASSWORD_RESET_COMPLETED",
            ])
        )
        audit_events = (await db_session.execute(audit_events_stmt)).scalars().all()
        assert len(audit_events) > 0
        for ae in audit_events:
            details_str = str(ae.details_json or {})
            assert "password" not in details_str.lower() or "password_reset" in details_str.lower()
            assert "hashed_password" not in details_str
            assert "raw_token" not in details_str
            assert "token_hash" not in details_str
