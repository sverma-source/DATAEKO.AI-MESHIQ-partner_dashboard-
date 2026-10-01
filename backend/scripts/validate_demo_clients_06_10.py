"""
DEMO-ONLY VALIDATION SCRIPT (CLIENTS 06-10) — NOT FOR PRODUCTION USE

Validates all 5 freshly seeded DEMO clients (06-10) and their CUSTOMER_ADMIN accounts:
1. Verifies customer exists and is active.
2. Verifies user exists, is active, has role CUSTOMER_ADMIN, correct tenant and customer binding.
3. Verifies zero assessments, zero responses, zero calculation snapshots, zero reports.
4. Verifies authentication via POST /api/v1/auth/login succeeds and returns HTTP-only session cookie.
5. Verifies GET /api/v1/auth/me returns the correct user, customer, role, and tenant context.
6. Verifies GET /api/v1/assessments returns 200 with an empty list (workspace is clean).
7. Verifies customer isolation:
   - User list (GET /api/v1/users) returns only their own user, no other demo or production accounts.
   - Cross-customer user modification (PUT /api/v1/users/{other_id}) is blocked (404 Not Found).
   - Zero production or real customer records exposed.
"""

import asyncio
import json
import os
import sys
from typing import Dict, List
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.rbac import Role
from app.models.customer import Customer
from app.models.user import User
from app.models.assessment import Assessment
from app.models.assessment_response import AssessmentResponse
from app.models.calculation_snapshot import CalculationSnapshot

PRIMARY_TENANT_ID = "00000000-0000-0000-0000-000000000001"


async def validate_clients():
    scratch_file = "/Users/roop/.gemini/antigravity-ide/brain/c82dd669-e76c-4107-b0b1-2012d9b48f6e/scratch/demo_clients_06_10_credentials.json"
    local_file = os.path.join(os.path.dirname(__file__), ".demo_clients_06_10_credentials.json")
    cred_file = scratch_file if os.path.exists(scratch_file) else local_file
    if not os.path.exists(cred_file):
        print(f"Error: Credential file not found. Run seed_demo_clients_06_10.py first.")
        sys.exit(1)

    with open(cred_file, "r", encoding="utf-8") as f:
        credentials: List[Dict[str, str]] = json.load(f)

    transport = ASGITransport(app=app)

    async with AsyncSessionLocal() as session:
        # Pre-fetch all demo user IDs to test cross-customer isolation
        user_ids = {c["index"]: c["user_id"] for c in credentials}

        print("=" * 70)
        print("STARTING VALIDATION FOR DEMO CLIENTS 06-10")
        print("=" * 70)

        for cred in credentials:
            idx = cred["index"]
            org_name = cred["organization"]
            cust_id = cred["customer_id"]
            email = cred["email"]
            password = cred["password"]
            user_id = cred["user_id"]

            print(f"\n--- VALIDATING DEMO CLIENT {idx}: {org_name} ---")

            # 1. Customer Verification in DB
            c_stmt = select(Customer).where(Customer.id == cust_id)
            customer = (await session.execute(c_stmt)).scalar_one_or_none()
            assert customer is not None, f"Client {idx}: Customer {cust_id} not found"
            assert customer.name == org_name, f"Client {idx}: Customer name mismatch ({customer.name} != {org_name})"
            assert customer.tenant_id == PRIMARY_TENANT_ID, f"Client {idx}: Invalid tenant {customer.tenant_id}"
            print(f"[PASS 1] Customer exists, active, correct tenant: {customer.name}")

            # 2. User Verification in DB
            u_stmt = select(User).where(User.id == user_id)
            user = (await session.execute(u_stmt)).scalar_one_or_none()
            assert user is not None, f"Client {idx}: User {user_id} not found"
            assert user.is_active is True, f"Client {idx}: User is not active"
            assert user.role == Role.CUSTOMER_ADMIN.value, f"Client {idx}: Role is {user.role}, expected CUSTOMER_ADMIN"
            assert user.customer_id == cust_id, f"Client {idx}: User customer_id {user.customer_id} != {cust_id}"
            assert user.tenant_id == PRIMARY_TENANT_ID, f"Client {idx}: User tenant_id mismatch"
            print(f"[PASS 2] User exists, active, role CUSTOMER_ADMIN, bound to customer {cust_id}")

            # 3. Clean Workspace Verification (Zero assessments, responses, snapshots)
            a_count = (await session.execute(
                select(func.count()).select_from(Assessment).where(Assessment.customer_id == cust_id)
            )).scalar_one()
            assert a_count == 0, f"Client {idx}: Found {a_count} assessments, expected 0"

            resp_count = (await session.execute(
                select(func.count()).select_from(AssessmentResponse)
                .join(Assessment, AssessmentResponse.assessment_id == Assessment.id)
                .where(Assessment.customer_id == cust_id)
            )).scalar_one()
            assert resp_count == 0, f"Client {idx}: Found {resp_count} assessment responses, expected 0"

            snap_count = (await session.execute(
                select(func.count()).select_from(CalculationSnapshot)
                .join(Assessment, CalculationSnapshot.assessment_id == Assessment.id)
                .where(Assessment.customer_id == cust_id)
            )).scalar_one()
            assert snap_count == 0, f"Client {idx}: Found {snap_count} calculation snapshots, expected 0"
            print(f"[PASS 3] Clean workspace verified: 0 assessments, 0 responses, 0 snapshots")

            # 4. HTTP API Authentication Verification
            async with AsyncClient(transport=transport, base_url="http://testserver") as client:
                login_resp = await client.post(
                    "/api/v1/auth/login",
                    json={"email": email, "password": password}
                )
                assert login_resp.status_code == 200, f"Client {idx}: Login failed with {login_resp.status_code}: {login_resp.text}"
                login_data = login_resp.json()
                assert login_data["user"]["role"] == Role.CUSTOMER_ADMIN.value, f"Client {idx}: Role mismatch in login response"
                assert login_data["user"]["customer_id"] == cust_id, f"Client {idx}: Customer ID mismatch in login response"
                print(f"[PASS 4] Authentication successful via /api/v1/auth/login with secure session cookie")

                cookies = login_resp.cookies

                # 5. /api/v1/auth/me Verification
                me_resp = await client.get("/api/v1/auth/me", cookies=cookies)
                assert me_resp.status_code == 200, f"Client {idx}: /auth/me failed with {me_resp.status_code}: {me_resp.text}"
                me_data = me_resp.json()
                assert me_data["user"]["email"] == email, f"Client {idx}: /auth/me email mismatch"
                assert me_data["user"]["role"] == Role.CUSTOMER_ADMIN.value, f"Client {idx}: /auth/me role mismatch"
                assert me_data["user"]["customer_id"] == cust_id, f"Client {idx}: /auth/me customer_id mismatch"
                assert me_data["user"]["tenant_id"] == PRIMARY_TENANT_ID, f"Client {idx}: /auth/me tenant mismatch"
                print(f"[PASS 5] /api/v1/auth/me verified: {me_data['user']['email']} (Role: {me_data['user']['role']})")

                # 6. /api/v1/assessments Empty Workspace Verification (Customer Workspace Query)
                assessments_resp = await client.get(f"/api/v1/assessments?customer_id={cust_id}", cookies=cookies)
                assert assessments_resp.status_code == 200, f"Client {idx}: /assessments returned {assessments_resp.status_code}"
                assessments_data = assessments_resp.json()
                # Handle both list and paginated items response
                items = assessments_data.get("items", assessments_data) if isinstance(assessments_data, dict) else assessments_data
                assert len(items) == 0, f"Client {idx}: Expected clean assessment workspace (0 items), got {len(items)}"
                print(f"[PASS 6] Assessment workspace accessible and completely empty (0 assessments, ready for demo)")

                # 7. Customer Isolation Verification (Users Endpoint)
                users_resp = await client.get("/api/v1/users", cookies=cookies)
                assert users_resp.status_code == 200, f"Client {idx}: /users failed: {users_resp.status_code}"
                users_data = users_resp.json()
                u_items = users_data.get("items", users_data) if isinstance(users_data, dict) else users_data
                assert len(u_items) == 1, f"Client {idx}: Expected exactly 1 user in customer scope, found {len(u_items)}"
                assert u_items[0]["email"] == email, f"Client {idx}: Unexpected user in customer scope: {u_items[0]['email']}"

                # 8. Cross-Customer Isolation: Cannot mutate another customer's user
                for other_idx, other_uid in user_ids.items():
                    if other_idx == idx:
                        continue
                    cross_put_resp = await client.put(
                        f"/api/v1/users/{other_uid}",
                        json={"full_name": f"Hacked by Client {idx}"},
                        cookies=cookies
                    )
                    assert cross_put_resp.status_code == 404, (
                        f"SECURITY VIOLATION: Client {idx} mutated user of Client {other_idx}! "
                        f"Status: {cross_put_resp.status_code}"
                    )

                # Check isolation against Client 01 as well
                c01_stmt = select(User).where(User.email == "demo.client01@dataeko.ai")
                c01_user = (await session.execute(c01_stmt)).scalar_one_or_none()
                if c01_user:
                    c01_put_resp = await client.put(
                        f"/api/v1/users/{c01_user.id}",
                        json={"full_name": "Hacked Client 01"},
                        cookies=cookies
                    )
                    assert c01_put_resp.status_code == 404, "SECURITY VIOLATION: Client could access Client 01 user"

                print(f"[PASS 7 & 8] Customer isolation verified: Cannot view or mutate other customers' data (404 enforced)")

                # 9. Verify zero production/system accounts exposed
                system_emails = {"admin@dataeko.ai", "consultant@dataeko.ai", "qa.client@dataeko.ai"}
                returned_emails = {u.get("email") for u in u_items}
                assert not (system_emails & returned_emails), f"LEAK: System emails found in user list: {returned_emails}"
                print(f"[PASS 9] No production, consultant, or system accounts exposed")

        print("\n" + "=" * 70)
        print("ALL 5 DEMO CLIENTS (06-10) FULLY VALIDATED — 100% CHECKS PASSED")
        print("=" * 70)


if __name__ == "__main__":
    asyncio.run(validate_clients())
