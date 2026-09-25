import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.api.deps import DEFAULT_TENANT_ID


@pytest.mark.asyncio
async def test_audit_event_logging_lifecycle(client: AsyncClient):
    token = create_access_token(
        subject="00000000-0000-0000-0000-000000000002",
        tenant_id=DEFAULT_TENANT_ID,
        role="CONSULTANT",
        email="consultant@dataeko.ai",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a customer
    c = await client.post("/api/v1/customers", json={"name": "Audit Test Corp", "industry": "Insurance"}, headers=headers)
    cust_id = c.json()["id"]

    # 2. Create an assessment
    a = await client.post("/api/v1/assessments", json={"customer_id": cust_id, "title": "Audit Trail Assessment"}, headers=headers)
    ass_id = a.json()["id"]

    # 3. Save responses
    await client.put(
        f"/api/v1/assessments/{ass_id}/responses",
        json={"q04_dropdown": "80 hours / quarter"},
        headers=headers,
    )

    # 4. Calculate
    await client.post(f"/api/v1/assessments/{ass_id}/calculate", headers=headers)

    # 5. Fetch audit events
    audit_res = await client.get("/api/v1/audit-events", headers=headers)
    assert audit_res.status_code == 200
    events = audit_res.json()
    event_types = [e["event_type"] for e in events]

    assert "CUSTOMER_CREATED" in event_types
    assert "ASSESSMENT_CREATED" in event_types
    assert "ASSESSMENT_RESPONSES_SAVED" in event_types
    assert "CALCULATION_EXECUTED" in event_types

    # Verify no update or delete routes exist for audit events
    del_res = await client.delete("/api/v1/audit-events/some-id", headers=headers)
    assert del_res.status_code in (404, 405)
