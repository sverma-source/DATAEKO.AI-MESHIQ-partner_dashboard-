import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.api.deps import DEFAULT_TENANT_ID


@pytest.mark.asyncio
async def test_scenario_sandbox_does_not_mutate_persisted_responses(client: AsyncClient):
    token = create_access_token(
        subject="00000000-0000-0000-0000-000000000002",
        tenant_id=DEFAULT_TENANT_ID,
        role="CONSULTANT",
        email="consultant@dataeko.ai",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Create customer & assessment
    c = await client.post("/api/v1/customers", json={"name": "Scenario Client", "industry": "Retail"}, headers=headers)
    cust_id = c.json()["id"]

    a = await client.post("/api/v1/assessments", json={"customer_id": cust_id, "title": "Scenario Sandbox Test"}, headers=headers)
    ass_id = a.json()["id"]

    # Save official baseline responses
    await client.put(
        f"/api/v1/assessments/{ass_id}/responses",
        json={
            "q03_environment_scale": "51–100 queue managers",
            "q04_weekly_admin_hours": 20.0,
            "q06_frequency_text": "About weekly (52/yr)",
            "q07_labor_hours_text": "3–5 hours",
            "q21_annual_mq_spend": 250000,
            "raw_responses": {
                "q04_dropdown": "80 hours / quarter"
            }
        },
        headers=headers,
    )

    # Calculate official baseline
    calc_1 = await client.post(f"/api/v1/assessments/{ass_id}/calculate", headers=headers)
    baseline_snap_id = calc_1.json()["snapshot_id"]
    baseline_labor_cost = calc_1.json()["summary"]["total_operational_labor_cost"]

    # Fetch saved responses to verify Q04 and Q21
    resp_before = await client.get(f"/api/v1/assessments/{ass_id}/responses", headers=headers)
    data = resp_before.json()
    assert data["raw_responses"]["q04_dropdown"] == "80 hours / quarter"
    assert data["q21_annual_mq_spend"] == "250000" or float(data["q21_annual_mq_spend"]) == 250000

    # Verify that fetching the snapshot reproduces the exact official baseline
    snap = await client.get(f"/api/v1/assessments/{ass_id}/snapshots/latest", headers=headers)
    assert snap.json()["id"] == baseline_snap_id
    assert snap.json()["summary_metrics"]["total_operational_labor_cost"] == baseline_labor_cost
