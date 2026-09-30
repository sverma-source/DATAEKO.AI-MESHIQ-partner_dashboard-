import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import Role
from app.core.security import create_access_token, get_password_hash
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.user import User


@pytest.mark.asyncio
async def test_assessment_lifecycle(client: AsyncClient, auth_headers: dict):
    # 1. Setup Customer
    cust_res = await client.post(
        "/api/v1/customers", json={"name": "Acme Financial Group"}, headers=auth_headers
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    # 2. Create Assessment with invalid customer -> 404
    bad_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": "00000000-0000-0000-0000-000000000999", "title": "Bad Assessment"},
        headers=auth_headers,
    )
    assert bad_res.status_code == 404

    # 3. Create Assessment
    create_payload = {
        "customer_id": customer_id,
        "title": "2026 Q3 MQ Efficiency Discovery",
        "description": "Initial economic assessment for core messaging clusters",
    }
    create_res = await client.post("/api/v1/assessments", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201
    assessment_data = create_res.json()
    assessment_id = assessment_data["id"]
    assert assessment_data["title"] == "2026 Q3 MQ Efficiency Discovery"
    assert assessment_data["status"] == "DRAFT"
    assert assessment_data["assessment_version"] == "1.0.0"

    # 4. Get Assessment Detail (checks eager loading)
    get_res = await client.get(f"/api/v1/assessments/{assessment_id}", headers=auth_headers)
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["id"] == assessment_id
    assert detail["customer"]["name"] == "Acme Financial Group"
    assert detail["response"] is None
    assert detail["latest_snapshot"] is None

    # 5. List Assessments (with customer filter)
    list_res = await client.get(f"/api/v1/assessments?customer_id={customer_id}", headers=auth_headers)
    assert list_res.status_code == 200
    assessments = list_res.json()
    assert len(assessments) == 1
    assert assessments[0]["id"] == assessment_id

    # 6. Update Assessment Metadata
    update_res = await client.put(
        f"/api/v1/assessments/{assessment_id}",
        json={"title": "Updated 2026 Q3 MQ Efficiency Discovery"},
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated 2026 Q3 MQ Efficiency Discovery"

    # 7. Delete Assessment
    del_res = await client.delete(f"/api/v1/assessments/{assessment_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # 8. Verify 404
    get_after_del = await client.get(f"/api/v1/assessments/{assessment_id}", headers=auth_headers)
    assert get_after_del.status_code == 404

    # 9. Verify 404 on non-existent assessment operations
    non_existent_id = "00000000-0000-0000-0000-000000000999"
    assert (await client.put(f"/api/v1/assessments/{non_existent_id}", json={"title": "test"}, headers=auth_headers)).status_code == 404
    assert (await client.delete(f"/api/v1/assessments/{non_existent_id}", headers=auth_headers)).status_code == 404
    assert (await client.post(f"/api/v1/assessments/{non_existent_id}/calculate", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/api/v1/assessments/{non_existent_id}/snapshots", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/api/v1/assessments/{non_existent_id}/snapshots/latest", headers=auth_headers)).status_code == 404
    assert (await client.put(f"/api/v1/assessments/{non_existent_id}/responses", json={}, headers=auth_headers)).status_code == 404


@pytest.mark.asyncio
async def test_p0_unauthenticated_assessment_access_strictly_returns_401(client: AsyncClient, auth_headers: dict):
    """
    P0 Regression Test: Proves that all assessment endpoints strictly require authentication.
    Anonymous callers must receive HTTP 401 Unauthorized and never receive lists, metadata,
    responses, discovery details, calculation snapshots, or financial metrics.
    """
    # Create an assessment using authorized credentials to test against
    cust_res = await client.post(
        "/api/v1/customers", json={"name": "Secure Finance Co"}, headers=auth_headers
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "Confidential Assessment"},
        headers=auth_headers,
    )
    assert create_res.status_code == 201
    assessment_id = create_res.json()["id"]

    # 1. Anonymous GET /api/v1/assessments -> 401
    res_list = await client.get("/api/v1/assessments")
    assert res_list.status_code == 401
    assert "Authentication required" in res_list.text or "detail" in res_list.json()

    # 2. Anonymous GET /api/v1/assessments/{id} -> 401
    res_get = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert res_get.status_code == 401
    assert "Authentication required" in res_get.text or "detail" in res_get.json()

    # 3. Anonymous POST /api/v1/assessments -> 401
    res_create = await client.post("/api/v1/assessments", json={"customer_id": customer_id, "title": "Hacked Assessment"})
    assert res_create.status_code == 401

    # 4. Anonymous PUT /api/v1/assessments/{id} -> 401
    res_update = await client.put(f"/api/v1/assessments/{assessment_id}", json={"title": "Hacked Title"})
    assert res_update.status_code == 401

    # 5. Anonymous PUT /api/v1/assessments/{id}/responses -> 401
    res_save_resp = await client.put(f"/api/v1/assessments/{assessment_id}/responses", json={"q01_company_name": "Infiltrator"})
    assert res_save_resp.status_code == 401

    # 6. Anonymous GET /api/v1/assessments/{id}/responses -> 401
    res_get_resp = await client.get(f"/api/v1/assessments/{assessment_id}/responses")
    assert res_get_resp.status_code == 401

    # 7. Anonymous POST /api/v1/assessments/{id}/submit -> 401
    res_submit = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
    assert res_submit.status_code == 401

    # 8. Anonymous POST /api/v1/assessments/{id}/calculate -> 401
    res_calc = await client.post(f"/api/v1/assessments/{assessment_id}/calculate")
    assert res_calc.status_code == 401

    # 9. Anonymous GET /api/v1/assessments/{id}/snapshots -> 401
    res_snaps = await client.get(f"/api/v1/assessments/{assessment_id}/snapshots")
    assert res_snaps.status_code == 401

    # 10. Anonymous GET /api/v1/assessments/{id}/snapshots/latest -> 401
    res_latest = await client.get(f"/api/v1/assessments/{assessment_id}/snapshots/latest")
    assert res_latest.status_code == 401

    # 11. Anonymous DELETE /api/v1/assessments/{id} -> 401
    res_del = await client.delete(f"/api/v1/assessments/{assessment_id}")
    assert res_del.status_code == 401

    # 12. Anonymous Deliverables GET -> 401
    res_csv = await client.get(f"/api/v1/assessments/{assessment_id}/deliverables/csv")
    assert res_csv.status_code == 401
    res_pdf = await client.get(f"/api/v1/assessments/{assessment_id}/deliverables/pdf")
    assert res_pdf.status_code == 401

    # 13. Invalid / tampered JWT -> 401
    bad_token_headers = {"Authorization": "Bearer invalid.jwt.signature"}
    res_bad_token = await client.get(f"/api/v1/assessments/{assessment_id}", headers=bad_token_headers)
    assert res_bad_token.status_code == 401


@pytest.mark.asyncio
async def test_p0_tenant_and_role_access_boundaries(client: AsyncClient, db_session: AsyncSession):
    """
    P0 Regression Test:
    - Customer User can only access own assessment
    - Customer User cannot access another customer's assessment (403)
    - Consultant retains consultant scope (can view assessment + latest_snapshot)
    - Platform Administrator retains governance scope
    - latest_snapshot is sanitized to None for Customer User
    """
    tenant_id = "00000000-0000-0000-0000-000000000001"

    # Setup Customers
    cust_a = Customer(id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", tenant_id=tenant_id, name="Customer Org A")
    cust_b = Customer(id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", tenant_id=tenant_id, name="Customer Org B")
    db_session.add_all([cust_a, cust_b])

    # Setup Users
    user_a = User(
        id="11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        email="usera@org-a.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="User A",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_id,
        customer_id=cust_a.id,
        is_active=True,
    )
    user_b = User(
        id="22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        email="userb@org-b.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="User B",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_id,
        customer_id=cust_b.id,
        is_active=True,
    )
    consultant = User(
        id="33333333-cccc-cccc-cccc-cccccccccccc",
        email="consultant_p0_test@dataeko.ai",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Consultant C",
        role=Role.CONSULTANT.value,
        tenant_id=tenant_id,
        is_active=True,
    )
    admin = User(
        id="44444444-dddd-dddd-dddd-dddddddddddd",
        email="admin_p0@dataeko.ai",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Platform Admin",
        role=Role.PLATFORM_ADMIN.value,
        tenant_id=tenant_id,
        is_active=True,
    )
    db_session.add_all([user_a, user_b, consultant, admin])
    await db_session.commit()

    headers_a = {"Authorization": f"Bearer {create_access_token(subject=user_a.id, tenant_id=tenant_id, role=user_a.role, email=user_a.email)}"}
    headers_b = {"Authorization": f"Bearer {create_access_token(subject=user_b.id, tenant_id=tenant_id, role=user_b.role, email=user_b.email)}"}
    headers_consultant = {"Authorization": f"Bearer {create_access_token(subject=consultant.id, tenant_id=tenant_id, role=consultant.role, email=consultant.email)}"}
    headers_admin = {"Authorization": f"Bearer {create_access_token(subject=admin.id, tenant_id=tenant_id, role=admin.role, email=admin.email)}"}

    # User A creates Assessment for Org A
    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_a.id, "title": "Org A Assessment"},
        headers=headers_a,
    )
    assert create_res.status_code == 201
    ass_a_id = create_res.json()["id"]

    # User A can get own assessment
    get_a_res = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=headers_a)
    assert get_a_res.status_code == 200
    assert get_a_res.json()["latest_snapshot"] is None  # sanitized for customer user

    # User B CANNOT get User A's assessment -> 403 Forbidden
    get_b_on_a = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=headers_b)
    assert get_b_on_a.status_code == 403

    # User B CANNOT update User A's assessment -> 403 Forbidden
    put_b_on_a = await client.put(f"/api/v1/assessments/{ass_a_id}", json={"title": "Hacked"}, headers=headers_b)
    assert put_b_on_a.status_code == 403

    # Consultant can get User A's assessment
    get_cons_res = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=headers_consultant)
    assert get_cons_res.status_code == 200

    # Platform Admin can get User A's assessment
    get_admin_res = await client.get(f"/api/v1/assessments/{ass_a_id}", headers=headers_admin)
    assert get_admin_res.status_code == 200

    # User A cannot create assessment for Org B -> 403 Forbidden
    create_cross_cust = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_b.id, "title": "Unauthorized Cross-Org"},
        headers=headers_a,
    )
    assert create_cross_cust.status_code == 403
