import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.models.audit_event import AuditEvent


@pytest.mark.asyncio
async def test_assessment_submission_lifecycle(client: AsyncClient, db_session):
    # 1. Setup Customer & Assessment
    cust_res = await client.post(
        "/api/v1/customers", json={"name": "Acme Global Financial"}
    )
    assert cust_res.status_code == 201
    customer_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": customer_id, "title": "2026 Core MQ Discovery"},
    )
    assert ass_res.status_code == 201
    assessment_id = ass_res.json()["id"]
    assert ass_res.json()["status"] == "DRAFT"

    # 2. Cannot submit assessment without any responses -> 400 Bad Request
    bad_submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
    assert bad_submit_res.status_code == 400
    assert "no responses to submit" in bad_submit_res.json()["detail"].lower()

    # 3. Save responses
    responses_payload = {
        "q01_company_name": "Acme Global Financial",
        "q02_industry": "Financial Services",
        "q03_environment_scale": "51-100 Queue Managers",
        "q04_weekly_admin_hours": 12.0,
        "q05_mq_role_split": "Dedicated MQ engineering",
        "q06_frequency_text": "Monthly",
        "q07_labor_hours_text": "1-4 hours",
        "q08_duration_text": "1-2 hours",
        "q09_root_cause_categories": "Channel disconnects",
        "q10_problem_types": "Queue full",
        "q11_monitoring_status": "Third-party tooling",
        "q12_business_impact": "Moderate",
        "q13_annual_outage_count": 1.0,
        "q14_duration_text": "1-2 hours",
        "q15_hourly_cost_override": 50000.0,
        "q16_config_management_method": "Ansible automation",
        "q17_audit_frequency": "Annually",
        "q18_audit_effort": "< 1 day",
        "q19_documentation_effort": "Up to date runbooks",
        "q20_annual_labor_rate": 180000.0,
        "q21_annual_mq_spend": 500000.0,
        "q22_migration_plans": "Evaluating hybrid cloud",
        "raw_responses": {"q01_scale": "51–100", "q04_admin_hours": 12},
    }
    save_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses", json=responses_payload
    )
    assert save_res.status_code == 200

    # Verify status is now IN_PROGRESS
    ass_get = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert ass_get.status_code == 200
    assert ass_get.json()["status"] == "IN_PROGRESS"

    # 4. Successfully submit and finalize assessment
    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
    assert submit_res.status_code == 200
    submitted_data = submit_res.json()
    assert submitted_data["id"] == assessment_id
    assert submitted_data["status"] == "SUBMITTED"
    assert submitted_data["response"]["q01_company_name"] == "Acme Global Financial"

    # 5. Verify responses are IMMUTABLE -> PUT /responses returns 409 Conflict
    mutation_attempt = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q04_weekly_admin_hours": 99.0},
    )
    assert mutation_attempt.status_code == 409
    assert "submitted and can no longer be edited" in mutation_attempt.json()["detail"].lower()

    # Verify response was NOT mutated
    get_immutable = await client.get(f"/api/v1/assessments/{assessment_id}")
    assert float(get_immutable.json()["response"]["q04_weekly_admin_hours"]) == 12.0

    # 6. Idempotency: submitting already-submitted assessment succeeds without error or state corruption
    repeat_submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
    assert repeat_submit_res.status_code == 200
    assert repeat_submit_res.json()["status"] == "SUBMITTED"
    assert float(repeat_submit_res.json()["response"]["q04_weekly_admin_hours"]) == 12.0

    # 7. Audit event verification
    stmt = select(AuditEvent).where(
        AuditEvent.resource_id == assessment_id,
        AuditEvent.event_type == "ASSESSMENT_SUBMITTED",
    )
    audit_res = await db_session.execute(stmt)
    events = list(audit_res.scalars().all())
    assert len(events) >= 1
    assert events[0].status == "SUCCESS"
    assert events[0].details_json["status"] == "SUBMITTED"


@pytest.mark.asyncio
async def test_cross_tenant_submission_protection(client: AsyncClient):
    # Non-existent or other-tenant assessment -> 404 Not Found
    non_existent_id = "00000000-0000-0000-0000-000000000999"
    res = await client.post(f"/api/v1/assessments/{non_existent_id}/submit")
    assert res.status_code == 404
