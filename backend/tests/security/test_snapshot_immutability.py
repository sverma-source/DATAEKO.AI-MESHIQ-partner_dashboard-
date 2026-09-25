import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.api.deps import DEFAULT_TENANT_ID


@pytest.mark.asyncio
async def test_snapshot_immutability_and_api_protection(client: AsyncClient):
    token = create_access_token(
        subject="00000000-0000-0000-0000-000000000002",
        tenant_id=DEFAULT_TENANT_ID,
        role="CONSULTANT",
        email="consultant@dataeko.ai",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create customer & assessment
    c = await client.post("/api/v1/customers", json={"name": "Immutable Client", "industry": "Banking"}, headers=headers)
    cust_id = c.json()["id"]

    a = await client.post("/api/v1/assessments", json={"customer_id": cust_id, "title": "Immutable Snapshot Assessment"}, headers=headers)
    ass_id = a.json()["id"]

    # 2. Save responses & run calculation
    await client.put(
        f"/api/v1/assessments/{ass_id}/responses",
        json={
            "q01_scale": "51–100 queue managers",
            "q04_dropdown": "80 hours / quarter",
            "q06_frequency": "About weekly (52/yr)",
            "q07_labor_hours": "3–5 hours",
            "q14_disruption_duration": "46–90 minutes",
            "q15_hourly_cost_override": 10000,
            "q21_annual_mq_spend": 350000,
        },
        headers=headers,
    )

    calc_res = await client.post(f"/api/v1/assessments/{ass_id}/calculate", headers=headers)
    assert calc_res.status_code == 200
    snap_id = calc_res.json()["snapshot_id"]

    # 3. Verify no PUT/PATCH/DELETE endpoints exist for snapshots (405 Method Not Allowed)
    put_snap = await client.put(f"/api/v1/assessments/{ass_id}/snapshots/{snap_id}", json={"total_operational_labor_cost": 0}, headers=headers)
    assert put_snap.status_code in (404, 405)

    patch_snap = await client.patch(f"/api/v1/assessments/{ass_id}/snapshots/{snap_id}", json={"total_operational_labor_cost": 0}, headers=headers)
    assert patch_snap.status_code in (404, 405)

    # 4. Modifying responses and recalculating creates a NEW distinct snapshot, preserving historical snapshot
    await client.put(
        f"/api/v1/assessments/{ass_id}/responses",
        json={"q04_dropdown": "160 hours / quarter"},
        headers=headers,
    )

    calc_res_2 = await client.post(f"/api/v1/assessments/{ass_id}/calculate", headers=headers)
    assert calc_res_2.status_code == 200
    snap_2_id = calc_res_2.json()["snapshot_id"]
    assert snap_2_id != snap_id

    # Verify snapshot list contains both versions
    snaps_list = await client.get(f"/api/v1/assessments/{ass_id}/snapshots", headers=headers)
    assert snaps_list.status_code == 200
    ids = [s["id"] for s in snaps_list.json()]
    assert snap_id in ids
    assert snap_2_id in ids
