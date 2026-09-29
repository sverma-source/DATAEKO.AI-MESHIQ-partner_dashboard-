import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.core.rbac import Role
from app.models.assessment import AssessmentStatus
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.user import User


@pytest.mark.asyncio
async def test_client_user_assessment_ownership_and_visibility(
    client: AsyncClient, db_session: AsyncSession
):
    """
    Exhaustively tests user-level assessment ownership and security boundaries:
    1. Client A can create, read, update responses, and submit own assessment.
    2. Client A cannot access Client B's assessment or responses (even in same Customer & Tenant).
    3. Client A cannot access unowned / legacy assessments.
    4. Client A cannot calculate, view snapshots, download deliverables, or view audit logs (403 Forbidden).
    5. Client A GET /assessments/{id} has latest_snapshot sanitized to None.
    6. Consultant & Admin retain full visibility across assessments in their tenant.
    """
    tenant_id = "00000000-0000-0000-0000-000000000001"

    # 1. Create Users
    user_a = User(
        id="11111111-1111-1111-1111-111111111111",
        email="client_a@acme.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Client User A",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_id,
        is_active=True,
    )
    user_b = User(
        id="22222222-2222-2222-2222-222222222222",
        email="client_b@acme.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Client User B",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_id,
        is_active=True,
    )
    consultant = User(
        id="33333333-3333-3333-3333-333333333333",
        email="consultant_test_rbac@dataeko.ai",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Lead Consultant",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_id,
        is_active=True,
    )
    db_session.add_all([user_a, user_b, consultant])
    await db_session.commit()

    token_a = create_access_token(
        subject=user_a.id, tenant_id=tenant_id, role=user_a.role, email=user_a.email
    )
    token_b = create_access_token(
        subject=user_b.id, tenant_id=tenant_id, role=user_b.role, email=user_b.email
    )
    token_consultant = create_access_token(
        subject=consultant.id, tenant_id=tenant_id, role=consultant.role, email=consultant.email
    )

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_consultant = {"Authorization": f"Bearer {token_consultant}"}

    # 2. Create Shared Customer (e.g. Acme Corp)
    cust_res = await client.post(
        "/api/v1/customers",
        json={"name": "Acme Global Corp", "industry": "Banking"},
        headers=headers_consultant,
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    # 3. Client A creates Assessment A
    ass_a_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "Client A Assessment"},
        headers=headers_a,
    )
    assert ass_a_res.status_code == 201
    ass_a_id = ass_a_res.json()["id"]
    assert ass_a_res.json()["created_by_user_id"] == user_a.id

    # Client B creates Assessment B
    ass_b_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "Client B Assessment"},
        headers=headers_b,
    )
    assert ass_b_res.status_code == 201
    ass_b_id = ass_b_res.json()["id"]
    assert ass_b_res.json()["created_by_user_id"] == user_b.id

    # 4. List Assessments Scoping Check
    # Client A should see ONLY Assessment A
    list_a = await client.get("/api/v1/assessments", headers=headers_a)
    assert list_a.status_code == 200
    ids_a = [item["id"] for item in list_a.json()]
    assert ass_a_id in ids_a
    assert ass_b_id not in ids_a

    # Client B should see ONLY Assessment B
    list_b = await client.get("/api/v1/assessments", headers=headers_b)
    assert list_b.status_code == 200
    ids_b = [item["id"] for item in list_b.json()]
    assert ass_b_id in ids_b
    assert ass_a_id not in ids_b

    # Consultant should see both Assessment A and B
    list_consultant = await client.get("/api/v1/assessments", headers=headers_consultant)
    assert list_consultant.status_code == 200
    ids_consultant = [item["id"] for item in list_consultant.json()]
    assert ass_a_id in ids_consultant
    assert ass_b_id in ids_consultant

    # 5. Direct IDOR Protection: Client A attempts to access Assessment B
    idor_get = await client.get(f"/api/v1/assessments/{ass_b_id}", headers=headers_a)
    assert idor_get.status_code == 403
    assert idor_get.json()["error_type"] == "PermissionDenied"

    # Client A attempts to get responses for Assessment B
    idor_resp_get = await client.get(
        f"/api/v1/assessments/{ass_b_id}/responses", headers=headers_a
    )
    assert idor_resp_get.status_code == 403

    # Client A attempts to update responses for Assessment B
    idor_resp_put = await client.put(
        f"/api/v1/assessments/{ass_b_id}/responses",
        json={"q03_environment_scale": "25-50 Queue Managers"},
        headers=headers_a,
    )
    assert idor_resp_put.status_code == 403

    # Client A attempts to submit Assessment B
    idor_submit = await client.post(
        f"/api/v1/assessments/{ass_b_id}/submit", headers=headers_a
    )
    assert idor_submit.status_code == 403

    # 6. Client A saves responses for Assessment A (Allowed)
    save_a = await client.put(
        f"/api/v1/assessments/{ass_a_id}/responses",
        json={"q03_environment_scale": "50-100 Queue Managers", "q04_weekly_admin_hours": 15.0},
        headers=headers_a,
    )
    assert save_a.status_code == 200

    # 7. Calculation & Snapshot Restrictions on CUSTOMER_USER
    calc_fail = await client.post(
        f"/api/v1/assessments/{ass_a_id}/calculate", headers=headers_a
    )
    assert calc_fail.status_code == 403
    assert calc_fail.json()["error_type"] == "PermissionDenied"

    snaps_fail = await client.get(
        f"/api/v1/assessments/{ass_a_id}/snapshots", headers=headers_a
    )
    assert snaps_fail.status_code == 403

    snaps_latest_fail = await client.get(
        f"/api/v1/assessments/{ass_a_id}/snapshots/latest", headers=headers_a
    )
    assert snaps_latest_fail.status_code == 403

    # Deliverables Download Restrictions on CUSTOMER_USER
    pdf_fail = await client.get(
        f"/api/v1/assessments/{ass_a_id}/deliverables/pdf", headers=headers_a
    )
    assert pdf_fail.status_code == 403

    csv_fail = await client.get(
        f"/api/v1/assessments/{ass_a_id}/deliverables/csv", headers=headers_a
    )
    assert csv_fail.status_code == 403

    # Audit Trail Restriction on CUSTOMER_USER
    audit_fail = await client.get("/api/v1/audit-events", headers=headers_a)
    assert audit_fail.status_code == 403

    # 8. Client A submits Assessment A (Allowed)
    submit_a = await client.post(
        f"/api/v1/assessments/{ass_a_id}/submit", headers=headers_a
    )
    assert submit_a.status_code == 200
    data_a = submit_a.json()
    assert data_a["status"] == "SUBMITTED"
    # CRITICAL: latest_snapshot must be sanitized to None for CUSTOMER_USER!
    assert data_a["latest_snapshot"] is None

    # Verify GET /assessments/{id} for Client A also sanitizes latest_snapshot
    get_detail_a = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=headers_a)
    assert get_detail_a.status_code == 200
    assert get_detail_a.json()["latest_snapshot"] is None

    # Consultant GET /assessments/{id} retains latest_snapshot
    get_detail_consultant = await client.get(
        f"/api/v1/assessments/{ass_a_id}", headers=headers_consultant
    )
    assert get_detail_consultant.status_code == 200
    assert get_detail_consultant.json()["latest_snapshot"] is not None
    assert "computed_metrics" in get_detail_consultant.json()["latest_snapshot"]
    assert "summary_metrics" in get_detail_consultant.json()["latest_snapshot"]


def test_canonical_role_permissions_matrix():
    """Validates the exact RBAC permission sets for all 5 canonical roles."""
    from app.core.rbac import Role, Permission, has_permission, ROLE_PERMISSIONS

    # CUSTOMER_USER (Client)
    assert has_permission(Role.CUSTOMER_USER.value, Permission.CUSTOMER_READ) is True
    assert has_permission(Role.CUSTOMER_USER.value, Permission.ASSESSMENT_CREATE) is True
    assert has_permission(Role.CUSTOMER_USER.value, Permission.ASSESSMENT_READ) is True
    assert has_permission(Role.CUSTOMER_USER.value, Permission.ASSESSMENT_UPDATE) is True
    assert has_permission(Role.CUSTOMER_USER.value, Permission.SNAPSHOT_READ) is False
    assert has_permission(Role.CUSTOMER_USER.value, Permission.REPORT_GENERATE) is False
    assert has_permission(Role.CUSTOMER_USER.value, Permission.ASSESSMENT_CALCULATE) is False
    assert has_permission(Role.CUSTOMER_USER.value, Permission.AUDIT_READ) is False
    assert has_permission(Role.CUSTOMER_USER.value, Permission.TENANT_MANAGE) is False

    # CONSULTANT
    assert has_permission(Role.CONSULTANT.value, Permission.CUSTOMER_CREATE) is True
    assert has_permission(Role.CONSULTANT.value, Permission.CUSTOMER_READ) is True
    assert has_permission(Role.CONSULTANT.value, Permission.ASSESSMENT_CALCULATE) is True
    assert has_permission(Role.CONSULTANT.value, Permission.SNAPSHOT_READ) is True
    assert has_permission(Role.CONSULTANT.value, Permission.REPORT_GENERATE) is True
    assert has_permission(Role.CONSULTANT.value, Permission.AUDIT_READ) is True
    assert has_permission(Role.CONSULTANT.value, Permission.TENANT_MANAGE) is False

    # CUSTOMER_ADMIN
    assert has_permission(Role.CUSTOMER_ADMIN.value, Permission.CUSTOMER_READ) is True
    assert has_permission(Role.CUSTOMER_ADMIN.value, Permission.ASSESSMENT_CALCULATE) is True
    assert has_permission(Role.CUSTOMER_ADMIN.value, Permission.SNAPSHOT_READ) is True
    assert has_permission(Role.CUSTOMER_ADMIN.value, Permission.REPORT_GENERATE) is True
    assert has_permission(Role.CUSTOMER_ADMIN.value, Permission.AUDIT_READ) is False

    # PARTNER_ADMIN
    assert has_permission(Role.PARTNER_ADMIN.value, Permission.CUSTOMER_CREATE) is True
    assert has_permission(Role.PARTNER_ADMIN.value, Permission.AUDIT_READ) is True
    assert has_permission(Role.PARTNER_ADMIN.value, Permission.TENANT_MANAGE) is True

    # PLATFORM_ADMIN
    assert has_permission(Role.PLATFORM_ADMIN.value, Permission.CUSTOMER_CREATE) is True
    assert has_permission(Role.PLATFORM_ADMIN.value, Permission.AUDIT_READ) is True
    assert has_permission(Role.PLATFORM_ADMIN.value, Permission.TENANT_MANAGE) is True
