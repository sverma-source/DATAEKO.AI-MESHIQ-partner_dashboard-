"""
DEMO-ONLY DATA SEEDER (CLIENTS 06-10) — NOT FOR PRODUCTION USE

Creates 5 fresh, clean, independent DEMO customer organizations (06-10) and corresponding
CUSTOMER_ADMIN login credentials with randomly generated strong passwords for live demonstration.

Safety Invariants:
- Generates random strong passwords at runtime (not hardcoded into source code)
- Uses existing Customer and User database models without schema modifications
- Does not modify or overwrite existing real customer or consultant accounts
- Does not modify Clients 01-05
- Uses bcrypt work-factor 12 password hashing via app.core.security.get_password_hash
- Operates strictly under the Primary Organization tenant
- Leaves assessment workspace completely empty (0 assessments, 0 responses, 0 snapshots)
"""

import asyncio
import json
import os
import secrets
import string
from typing import Dict, List
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.core.rbac import Role
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.models.user import User

PRIMARY_TENANT_ID = "00000000-0000-0000-0000-000000000001"

DEMO_ORGANIZATIONS_06_10 = [
    {
        "index": "06",
        "name": "DATAEKO Demo Client 06",
        "industry": "Automotive & Connected Fleet (Demo)",
        "admin_name": "Demo Client 06 Admin",
        "admin_email": "demo.client06@dataeko.ai",
        "notes": "DEMO ONLY: Dedicated fresh customer organization 06 for live evaluation walkthrough.",
    },
    {
        "index": "07",
        "name": "DATAEKO Demo Client 07",
        "industry": "Pharmaceuticals & Supply Chain (Demo)",
        "admin_name": "Demo Client 07 Admin",
        "admin_email": "demo.client07@dataeko.ai",
        "notes": "DEMO ONLY: Dedicated fresh customer organization 07 for live evaluation walkthrough.",
    },
    {
        "index": "08",
        "name": "DATAEKO Demo Client 08",
        "industry": "Aerospace & Defense Systems (Demo)",
        "admin_name": "Demo Client 08 Admin",
        "admin_email": "demo.client08@dataeko.ai",
        "notes": "DEMO ONLY: Dedicated fresh customer organization 08 for live evaluation walkthrough.",
    },
    {
        "index": "09",
        "name": "DATAEKO Demo Client 09",
        "industry": "Insurance & FinTech Platforms (Demo)",
        "admin_name": "Demo Client 09 Admin",
        "admin_email": "demo.client09@dataeko.ai",
        "notes": "DEMO ONLY: Dedicated fresh customer organization 09 for live evaluation walkthrough.",
    },
    {
        "index": "10",
        "name": "DATAEKO Demo Client 10",
        "industry": "Smart Grid & Renewable Power (Demo)",
        "admin_name": "Demo Client 10 Admin",
        "admin_email": "demo.client10@dataeko.ai",
        "notes": "DEMO ONLY: Dedicated fresh customer organization 10 for live evaluation walkthrough.",
    },
]


def generate_secure_password(length: int = 18) -> str:
    """Generate a high-entropy random password meeting all enterprise password rules."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*_-+="
    while True:
        pw = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.isupper() for c in pw)
            and any(c.islower() for c in pw)
            and any(c.isdigit() for c in pw)
            and any(c in "!@#$%^&*_-+=" for c in pw)
        ):
            return pw


async def seed_demo_clients_06_10() -> List[Dict[str, str]]:
    """
    Seeds the 5 fresh DEMO organizations (06-10) and users, returning credentials list.
    """
    credentials_output = []

    async with AsyncSessionLocal() as session:
        # Verify primary tenant exists
        t_stmt = select(Tenant).where(Tenant.id == PRIMARY_TENANT_ID)
        tenant = (await session.execute(t_stmt)).scalar_one_or_none()
        if not tenant:
            raise RuntimeError(f"Primary tenant {PRIMARY_TENANT_ID} not found. Cannot seed demo clients.")

        for org_data in DEMO_ORGANIZATIONS_06_10:
            # 1. Customer Organization
            c_stmt = select(Customer).where(
                Customer.tenant_id == PRIMARY_TENANT_ID,
                (Customer.name == org_data["name"]) | (Customer.primary_contact_email == org_data["admin_email"])
            )
            customer = (await session.execute(c_stmt)).scalar_one_or_none()
            if not customer:
                customer = Customer(
                    tenant_id=PRIMARY_TENANT_ID,
                    name=org_data["name"],
                    industry=org_data["industry"],
                    primary_contact_name=org_data["admin_name"],
                    primary_contact_email=org_data["admin_email"],
                    notes=org_data["notes"],
                )
                session.add(customer)
                await session.flush()
                print(f"[CREATED] Customer: {customer.name} (ID: {customer.id})")
            else:
                customer.name = org_data["name"]
                customer.industry = org_data["industry"]
                customer.primary_contact_name = org_data["admin_name"]
                customer.primary_contact_email = org_data["admin_email"]
                customer.notes = org_data["notes"]
                print(f"[SYNCED] Customer: {customer.name} (ID: {customer.id})")

            # 2. Demo User with dynamically generated strong password
            raw_password = generate_secure_password(18)
            hashed_pw = get_password_hash(raw_password)

            u_stmt = select(User).where(User.email == org_data["admin_email"])
            user = (await session.execute(u_stmt)).scalar_one_or_none()
            if not user:
                user = User(
                    email=org_data["admin_email"],
                    full_name=org_data["admin_name"],
                    hashed_password=hashed_pw,
                    role=Role.CUSTOMER_ADMIN.value,
                    tenant_id=PRIMARY_TENANT_ID,
                    customer_id=customer.id,
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                print(f"[CREATED] User: {user.email} (Role: {user.role}, Customer: {customer.name})")
            else:
                user.full_name = org_data["admin_name"]
                user.role = Role.CUSTOMER_ADMIN.value
                user.tenant_id = PRIMARY_TENANT_ID
                user.customer_id = customer.id
                user.is_active = True
                user.hashed_password = hashed_pw
                print(f"[SYNCED] User: {user.email} (Active CUSTOMER_ADMIN, Customer: {customer.name})")

            credentials_output.append({
                "index": org_data["index"],
                "organization": org_data["name"],
                "customer_id": customer.id,
                "name": org_data["admin_name"],
                "email": org_data["admin_email"],
                "password": raw_password,
                "role": Role.CUSTOMER_ADMIN.value,
                "user_id": user.id,
            })

        await session.commit()
        print("\nAll 5 DEMO organizations (06-10) and users synced successfully.")

    # Save credentials outside repository to avoid git tracking
    scratch_dir = "/Users/roop/.gemini/antigravity-ide/brain/c82dd669-e76c-4107-b0b1-2012d9b48f6e/scratch"
    os.makedirs(scratch_dir, exist_ok=True)
    cred_file = os.path.join(scratch_dir, "demo_clients_06_10_credentials.json")
    with open(cred_file, "w", encoding="utf-8") as f:
        json.dump(credentials_output, f, indent=2)

    return credentials_output


if __name__ == "__main__":
    results = asyncio.run(seed_demo_clients_06_10())
    print("\n" + "=" * 60)
    print("DEMO CREDENTIALS SUMMARY (CLIENTS 06-10):")
    print("=" * 60)
    for cred in results:
        print(f"CLIENT {cred['index']}")
        print(f"Organization: {cred['organization']} (ID: {cred['customer_id']})")
        print(f"Name: {cred['name']}")
        print(f"Email: {cred['email']}")
        print(f"Password: {cred['password']}")
        print(f"Role: {cred['role']}")
        print("-" * 60)
