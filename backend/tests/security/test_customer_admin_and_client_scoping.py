import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.core.security import create_access_token, get_password_hash
from app.models.assessment import Assessment, AssessmentStatus
from app.models.audit_event import AuditEvent
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.user import User


@pytest.mark.asyncio
async def test_customer_admin_and_client_organization_scoping(client: AsyncClient, db_session: AsyncSession):
    tenant_1_id = "tenant-0001-1111-1111-111111111111"
    tenant_2_id = "tenant-0002-2222-2222-222222222222"

    # 1. Setup Tenants
    t1 = Tenant(id=tenant_1_id, name="Tenant 1", slug="tenant-1")
    t2 = Tenant(id=tenant_2_id, name="Tenant 2", slug="tenant-2")
    db_session.add_all([t1, t2])

    # 2. Setup Customers in Tenant 1 and Tenant 2
    cust_1a = Customer(id="cust-1a-0000-0000-000000000001", tenant_id=tenant_1_id, name="Acme Corp A", industry="Finance")
    cust_1b = Customer(id="cust-1b-0000-0000-000000000002", tenant_id=tenant_1_id, name="Beta Corp B", industry="Retail")
    cust_2a = Customer(id="cust-2a-0000-0000-000000000003", tenant_id=tenant_2_id, name="Gamma Corp C", industry="Healthcare")
    db_session.add_all([cust_1a, cust_1b, cust_2a])

    # 3. Setup Users with customer_id scopes
    platform_admin = User(
        id="usr-platform",
        email="platform@mesh.ai",
        hashed_password=get_password_hash("Platform123!"),
        full_name="Platform Superadmin",
        role=Role.PLATFORM_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=None,
        is_active=True,
    )
    partner_admin = User(
        id="usr-partner-1",
        email="partner1@mesh.ai",
        hashed_password=get_password_hash("Partner123!"),
        full_name="Partner Admin 1",
        role=Role.PARTNER_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=None,
        is_active=True,
    )
    cust_admin_1a = User(
        id="usr-cust-admin-1a",
        email="admin@acme.corp",
        hashed_password=get_password_hash("CustAdmin123!"),
        full_name="Acme Customer Admin",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=cust_1a.id,
        is_active=True,
    )
    cust_admin_1b = User(
        id="usr-cust-admin-1b",
        email="admin@beta.corp",
        hashed_password=get_password_hash("CustAdmin123!"),
        full_name="Beta Customer Admin",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=cust_1b.id,
        is_active=True,
    )
    client_user_1a = User(
        id="usr-client-1a",
        email="client1@acme.corp",
        hashed_password=get_password_hash("ClientPass123!"),
        full_name="Acme Client 1",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_1_id,
        customer_id=cust_1a.id,
        is_active=True,
    )
    client_user_1a_other = User(
        id="usr-client-1a-other",
        email="client2@acme.corp",
        hashed_password=get_password_hash("ClientPass123!"),
        full_name="Acme Client 2",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_1_id,
        customer_id=cust_1a.id,
        is_active=True,
    )
    client_user_1b = User(
        id="usr-client-1b",
        email="client1@beta.corp",
        hashed_password=get_password_hash("ClientPass123!"),
        full_name="Beta Client 1",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_1_id,
        customer_id=cust_1b.id,
        is_active=True,
    )
    consultant = User(
        id="usr-consultant-1",
        email="consultant@mesh.ai",
        hashed_password=get_password_hash("Consultant123!"),
        full_name="Lead Consultant",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_1_id,
        customer_id=None,
        is_active=True,
    )
    db_session.add_all([
        platform_admin, partner_admin, cust_admin_1a, cust_admin_1b,
        client_user_1a, client_user_1a_other, client_user_1b, consultant,
    ])

    # 4. Setup Assessments
    ass_1a_client1 = Assessment(
        id="ass-1a-001",
        tenant_id=tenant_1_id,
        customer_id=cust_1a.id,
        created_by_user_id=client_user_1a.id,
        title="Acme Assessment 1",
        status=AssessmentStatus.DRAFT,
    )
    ass_1a_client2 = Assessment(
        id="ass-1a-002",
        tenant_id=tenant_1_id,
        customer_id=cust_1a.id,
        created_by_user_id=client_user_1a_other.id,
        title="Acme Assessment 2",
        status=AssessmentStatus.DRAFT,
    )
    db_session.add_all([ass_1a_client1, ass_1a_client2])
    await db_session.commit()

    # Headers
    h_plat = {"Authorization": f"Bearer {create_access_token(platform_admin.id, tenant_1_id, platform_admin.role, platform_admin.email)}"}
    h_partner = {"Authorization": f"Bearer {create_access_token(partner_admin.id, tenant_1_id, partner_admin.role, partner_admin.email)}"}
    h_cust_admin_1a = {"Authorization": f"Bearer {create_access_token(cust_admin_1a.id, tenant_1_id, cust_admin_1a.role, cust_admin_1a.email)}"}
    h_cust_admin_1b = {"Authorization": f"Bearer {create_access_token(cust_admin_1b.id, tenant_1_id, cust_admin_1b.role, cust_admin_1b.email)}"}
    h_client_1a = {"Authorization": f"Bearer {create_access_token(client_user_1a.id, tenant_1_id, client_user_1a.role, client_user_1a.email)}"}
    h_consultant = {"Authorization": f"Bearer {create_access_token(consultant.id, tenant_1_id, consultant.role, consultant.email)}"}

    # =========================================================================
    # REQ 3-4: CUSTOMER_ADMIN SEES ONLY OWN CUSTOMER USERS
    # =========================================================================
    res = await client.get("/api/v1/users", headers=h_cust_admin_1a)
    assert res.status_code == 200
    user_emails = [u["email"] for u in res.json()]
    assert "admin@acme.corp" in user_emails
    assert "client1@acme.corp" in user_emails
    assert "client2@acme.corp" in user_emails
    assert "admin@beta.corp" not in user_emails
    assert "client1@beta.corp" not in user_emails
    assert "partner1@mesh.ai" not in user_emails

    # =========================================================================
    # REQ 5 & 16: CUSTOMER_ADMIN CANNOT ACCESS / MUTATE ANOTHER CUSTOMER'S USER
    # =========================================================================
    put_cross_cust = await client.put(
        f"/api/v1/users/{client_user_1b.id}",
        json={"full_name": "Hacked Name"},
        headers=h_cust_admin_1a,
    )
    assert put_cross_cust.status_code == 404

    # =========================================================================
    # REQ 7-8: CUSTOMER_ADMIN PROVISIONING (FORCED OWN CUSTOMER SCOPE)
    # =========================================================================
    prov_res = await client.post(
        "/api/v1/users",
        json={
            "email": "new_scoped_client@acme.corp",
            "password": "SecurePassword123!",
            "full_name": "New Scoped Client",
            "role": Role.CUSTOMER_USER.value,
            "customer_id": cust_1b.id,  # Malicious attempt to assign Beta Corp
        },
        headers=h_cust_admin_1a,
    )
    assert prov_res.status_code == 201
    prov_data = prov_res.json()
    assert prov_data["email"] == "new_scoped_client@acme.corp"
    assert prov_data["customer_id"] == cust_1a.id  # Server forced Acme Corp!
    assert prov_data["tenant_id"] == tenant_1_id

    # =========================================================================
    # REQ 9-12: CUSTOMER_ADMIN CANNOT CREATE HIGHER/OTHER ROLES
    # =========================================================================
    for role in [Role.PLATFORM_ADMIN.value, Role.PARTNER_ADMIN.value, Role.CONSULTANT.value, Role.CUSTOMER_ADMIN.value]:
        bad_role_res = await client.post(
            "/api/v1/users",
            json={
                "email": f"bad_{role.lower()}@acme.corp",
                "password": "SecurePassword123!",
                "full_name": "Bad Role",
                "role": role,
            },
            headers=h_cust_admin_1a,
        )
        assert bad_role_res.status_code == 403

    # =========================================================================
    # REQ 15: CUSTOMER_ADMIN CANNOT SELF-DEACTIVATE
    # =========================================================================
    self_deact = await client.put(
        f"/api/v1/users/{cust_admin_1a.id}",
        json={"is_active": False},
        headers=h_cust_admin_1a,
    )
    assert self_deact.status_code == 403
    assert "cannot deactivate their own account" in self_deact.json()["detail"]

    # =========================================================================
    # REQ 17-18: PARTNER & PLATFORM ADMIN SCOPE RETENTION
    # =========================================================================
    partner_list = await client.get("/api/v1/users", headers=h_partner)
    assert partner_list.status_code == 200
    p_emails = [u["email"] for u in partner_list.json()]
    assert "admin@acme.corp" in p_emails
    assert "admin@beta.corp" in p_emails

    # Cross-tenant customer assignment rejected
    cross_tenant_assign = await client.post(
        "/api/v1/users",
        json={
            "email": "cross_tenant@test.com",
            "password": "SecurePassword123!",
            "full_name": "Cross Tenant Assign",
            "role": Role.CUSTOMER_USER.value,
            "customer_id": cust_2a.id,  # Belongs to Tenant 2
        },
        headers=h_partner,  # Belongs to Tenant 1
    )
    assert cross_tenant_assign.status_code == 404

    # =========================================================================
    # REQ 21-23: CLIENT (CUSTOMER_USER) ASSESSMENT ISOLATION PRESERVED
    # =========================================================================
    # Client 1 can access own assessment
    own_ass = await client.get(f"/api/v1/assessments/{ass_1a_client1.id}", headers=h_client_1a)
    assert own_ass.status_code == 200

    # Client 1 CANNOT access Client 2's assessment even in same customer org!
    other_ass = await client.get(f"/api/v1/assessments/{ass_1a_client2.id}", headers=h_client_1a)
    assert other_ass.status_code == 403

    # =========================================================================
    # REQ 24-25: ASSESSMENT CREATION CLIENT SPOOFING BLOCKED
    # =========================================================================
    ass_spoof = await client.post(
        "/api/v1/assessments",
        json={
            "customer_id": cust_1b.id,  # Client 1 tries to create assessment for Beta Corp
            "title": "Spoofed Assessment",
        },
        headers=h_client_1a,
    )
    assert ass_spoof.status_code == 403

    # =========================================================================
    # P2: CUSTOMER_USER CUSTOMER SCOPING & DIRECT ACCESS 403
    # =========================================================================
    # Client 1 lists customers: ONLY own customer organization returned
    client_cust_list = await client.get("/api/v1/customers", headers=h_client_1a)
    assert client_cust_list.status_code == 200
    c_ids = [c["id"] for c in client_cust_list.json()]
    assert c_ids == [cust_1a.id]
    assert cust_1b.id not in c_ids
    assert cust_2a.id not in c_ids

    # Client 1 can access own customer detail
    client_own_cust = await client.get(f"/api/v1/customers/{cust_1a.id}", headers=h_client_1a)
    assert client_own_cust.status_code == 200
    assert client_own_cust.json()["name"] == "Acme Corp A"

    # Client 1 CANNOT access unauthorized customer detail -> 403 Forbidden
    client_unauth_cust = await client.get(f"/api/v1/customers/{cust_1b.id}", headers=h_client_1a)
    assert client_unauth_cust.status_code == 403
    assert "Access to this customer organization is forbidden." in client_unauth_cust.json()["detail"]

    # Consultant retains full tenant customer list
    consultant_cust_list = await client.get("/api/v1/customers", headers=h_consultant)
    assert consultant_cust_list.status_code == 200
    cons_c_ids = [c["id"] for c in consultant_cust_list.json()]
    assert cust_1a.id in cons_c_ids
    assert cust_1b.id in cons_c_ids

    # Platform admin retains full tenant customer list
    admin_cust_list = await client.get("/api/v1/customers", headers=h_plat)
    assert admin_cust_list.status_code == 200
    adm_c_ids = [c["id"] for c in admin_cust_list.json()]
    assert cust_1a.id in adm_c_ids
    assert cust_1b.id in adm_c_ids

    # =========================================================================
    # REQ 27-28: AUDIT EVENTS SAFEGUARDED
    # =========================================================================
    audit_stmt = select(AuditEvent).where(AuditEvent.event_type == "USER_CUSTOMER_ASSIGNED")
    audit_res = await db_session.execute(audit_stmt)
    events = audit_res.scalars().all()
    assert len(events) > 0
    for e in events:
        assert "password" not in str(e.details_json)
        assert "hashed_password" not in str(e.details_json)
        assert "customer_id" in e.details_json
