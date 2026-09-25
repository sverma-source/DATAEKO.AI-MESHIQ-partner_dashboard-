import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import create_access_token, get_password_hash
from app.models.tenant import Tenant
from app.models.user import User


@pytest.mark.asyncio
async def test_cross_tenant_isolation_and_anti_idor(client: AsyncClient, db_session: AsyncSession):
    tenant_a_id = "11111111-1111-1111-1111-111111111111"
    tenant_b_id = "22222222-2222-2222-2222-222222222222"

    # Create Tenant A
    t_a = Tenant(id=tenant_a_id, name="Tenant A Corp", slug="tenant-a")
    db_session.add(t_a)

    # Create Tenant B
    t_b = Tenant(id=tenant_b_id, name="Tenant B Corp", slug="tenant-b")
    db_session.add(t_b)

    # Create User A
    u_a = User(
        id="user-a-uuid",
        email="user.a@tenanta.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="User A",
        role="CONSULTANT",
        tenant_id=tenant_a_id,
        is_active=True,
    )
    db_session.add(u_a)

    # Create User B
    u_b = User(
        id="user-b-uuid",
        email="user.b@tenantb.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="User B",
        role="CONSULTANT",
        tenant_id=tenant_b_id,
        is_active=True,
    )
    db_session.add(u_b)

    await db_session.commit()

    token_a = create_access_token(subject="user-a-uuid", tenant_id=tenant_a_id, role="CONSULTANT", email="user.a@tenanta.com")
    token_b = create_access_token(subject="user-b-uuid", tenant_id=tenant_b_id, role="CONSULTANT", email="user.b@tenantb.com")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Tenant A creates a customer
    cust_resp = await client.post(
        "/api/v1/customers",
        json={"name": "Tenant A Secret Customer", "industry": "Banking"},
        headers=headers_a,
    )
    assert cust_resp.status_code == 201
    customer_a_id = cust_resp.json()["id"]

    # 2. Tenant A creates an assessment
    ass_resp = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_a_id, "title": "Confidential Assessment A"},
        headers=headers_a,
    )
    assert ass_resp.status_code == 201
    assessment_a_id = ass_resp.json()["id"]

    # 3. Tenant A saves responses
    resp_save = await client.put(
        f"/api/v1/assessments/{assessment_a_id}/responses",
        json={
            "q01_scale": "51–100 queue managers",
            "q04_dropdown": "80 hours / quarter",
            "q06_frequency": "About weekly (52/yr)",
            "q07_labor_hours": "3–5 hours",
            "q14_disruption_duration": "46–90 minutes",
            "q15_hourly_cost_override": 10000,
            "q21_annual_mq_spend": 500000,
        },
        headers=headers_a,
    )
    assert resp_save.status_code == 200

    # 4. Tenant A calculates assessment
    calc_resp = await client.post(
        f"/api/v1/assessments/{assessment_a_id}/calculate",
        headers=headers_a,
    )
    assert calc_resp.status_code == 200
    snapshot_a_id = calc_resp.json()["snapshot_id"]

    # -------------------------------------------------------------
    # ANTI-IDOR ATTACK TESTS BY TENANT B
    # -------------------------------------------------------------

    # Attack 1: Tenant B tries to read Tenant A's customer
    res = await client.get(f"/api/v1/customers/{customer_a_id}", headers=headers_b)
    assert res.status_code == 404

    # Attack 2: Tenant B tries to read Tenant A's assessment
    res = await client.get(f"/api/v1/assessments/{assessment_a_id}", headers=headers_b)
    assert res.status_code == 404

    # Attack 3: Tenant B tries to read Tenant A's discovery responses (Q15/Q20/Q21)
    res = await client.get(f"/api/v1/assessments/{assessment_a_id}/responses", headers=headers_b)
    assert res.status_code == 404

    # Attack 4: Tenant B tries to overwrite Tenant A's responses
    res = await client.put(
        f"/api/v1/assessments/{assessment_a_id}/responses",
        json={"q21_annual_mq_spend": 999999},
        headers=headers_b,
    )
    assert res.status_code == 404

    # Attack 5: Tenant B tries to trigger calculation on Tenant A's assessment
    res = await client.post(f"/api/v1/assessments/{assessment_a_id}/calculate", headers=headers_b)
    assert res.status_code == 404

    # Attack 6: Tenant B tries to list Tenant A's snapshots
    res = await client.get(f"/api/v1/assessments/{assessment_a_id}/snapshots", headers=headers_b)
    assert res.status_code == 404

    # Attack 7: Tenant B tries to delete Tenant A's assessment
    res = await client.delete(f"/api/v1/assessments/{assessment_a_id}", headers=headers_b)
    assert res.status_code == 404
