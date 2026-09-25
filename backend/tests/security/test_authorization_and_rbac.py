import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import create_access_token, get_password_hash
from app.core.rbac import Role, Permission, has_permission
from app.models.tenant import Tenant
from app.models.user import User


def test_rbac_permission_matrix():
    # Platform Admin has all permissions
    assert has_permission(Role.PLATFORM_ADMIN.value, Permission.CUSTOMER_CREATE)
    assert has_permission(Role.PLATFORM_ADMIN.value, Permission.AUDIT_READ)
    assert has_permission(Role.PLATFORM_ADMIN.value, Permission.TENANT_MANAGE)

    # Consultant has calculation, assessment, and audit permissions, but cannot manage tenant
    assert has_permission(Role.CONSULTANT.value, Permission.ASSESSMENT_CALCULATE)
    assert has_permission(Role.CONSULTANT.value, Permission.AUDIT_READ)
    assert not has_permission(Role.CONSULTANT.value, Permission.TENANT_MANAGE)

    # Customer User cannot create customers or calculate or read audit logs
    assert has_permission(Role.CUSTOMER_USER.value, Permission.ASSESSMENT_READ)
    assert has_permission(Role.CUSTOMER_USER.value, Permission.ASSESSMENT_UPDATE)
    assert not has_permission(Role.CUSTOMER_USER.value, Permission.CUSTOMER_CREATE)
    assert not has_permission(Role.CUSTOMER_USER.value, Permission.ASSESSMENT_CALCULATE)
    assert not has_permission(Role.CUSTOMER_USER.value, Permission.AUDIT_READ)


@pytest.mark.asyncio
async def test_rbac_audit_endpoint_permission_enforcement(client: AsyncClient, db_session: AsyncSession):
    tenant_id = "00000000-0000-0000-0000-000000000001"

    # Create Customer User
    cu = User(
        id="customer-user-uuid",
        email="user@customer.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Customer User",
        role=Role.CUSTOMER_USER.value,
        tenant_id=tenant_id,
        is_active=True,
    )
    db_session.add(cu)
    await db_session.commit()

    cust_token = create_access_token(subject="customer-user-uuid", tenant_id=tenant_id, role=Role.CUSTOMER_USER.value, email="user@customer.com")
    consultant_token = create_access_token(subject="00000000-0000-0000-0000-000000000002", tenant_id=tenant_id, role=Role.CONSULTANT.value, email="consultant@dataeko.ai")

    # Customer User lacks 'audit:read' -> 403 Forbidden
    res_fail = await client.get("/api/v1/audit-events", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_fail.status_code == 403
    assert res_fail.json()["error_type"] == "PermissionDenied"

    # Consultant has 'audit:read' -> 200 OK
    res_ok = await client.get("/api/v1/audit-events", headers={"Authorization": f"Bearer {consultant_token}"})
    assert res_ok.status_code == 200
    assert isinstance(res_ok.json(), list)
