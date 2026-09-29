import pytest
from httpx import AsyncClient
from app.api.deps import DEFAULT_TENANT_ID
from app.core.security import create_access_token
from app.core.rbac import Role


@pytest.mark.asyncio
async def test_customer_lifecycle(client: AsyncClient):
    token = create_access_token(
        subject="00000000-0000-0000-0000-000000000003",
        tenant_id=DEFAULT_TENANT_ID,
        role=Role.PLATFORM_ADMIN.value,
        email="admin@dataeko.ai",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Customer
    create_payload = {
        "name": "Global Logistics Corp",
        "industry": "Transportation & Logistics",
        "primary_contact_name": "Jane Doe",
        "primary_contact_email": "jane@globallogistics.example.com",
        "notes": "Large multi-queue manager enterprise setup",
    }
    create_res = await client.post("/api/v1/customers", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    cust_data = create_res.json()
    assert cust_data["name"] == "Global Logistics Corp"
    assert cust_data["industry"] == "Transportation & Logistics"
    customer_id = cust_data["id"]

    # 2. Get Customer
    get_res = await client.get(f"/api/v1/customers/{customer_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == customer_id

    # 3. List Customers
    list_res = await client.get("/api/v1/customers")
    assert list_res.status_code == 200
    customers = list_res.json()
    assert len(customers) >= 1
    assert any(c["id"] == customer_id for c in customers)

    # 4. Update Customer
    update_payload = {"name": "Global Logistics Holdings", "notes": "Updated notes"}
    update_res = await client.put(f"/api/v1/customers/{customer_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name"] == "Global Logistics Holdings"
    assert updated_data["notes"] == "Updated notes"
    assert updated_data["primary_contact_email"] == "jane@globallogistics.example.com"

    # 5. Delete Customer
    del_res = await client.delete(f"/api/v1/customers/{customer_id}", headers=headers)
    assert del_res.status_code == 204

    # 6. Verify 404
    get_after_del = await client.get(f"/api/v1/customers/{customer_id}")
    assert get_after_del.status_code == 404

    # 7. Non-existent customer update & delete
    non_existent_id = "00000000-0000-0000-0000-000000000999"
    assert (await client.put(f"/api/v1/customers/{non_existent_id}", json={"name": "test"}, headers=headers)).status_code == 404
    assert (await client.delete(f"/api/v1/customers/{non_existent_id}", headers=headers)).status_code == 404
