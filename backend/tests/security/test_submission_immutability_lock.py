import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.api.deps import DEFAULT_TENANT_ID


@pytest.mark.asyncio
async def test_r1_submission_immutability_lock_across_all_roles(client: AsyncClient, db_session):
    """
    R1 Hardening Test: Proves that once an assessment reaches SUBMITTED, CALCULATED, or COMPLETED:
    1. SUBMITTED -> DRAFT is blocked.
    2. SUBMITTED -> IN_PROGRESS is blocked.
    3. SUBMITTED -> ARCHIVED is blocked.
    4. CALCULATED -> DRAFT is blocked.
    5. CALCULATED -> ARCHIVED is blocked.
    6. COMPLETED -> DRAFT is blocked.
    7. COMPLETED -> ARCHIVED is blocked.
    8. Same-status update remains safe.
    9. Draft metadata updates still work.
    10. Submitted response editing remains blocked.
    """
    # 1. Setup Admin & Consultant headers
    admin_token = create_access_token(
        subject="00000000-0000-0000-0000-000000000003",
        tenant_id=DEFAULT_TENANT_ID,
        role="PLATFORM_ADMIN",
        email="admin@dataeko.ai",
    )
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    consultant_token = create_access_token(
        subject="00000000-0000-0000-0000-000000000002",
        tenant_id=DEFAULT_TENANT_ID,
        role="CONSULTANT",
        email="consultant@dataeko.ai",
    )
    consultant_headers = {"Authorization": f"Bearer {consultant_token}"}

    # Create a customer
    cust_res = await client.post(
        "/api/v1/customers",
        json={"name": "Lock Test Corporation", "industry": "Banking"},
        headers=admin_headers,
    )
    assert cust_res.status_code == 201
    cust_id = cust_res.json()["id"]

    # Provision Customer Admin & activate
    cust_admin_user_res = await client.post(
        "/api/v1/users",
        json={
            "email": "lock_cust_admin@test.com",
            "full_name": "Lock Cust Admin",
            "role": "CUSTOMER_ADMIN",
            "customer_id": cust_id,
            "password": "Password123!",
        },
        headers=admin_headers,
    )
    assert cust_admin_user_res.status_code == 201
    cust_admin_user_id = cust_admin_user_res.json()["id"]

    await client.put(
        f"/api/v1/users/{cust_admin_user_id}",
        json={"is_active": True},
        headers=admin_headers,
    )

    # Provision Customer User & activate
    client_user_res = await client.post(
        "/api/v1/users",
        json={
            "email": "lock_client_user@test.com",
            "full_name": "Lock Client User",
            "role": "CUSTOMER_USER",
            "customer_id": cust_id,
            "password": "Password123!",
        },
        headers=admin_headers,
    )
    assert client_user_res.status_code == 201
    client_user_id = client_user_res.json()["id"]

    await client.put(
        f"/api/v1/users/{client_user_id}",
        json={"is_active": True},
        headers=admin_headers,
    )

    # Create auth tokens for active users
    client_token = create_access_token(
        subject=client_user_id,
        tenant_id=DEFAULT_TENANT_ID,
        role="CUSTOMER_USER",
        email="lock_client_user@test.com",
    )
    client_headers = {"Authorization": f"Bearer {client_token}"}

    cust_admin_token = create_access_token(
        subject=cust_admin_user_id,
        tenant_id=DEFAULT_TENANT_ID,
        role="CUSTOMER_ADMIN",
        email="lock_cust_admin@test.com",
    )
    cust_admin_headers = {"Authorization": f"Bearer {cust_admin_token}"}

    # 2. Client creates an assessment (starts in DRAFT)
    create_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_id, "title": "Client MQ Assessment"},
        headers=client_headers,
    )
    assert create_res.status_code == 201
    ass_id = create_res.json()["id"]
    assert create_res.json()["status"] == "DRAFT"

    # [Test 9] Draft metadata updates still work
    update_draft = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"title": "Client MQ Assessment Updated Title", "description": "Draft description"},
        headers=client_headers,
    )
    assert update_draft.status_code == 200
    assert update_draft.json()["title"] == "Client MQ Assessment Updated Title"

    # Save initial responses
    save_resp = await client.put(
        f"/api/v1/assessments/{ass_id}/responses",
        json={
            "q01_company_name": "Lock Test Corp",
            "q04_weekly_admin_hours": 20.0,
            "q06_frequency_text": "Monthly",
            "q07_labor_hours_text": "1-4 hours",
            "q12_business_impact": "Significant",
            "q14_duration_text": "1-2 hours",
        },
        headers=client_headers,
    )
    assert save_resp.status_code == 200

    # 3. Submit assessment (Transitions to SUBMITTED)
    submit_res = await client.post(
        f"/api/v1/assessments/{ass_id}/submit",
        headers=client_headers,
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # [Test 10] Submitted response editing remains blocked
    blocked_resp_edit = await client.put(
        f"/api/v1/assessments/{ass_id}/responses",
        json={"q04_weekly_admin_hours": 99.0},
        headers=client_headers,
    )
    assert blocked_resp_edit.status_code == 409
    assert "submitted and can no longer be edited" in blocked_resp_edit.text

    # [Test 1] SUBMITTED -> DRAFT is blocked (across roles: CUSTOMER_USER, CUSTOMER_ADMIN, CONSULTANT)
    client_reopen_draft = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "DRAFT"},
        headers=client_headers,
    )
    assert client_reopen_draft.status_code == 409
    assert "finalized" in client_reopen_draft.text

    cust_admin_reopen_draft = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "DRAFT"},
        headers=cust_admin_headers,
    )
    assert cust_admin_reopen_draft.status_code == 409

    consultant_reopen_draft = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "DRAFT"},
        headers=consultant_headers,
    )
    assert consultant_reopen_draft.status_code == 409

    # [Test 2] SUBMITTED -> IN_PROGRESS is blocked
    client_reopen_inp = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "IN_PROGRESS"},
        headers=client_headers,
    )
    assert client_reopen_inp.status_code == 409
    assert "finalized" in client_reopen_inp.text

    # [Test 3] SUBMITTED -> ARCHIVED is blocked
    blocked_sub_archive = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "ARCHIVED"},
        headers=client_headers,
    )
    assert blocked_sub_archive.status_code == 409
    assert "finalized" in blocked_sub_archive.text

    # [Test 8 part a] Same-status update on SUBMITTED remains safe (along with metadata updates)
    same_status_sub = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "SUBMITTED", "title": "Verified Submission Title"},
        headers=client_headers,
    )
    assert same_status_sub.status_code == 200
    assert same_status_sub.json()["title"] == "Verified Submission Title"
    assert same_status_sub.json()["status"] == "SUBMITTED"

    # 4. Calculate assessment (Transitions status to CALCULATED)
    calc_res = await client.post(
        f"/api/v1/assessments/{ass_id}/calculate",
        headers=consultant_headers,
    )
    assert calc_res.status_code == 200
    
    get_calc_ass = await client.get(
        f"/api/v1/assessments/{ass_id}",
        headers=consultant_headers,
    )
    assert get_calc_ass.status_code == 200
    assert get_calc_ass.json()["status"] == "CALCULATED"

    # [Test 4] CALCULATED -> DRAFT is blocked
    calc_reopen_draft = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "DRAFT"},
        headers=consultant_headers,
    )
    assert calc_reopen_draft.status_code == 409
    assert "finalized" in calc_reopen_draft.text

    # [Test 5] CALCULATED -> ARCHIVED is blocked
    calc_archive = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "ARCHIVED"},
        headers=consultant_headers,
    )
    assert calc_archive.status_code == 409
    assert "finalized" in calc_archive.text

    # [Test 8 part b] Same-status update on CALCULATED remains safe
    same_status_calc = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "CALCULATED", "title": "Calculated Title"},
        headers=consultant_headers,
    )
    assert same_status_calc.status_code == 200
    assert same_status_calc.json()["status"] == "CALCULATED"

    # 5. Complete assessment via direct DB update to test COMPLETED guards
    from app.models.assessment import Assessment, AssessmentStatus
    from sqlalchemy import select
    res = await db_session.execute(select(Assessment).where(Assessment.id == ass_id))
    db_assessment = res.scalar_one()
    db_assessment.status = AssessmentStatus.COMPLETED
    await db_session.commit()

    # [Test 6] COMPLETED -> DRAFT is blocked
    completed_reopen_draft = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "DRAFT"},
        headers=consultant_headers,
    )
    assert completed_reopen_draft.status_code == 409
    assert "finalized" in completed_reopen_draft.text

    # [Test 7] COMPLETED -> ARCHIVED is blocked
    completed_archive = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "ARCHIVED"},
        headers=consultant_headers,
    )
    assert completed_archive.status_code == 409
    assert "finalized" in completed_archive.text

    # [Test 8 part c] Same-status update on COMPLETED remains safe
    same_status_completed = await client.put(
        f"/api/v1/assessments/{ass_id}",
        json={"status": "COMPLETED", "title": "Completed Final Title"},
        headers=consultant_headers,
    )
    assert same_status_completed.status_code == 200
    assert same_status_completed.json()["status"] == "COMPLETED"
    assert same_status_completed.json()["title"] == "Completed Final Title"
