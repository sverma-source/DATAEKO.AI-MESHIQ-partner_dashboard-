import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_assessment_lifecycle(client: AsyncClient):
    # 1. Setup Customer
    cust_res = await client.post(
        "/api/v1/customers", json={"name": "Acme Financial Group"}
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    # 2. Create Assessment with invalid customer -> 404
    bad_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": "00000000-0000-0000-0000-000000000999", "title": "Bad Assessment"},
    )
    assert bad_res.status_code == 404

    # 3. Create Assessment
    create_payload = {
        "customer_id": customer_id,
        "title": "2026 Q3 MQ Efficiency Discovery",
        "description": "Initial economic assessment for core messaging clusters",
    }
    create_res = await client.post("/api/v1/assessments", json=create_payload)
    assert create_res.status_code == 201
    assessment_data = create_res.json()
    assessment_id = assessment_data["id"]
    assert assessment_data["title"] == "2026 Q3 MQ Efficiency Discovery"
    assert assessment_data["status"] == "DRAFT"
    assert assessment_data["assessment_version"] == "1.0.0"

    # 4. Get Assessment Detail (checks eager loading)
    get_res = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["id"] == assessment_id
    assert detail["customer"]["name"] == "Acme Financial Group"
    assert detail["response"] is None
    assert detail["latest_snapshot"] is None

    # 5. List Assessments (with customer filter)
    list_res = await client.get(f"/api/v1/assessments?customer_id={customer_id}")
    assert list_res.status_code == 200
    assessments = list_res.json()
    assert len(assessments) == 1
    assert assessments[0]["id"] == assessment_id

    # 6. Update Assessment Metadata
    update_res = await client.put(
        f"/api/v1/assessments/{assessment_id}",
        json={"title": "Updated 2026 Q3 MQ Efficiency Discovery"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Updated 2026 Q3 MQ Efficiency Discovery"

    # 7. Delete Assessment
    del_res = await client.delete(f"/api/v1/assessments/{assessment_id}")
    assert del_res.status_code == 204

    # 8. Verify 404
    get_after_del = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert get_after_del.status_code == 404

    # 9. Verify 404 on non-existent assessment operations
    non_existent_id = "00000000-0000-0000-0000-000000000999"
    assert (await client.put(f"/api/v1/assessments/{non_existent_id}", json={"title": "test"})).status_code == 404
    assert (await client.delete(f"/api/v1/assessments/{non_existent_id}")).status_code == 404
    assert (await client.post(f"/api/v1/assessments/{non_existent_id}/calculate")).status_code == 404
    assert (await client.get(f"/api/v1/assessments/{non_existent_id}/snapshots")).status_code == 404
    assert (await client.get(f"/api/v1/assessments/{non_existent_id}/snapshots/latest")).status_code == 404
    assert (await client.put(f"/api/v1/assessments/{non_existent_id}/responses", json={})).status_code == 404
