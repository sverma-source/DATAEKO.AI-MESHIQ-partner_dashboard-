import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DEFAULT_TENANT_ID
from app.core.rbac import Role
from app.core.security import create_access_token, get_password_hash
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.user import User


@pytest.fixture
def r2_sample_payload():
    return {
        "q01_company_name": "R2 Target Bank",
        "q04_weekly_admin_hours": 15.0,
        "q06_frequency_text": "Monthly",
        "q07_labor_hours_text": "1-4 hours",
        "q12_business_impact": "Significant",
        "q14_duration_text": "1-2 hours",
        "raw_responses": {
            "q01_scale": "51–100 Queue Managers",
            "q04_admin_hours": 15.0,
            "q06_frequency": "Monthly",
            "q07_labor_hours": "1-4 hours",
            "q12_business_impact": "Significant",
            "q14_duration": "1-2 hours",
        },
    }


@pytest.mark.asyncio
async def test_r2_customer_admin_and_multi_role_scoping(
    client: AsyncClient,
    db_session: AsyncSession,
    r2_sample_payload: dict,
):
    """
    Comprehensive R2 Security Hardening Verification:
    1. CUSTOMER_ADMIN can access an assessment belonging to its own customer.
    2. CUSTOMER_ADMIN cannot access a snapshot belonging to another customer in the same tenant.
    3. CUSTOMER_ADMIN cannot download a PDF belonging to another customer in the same tenant.
    4. CUSTOMER_ADMIN cannot download another customer's CSV either.
    5. CUSTOMER_ADMIN cannot access another tenant's resources (safe 404).
    6. CUSTOMER_USER's existing ownership restrictions remain unchanged.
    7. CONSULTANT's existing legitimate access remains unchanged.
    8. PARTNER_ADMIN's existing legitimate access remains unchanged.
    9. PLATFORM_ADMIN's existing legitimate access remains unchanged.
    10. A nonexistent/cross-tenant assessment returns 404; cross-customer within tenant returns 403.
    """
    tenant_1_id = DEFAULT_TENANT_ID
    tenant_2_id = "tenant-0002-2222-2222-222222222222"

    t2 = Tenant(id=tenant_2_id, name="Tenant 2", slug="tenant-2")
    db_session.add(t2)

    # 1. Setup Customers: Cust A and Cust B in Tenant 1; Cust C in Tenant 2
    cust_a = Customer(id="cust-r2-aaa-1111", tenant_id=tenant_1_id, name="Alpha Corp", industry="Banking")
    cust_b = Customer(id="cust-r2-bbb-2222", tenant_id=tenant_1_id, name="Beta Corp", industry="Insurance")
    cust_c = Customer(id="cust-r2-ccc-3333", tenant_id=tenant_2_id, name="Gamma Corp", industry="Retail")
    db_session.add_all([cust_a, cust_b, cust_c])

    # 2. Setup Users
    cust_admin_a = User(
        id="usr-ca-a",
        email="admin@alpha.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Alpha Admin",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=cust_a.id,
        is_active=True,
    )
    client_user_a1 = User(
        id="usr-cu-a1",
        email="user1@alpha.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Alpha User 1",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_1_id,
        customer_id=cust_a.id,
        is_active=True,
    )
    client_user_a2 = User(
        id="usr-cu-a2",
        email="user2@alpha.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Alpha User 2",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_1_id,
        customer_id=cust_a.id,
        is_active=True,
    )
    cust_admin_b = User(
        id="usr-ca-b",
        email="admin@beta.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Beta Admin",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=cust_b.id,
        is_active=True,
    )
    cust_admin_c = User(
        id="usr-ca-c",
        email="admin@gamma.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Gamma Admin",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=tenant_2_id,
        customer_id=cust_c.id,
        is_active=True,
    )
    consultant = User(
        id="usr-cons-1",
        email="lead.consultant@dataeko.ai",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Lead Consultant",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_1_id,
        customer_id=None,
        is_active=True,
    )
    partner_admin = User(
        id="usr-pa-1",
        email="partner.admin@dataeko.ai",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Partner Admin",
        role=Role.PARTNER_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=None,
        is_active=True,
    )
    platform_admin = User(
        id="usr-plat-1",
        email="platform.admin@dataeko.ai",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Platform Admin",
        role=Role.PLATFORM_ADMIN.value,
        tenant_id=tenant_1_id,
        customer_id=None,
        is_active=True,
    )
    db_session.add_all([
        cust_admin_a, client_user_a1, client_user_a2,
        cust_admin_b, cust_admin_c, consultant, partner_admin, platform_admin,
    ])
    await db_session.commit()

    # Headers
    h_ca_a = {"Authorization": f"Bearer {create_access_token(cust_admin_a.id, tenant_1_id, cust_admin_a.role, cust_admin_a.email)}"}
    h_cu_a1 = {"Authorization": f"Bearer {create_access_token(client_user_a1.id, tenant_1_id, client_user_a1.role, client_user_a1.email)}"}
    h_cu_a2 = {"Authorization": f"Bearer {create_access_token(client_user_a2.id, tenant_1_id, client_user_a2.role, client_user_a2.email)}"}
    h_ca_b = {"Authorization": f"Bearer {create_access_token(cust_admin_b.id, tenant_1_id, cust_admin_b.role, cust_admin_b.email)}"}
    h_ca_c = {"Authorization": f"Bearer {create_access_token(cust_admin_c.id, tenant_2_id, cust_admin_c.role, cust_admin_c.email)}"}
    h_cons = {"Authorization": f"Bearer {create_access_token(consultant.id, tenant_1_id, consultant.role, consultant.email)}"}
    h_pa = {"Authorization": f"Bearer {create_access_token(partner_admin.id, tenant_1_id, partner_admin.role, partner_admin.email)}"}
    h_plat = {"Authorization": f"Bearer {create_access_token(platform_admin.id, tenant_1_id, platform_admin.role, platform_admin.email)}"}

    # 3. Create Assessments
    # Ass A created by Client User A1 for Customer A
    res_ass_a = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_a.id, "title": "Alpha MQ Discovery"},
        headers=h_cu_a1,
    )
    assert res_ass_a.status_code == 201
    ass_a_id = res_ass_a.json()["id"]

    # Ass B created by Customer Admin B for Customer B
    res_ass_b = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_b.id, "title": "Beta MQ Discovery"},
        headers=h_ca_b,
    )
    assert res_ass_b.status_code == 201
    ass_b_id = res_ass_b.json()["id"]

    # Populate responses & calculate Ass A
    await client.put(f"/api/v1/assessments/{ass_a_id}/responses", json=r2_sample_payload, headers=h_cu_a1)
    await client.post(f"/api/v1/assessments/{ass_a_id}/submit", headers=h_cu_a1)
    await client.post(f"/api/v1/assessments/{ass_a_id}/calculate", headers=h_cons)

    # Populate responses & calculate Ass B
    await client.put(f"/api/v1/assessments/{ass_b_id}/responses", json=r2_sample_payload, headers=h_ca_b)
    await client.post(f"/api/v1/assessments/{ass_b_id}/submit", headers=h_ca_b)
    await client.post(f"/api/v1/assessments/{ass_b_id}/calculate", headers=h_cons)

    # =========================================================================
    # REQ 1: CUSTOMER_ADMIN can access own customer's assessment, snapshots, deliverables
    # =========================================================================
    ass_a_detail = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=h_ca_a)
    assert ass_a_detail.status_code == 200
    assert ass_a_detail.json()["customer_id"] == cust_a.id

    ass_a_latest_snap = await client.get(f"/api/v1/assessments/{ass_a_id}/snapshots/latest", headers=h_ca_a)
    assert ass_a_latest_snap.status_code == 200

    ass_a_snaps = await client.get(f"/api/v1/assessments/{ass_a_id}/snapshots", headers=h_ca_a)
    assert ass_a_snaps.status_code == 200
    assert len(ass_a_snaps.json()) >= 1

    ass_a_csv = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/csv", headers=h_ca_a)
    assert ass_a_csv.status_code == 200

    ass_a_pdf = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/pdf", headers=h_ca_a)
    assert ass_a_pdf.status_code == 200

    # =========================================================================
    # REQ 2: CUSTOMER_ADMIN cannot access snapshot of another customer in same tenant
    # =========================================================================
    # Cust Admin B tries to get latest snapshot of Customer A's assessment
    unauth_snap = await client.get(f"/api/v1/assessments/{ass_a_id}/snapshots/latest", headers=h_ca_b)
    assert unauth_snap.status_code == 403
    assert "Access denied" in unauth_snap.json()["detail"]

    # Cust Admin B tries to list snapshots of Customer A's assessment
    unauth_snaps = await client.get(f"/api/v1/assessments/{ass_a_id}/snapshots", headers=h_ca_b)
    assert unauth_snaps.status_code == 403

    # =========================================================================
    # REQ 3: CUSTOMER_ADMIN cannot download PDF of another customer in same tenant
    # =========================================================================
    unauth_pdf = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/pdf", headers=h_ca_b)
    assert unauth_pdf.status_code == 403
    assert "Access denied" in unauth_pdf.json()["detail"]

    # =========================================================================
    # REQ 4: CUSTOMER_ADMIN cannot download CSV of another customer in same tenant
    # =========================================================================
    unauth_csv = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/csv", headers=h_ca_b)
    assert unauth_csv.status_code == 403
    assert "Access denied" in unauth_csv.json()["detail"]

    # Also cannot get detail, responses, update, or delete another customer's assessment
    unauth_detail = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=h_ca_b)
    assert unauth_detail.status_code == 403

    unauth_resp = await client.get(f"/api/v1/assessments/{ass_a_id}/responses", headers=h_ca_b)
    assert unauth_resp.status_code == 403

    # =========================================================================
    # REQ 5 & 10: Nonexistent / cross-tenant resource returns safe 404
    # =========================================================================
    nonexistent_uuid = "00000000-0000-0000-0000-999999999999"
    not_found_snap = await client.get(f"/api/v1/assessments/{nonexistent_uuid}/snapshots/latest", headers=h_ca_a)
    assert not_found_snap.status_code == 404

    not_found_pdf = await client.get(f"/api/v1/assessments/{nonexistent_uuid}/deliverables/pdf", headers=h_ca_a)
    assert not_found_pdf.status_code == 404

    # Cross-tenant request with tenant_2 token against tenant_1 assessment -> 404
    cross_tenant_pdf = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/pdf", headers=h_ca_c)
    assert cross_tenant_pdf.status_code == 404

    # =========================================================================
    # REQ 6: CUSTOMER_USER's existing stricter ownership rules preserved
    # =========================================================================
    # User A1 (creator) can access own assessment
    u1_own = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=h_cu_a1)
    assert u1_own.status_code == 200

    # User A2 (different user in SAME customer org) CANNOT access User A1's assessment -> 403
    u2_cross_user = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=h_cu_a2)
    assert u2_cross_user.status_code == 403

    # =========================================================================
    # REQ 7: CONSULTANT retains legitimate tenant-wide access across customers
    # =========================================================================
    cons_ass_a = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=h_cons)
    assert cons_ass_a.status_code == 200

    cons_ass_b = await client.get(f"/api/v1/assessments/{ass_b_id}", headers=h_cons)
    assert cons_ass_b.status_code == 200

    cons_pdf_a = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/pdf", headers=h_cons)
    assert cons_pdf_a.status_code == 200

    cons_pdf_b = await client.get(f"/api/v1/assessments/{ass_b_id}/deliverables/pdf", headers=h_cons)
    assert cons_pdf_b.status_code == 200

    # =========================================================================
    # REQ 8: PARTNER_ADMIN retains legitimate tenant-wide access
    # =========================================================================
    pa_ass_a = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=h_pa)
    assert pa_ass_a.status_code == 200

    pa_pdf_a = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/pdf", headers=h_pa)
    assert pa_pdf_a.status_code == 200

    # =========================================================================
    # REQ 9: PLATFORM_ADMIN retains legitimate administrative scope
    # =========================================================================
    plat_ass_a = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=h_plat)
    assert plat_ass_a.status_code == 200

    plat_pdf_a = await client.get(f"/api/v1/assessments/{ass_a_id}/deliverables/pdf", headers=h_plat)
    assert plat_pdf_a.status_code == 200
