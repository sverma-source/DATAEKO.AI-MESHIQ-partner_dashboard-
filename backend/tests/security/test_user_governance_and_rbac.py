import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.audit_event import AuditEvent
from app.models.tenant import Tenant
from app.models.user import User


@pytest.mark.asyncio
async def test_user_governance_and_rbac_boundaries(client: AsyncClient, db_session: AsyncSession):
    tenant_a_id = "11111111-1111-1111-1111-111111111111"
    tenant_b_id = "22222222-2222-2222-2222-222222222222"

    # 1. Setup Tenants
    t_a = Tenant(id=tenant_a_id, name="Tenant A", slug="tenant-a")
    t_b = Tenant(id=tenant_b_id, name="Tenant B", slug="tenant-b")
    db_session.add_all([t_a, t_b])

    # 2. Setup Users
    platform_admin = User(
        id="usr-platform-admin",
        email="platform_admin@test.com",
        hashed_password=get_password_hash("Platform123!"),
        full_name="Platform Admin",
        role=Role.PLATFORM_ADMIN.value,
        tenant_id=tenant_a_id,
        is_active=True,
    )
    partner_admin_a = User(
        id="usr-partner-admin-a",
        email="partner_admin_a@test.com",
        hashed_password=get_password_hash("Partner123!"),
        full_name="Partner Admin A",
        role=Role.PARTNER_ADMIN.value,
        tenant_id=tenant_a_id,
        is_active=True,
    )
    customer_admin_a = User(
        id="usr-customer-admin-a",
        email="customer_admin_a@test.com",
        hashed_password=get_password_hash("CustAdmin123!"),
        full_name="Customer Admin A",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=tenant_a_id,
        is_active=True,
    )
    consultant_a = User(
        id="usr-consultant-a",
        email="consultant_a@test.com",
        hashed_password=get_password_hash("Consultant123!"),
        full_name="Consultant A",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_a_id,
        is_active=True,
    )
    customer_user_a = User(
        id="usr-customer-user-a",
        email="customer_user_a@test.com",
        hashed_password=get_password_hash("Client123!"),
        full_name="Client User A",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_a_id,
        is_active=True,
    )
    partner_admin_b = User(
        id="usr-partner-admin-b",
        email="partner_admin_b@test.com",
        hashed_password=get_password_hash("Partner123!"),
        full_name="Partner Admin B",
        role=Role.PARTNER_ADMIN.value,
        tenant_id=tenant_b_id,
        is_active=True,
    )
    db_session.add_all([
        platform_admin,
        partner_admin_a,
        customer_admin_a,
        consultant_a,
        customer_user_a,
        partner_admin_b,
    ])
    await db_session.commit()

    # Generate auth tokens
    token_platform = create_access_token(subject=platform_admin.id, tenant_id=tenant_a_id, role=platform_admin.role, email=platform_admin.email)
    token_partner_a = create_access_token(subject=partner_admin_a.id, tenant_id=tenant_a_id, role=partner_admin_a.role, email=partner_admin_a.email)
    token_customer_admin_a = create_access_token(subject=customer_admin_a.id, tenant_id=tenant_a_id, role=customer_admin_a.role, email=customer_admin_a.email)
    token_consultant_a = create_access_token(subject=consultant_a.id, tenant_id=tenant_a_id, role=consultant_a.role, email=consultant_a.email)
    token_customer_user_a = create_access_token(subject=customer_user_a.id, tenant_id=tenant_a_id, role=customer_user_a.role, email=customer_user_a.email)
    token_partner_b = create_access_token(subject=partner_admin_b.id, tenant_id=tenant_b_id, role=partner_admin_b.role, email=partner_admin_b.email)

    headers_platform = {"Authorization": f"Bearer {token_platform}"}
    headers_partner_a = {"Authorization": f"Bearer {token_partner_a}"}
    headers_customer_admin_a = {"Authorization": f"Bearer {token_customer_admin_a}"}
    headers_consultant_a = {"Authorization": f"Bearer {token_consultant_a}"}
    headers_customer_user_a = {"Authorization": f"Bearer {token_customer_user_a}"}
    headers_partner_b = {"Authorization": f"Bearer {token_partner_b}"}

    # -------------------------------------------------------------
    # 1-3. CUSTOMER_ADMIN PROHIBITED FROM HIGH PRIVILEGE ROLES
    # -------------------------------------------------------------
    for forbidden_role in [Role.PLATFORM_ADMIN.value, Role.PARTNER_ADMIN.value, Role.CONSULTANT.value]:
        res = await client.post(
            "/api/v1/users",
            json={
                "email": f"test_{forbidden_role.lower()}@test.com",
                "password": "Password123!",
                "full_name": f"Test {forbidden_role}",
                "role": forbidden_role,
            },
            headers=headers_customer_admin_a,
        )
        assert res.status_code == 403

    # -------------------------------------------------------------
    # 4. PARTNER_ADMIN CANNOT CREATE PLATFORM_ADMIN
    # -------------------------------------------------------------
    res = await client.post(
        "/api/v1/users",
        json={
            "email": "escalated_admin@test.com",
            "password": "Password123!",
            "full_name": "Escalated Admin",
            "role": Role.PLATFORM_ADMIN.value,
        },
        headers=headers_partner_a,
    )
    assert res.status_code == 403

    # -------------------------------------------------------------
    # 5. PARTNER_ADMIN PROVISIONING VALID ROLES (SUCCESS)
    # -------------------------------------------------------------
    create_res = await client.post(
        "/api/v1/users",
        json={
            "email": "new_client_user@acme.com",
            "password": "Password123!",
            "full_name": "New Client User",
            "role": Role.CUSTOMER_USER.value,
        },
        headers=headers_partner_a,
    )
    assert create_res.status_code == 201
    new_user_data = create_res.json()
    assert new_user_data["email"] == "new_client_user@acme.com"
    assert new_user_data["role"] == Role.CUSTOMER_USER.value
    assert new_user_data["tenant_id"] == tenant_a_id
    assert "password" not in new_user_data
    assert "hashed_password" not in new_user_data
    new_user_id = new_user_data["id"]

    # -------------------------------------------------------------
    # 6. CUSTOMER_USER & CONSULTANT RECEIVE 403 ON USER ENDPOINTS
    # -------------------------------------------------------------
    assert (await client.get("/api/v1/users", headers=headers_customer_user_a)).status_code == 403
    assert (await client.get("/api/v1/users", headers=headers_consultant_a)).status_code == 403
    assert (await client.post("/api/v1/users", json={"email": "a@a.com", "password": "Pass123!", "full_name": "A", "role": "CUSTOMER_USER"}, headers=headers_customer_user_a)).status_code == 403
    assert (await client.post("/api/v1/users", json={"email": "a@a.com", "password": "Pass123!", "full_name": "A", "role": "CUSTOMER_USER"}, headers=headers_consultant_a)).status_code == 403

    # -------------------------------------------------------------
    # 7. DUPLICATE EMAIL RETURNS 409 CONFLICT
    # -------------------------------------------------------------
    dup_res = await client.post(
        "/api/v1/users",
        json={
            "email": "new_client_user@acme.com",
            "password": "Password123!",
            "full_name": "Duplicate User",
            "role": Role.CUSTOMER_USER.value,
        },
        headers=headers_partner_a,
    )
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()

    # -------------------------------------------------------------
    # 8. PASSWORD STORED AS BCRYPT HASH (NEVER PLAINTEXT)
    # -------------------------------------------------------------
    stmt = select(User).where(User.id == new_user_id)
    db_user = (await db_session.execute(stmt)).scalar_one()
    assert db_user.hashed_password != "Password123!"
    assert verify_password("Password123!", db_user.hashed_password) is True

    # -------------------------------------------------------------
    # 9. USER DEACTIVATION & AUTHENTICATION BLOCK
    # -------------------------------------------------------------
    # Activate user first (since Batch 4D provisions as invited/inactive)
    await client.put(
        f"/api/v1/users/{new_user_id}",
        json={"is_active": True},
        headers=headers_partner_a,
    )

    # Deactivate user
    deact_res = await client.put(
        f"/api/v1/users/{new_user_id}",
        json={"is_active": False},
        headers=headers_partner_a,
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Attempt login with deactivated user
    login_fail = await client.post(
        "/api/v1/auth/login",
        json={"email": "new_client_user@acme.com", "password": "Password123!"},
    )
    assert login_fail.status_code == 401
    assert "inactive" in login_fail.json()["detail"].lower()

    # Reactivate user
    react_res = await client.put(
        f"/api/v1/users/{new_user_id}",
        json={"is_active": True},
        headers=headers_partner_a,
    )
    assert react_res.status_code == 200
    assert react_res.json()["is_active"] is True

    # -------------------------------------------------------------
    # 10. ROLE CHANGE & AUDIT TRAIL VERIFICATION
    # -------------------------------------------------------------
    role_change_res = await client.put(
        f"/api/v1/users/{new_user_id}",
        json={"role": Role.CUSTOMER_ADMIN.value},
        headers=headers_partner_a,
    )
    assert role_change_res.status_code == 200
    assert role_change_res.json()["role"] == Role.CUSTOMER_ADMIN.value

    # Verify Audit Events in database
    audit_stmt = select(AuditEvent).where(AuditEvent.resource_id == new_user_id)
    events = (await db_session.execute(audit_stmt)).scalars().all()
    event_types = [e.event_type for e in events]
    assert "USER_CREATED" in event_types
    assert "USER_DEACTIVATED" in event_types
    assert "USER_ACTIVATED" in event_types
    assert "USER_ROLE_CHANGED" in event_types

    # -------------------------------------------------------------
    # 11. CROSS-TENANT USER IDOR IS BLOCKED (404 NOT FOUND)
    # -------------------------------------------------------------
    # Partner Admin B in Tenant B tries to access user in Tenant A
    idor_get = await client.get(f"/api/v1/users", headers=headers_partner_b)
    assert idor_get.status_code == 200
    b_user_ids = [u["id"] for u in idor_get.json()]
    assert new_user_id not in b_user_ids

    idor_put = await client.put(
        f"/api/v1/users/{new_user_id}",
        json={"full_name": "Hacked Name"},
        headers=headers_partner_b,
    )
    assert idor_put.status_code == 404

    # -------------------------------------------------------------
    # 12. CUSTOMER CREATE / UPDATE RBAC HARDENING
    # -------------------------------------------------------------
    # CUSTOMER_USER cannot create customers
    cust_create_user_fail = await client.post(
        "/api/v1/customers",
        json={"name": "Illegal Customer"},
        headers=headers_customer_user_a,
    )
    assert cust_create_user_fail.status_code == 403

    # PARTNER_ADMIN can create customer
    cust_create_ok = await client.post(
        "/api/v1/customers",
        json={"name": "Authorized Customer Corp", "industry": "Finance"},
        headers=headers_partner_a,
    )
    assert cust_create_ok.status_code == 201
    created_cust_id = cust_create_ok.json()["id"]

    # CUSTOMER_USER cannot update customer
    cust_update_user_fail = await client.put(
        f"/api/v1/customers/{created_cust_id}",
        json={"name": "Hacked Corp"},
        headers=headers_customer_user_a,
    )
    assert cust_update_user_fail.status_code == 403

    # PARTNER_ADMIN can update customer
    cust_update_ok = await client.put(
        f"/api/v1/customers/{created_cust_id}",
        json={"name": "Authorized Customer Holdings"},
        headers=headers_partner_a,
    )
    assert cust_update_ok.status_code == 200
    assert cust_update_ok.json()["name"] == "Authorized Customer Holdings"
