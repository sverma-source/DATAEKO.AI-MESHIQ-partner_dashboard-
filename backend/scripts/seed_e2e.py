"""
Deterministic E2E Test Fixture Seeder
Seeds Tenants and Synthetic Users for E2E Browser Testing.
"""

import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User
from app.core.rbac import Role

TENANT_A_ID = "00000000-0000-0000-0000-000000000001"
TENANT_B_ID = "00000000-0000-0000-0000-000000000002"

SEED_TENANTS = [
    {"id": TENANT_A_ID, "name": "Primary Organization (DATAEKO / meshIQ)", "slug": "tenant-a"},
    {"id": TENANT_B_ID, "name": "Tenant B Enterprise Corp", "slug": "tenant-b"},
]

SEED_USERS = [
    # Tenant A Users
    {
        "id": "00000000-0000-0000-0000-000000000002",
        "email": "consultant@dataeko.ai",
        "password": "Consultant123!",
        "full_name": "Lead MQ Consultant",
        "role": Role.CONSULTANT.value,
        "tenant_id": TENANT_A_ID,
    },
    {
        "id": "00000000-0000-0000-0000-000000000003",
        "email": "admin@dataeko.ai",
        "password": "AdminPass123!",
        "full_name": "Platform Admin",
        "role": Role.PLATFORM_ADMIN.value,
        "tenant_id": TENANT_A_ID,
    },
    {
        "id": "00000000-0000-0000-0000-000000000004",
        "email": "partner_admin@dataeko.ai",
        "password": "PartnerAdmin123!",
        "full_name": "Partner Admin A",
        "role": Role.PARTNER_ADMIN.value,
        "tenant_id": TENANT_A_ID,
    },
    {
        "id": "00000000-0000-0000-0000-000000000005",
        "email": "customer_admin_a@acme.com",
        "password": "CustomerAdmin123!",
        "full_name": "Customer Admin Acme",
        "role": Role.CUSTOMER_ADMIN.value,
        "tenant_id": TENANT_A_ID,
    },
    {
        "id": "00000000-0000-0000-0000-000000000006",
        "email": "customer_user_a@acme.com",
        "password": "CustomerUser123!",
        "full_name": "Customer User Acme",
        "role": Role.CUSTOMER_USER.value,
        "tenant_id": TENANT_A_ID,
    },
    # Tenant B Users
    {
        "id": "00000000-0000-0000-0000-000000000010",
        "email": "partner_admin_b@tenantb.com",
        "password": "PartnerAdmin123!",
        "full_name": "Partner Admin B",
        "role": Role.PARTNER_ADMIN.value,
        "tenant_id": TENANT_B_ID,
    },
    {
        "id": "00000000-0000-0000-0000-000000000011",
        "email": "consultant_b@tenantb.com",
        "password": "Consultant123!",
        "full_name": "Consultant Tenant B",
        "role": Role.CONSULTANT.value,
        "tenant_id": TENANT_B_ID,
    },
    {
        "id": "00000000-0000-0000-0000-000000000012",
        "email": "customer_user_b@tenantb.com",
        "password": "CustomerUser123!",
        "full_name": "Customer User Tenant B",
        "role": Role.CUSTOMER_USER.value,
        "tenant_id": TENANT_B_ID,
    },
]


async def seed_e2e_data():
    async with AsyncSessionLocal() as session:
        # Seed Tenants
        for t_data in SEED_TENANTS:
            stmt = select(Tenant).where(Tenant.id == t_data["id"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                tenant = Tenant(
                    id=t_data["id"],
                    name=t_data["name"],
                    slug=t_data["slug"],
                )
                session.add(tenant)
                await session.flush()
                print(f"Created Tenant: {t_data['name']} ({t_data['id']})")

        # Seed Users
        for u_data in SEED_USERS:
            stmt = select(User).where(User.email == u_data["email"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                user = User(
                    id=u_data["id"],
                    email=u_data["email"],
                    hashed_password=get_password_hash(u_data["password"]),
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    tenant_id=u_data["tenant_id"],
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                print(f"Created User: {u_data['email']} ({u_data['role']})")
            else:
                # Ensure active and updated role
                existing.role = u_data["role"]
                existing.is_active = True
                existing.hashed_password = get_password_hash(u_data["password"])

        await session.commit()
        print("E2E database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed_e2e_data())
