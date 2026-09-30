import pytest
from httpx import AsyncClient
from sqlalchemy import select
from unittest.mock import patch

from app.config import settings
from app.models.assessment import AssessmentStatus
from app.models.audit_event import AuditEvent
from app.services.assessment_service import AssessmentService
from app.services.email_service import InMemoryEmailTransport, EmailService


@pytest.mark.asyncio
async def test_submission_orchestration_full_success(client: AsyncClient, db_session, monkeypatch, auth_headers: dict):
    """
    Verifies full end-to-end orchestration:
    Submission -> Calculation -> Snapshot -> Deliverables (PDF + CSV) -> Email (In-Memory Transport).
    """
    # 1. Setup in-memory email transport and test recipients
    transport = InMemoryEmailTransport()
    email_service = EmailService(settings=settings, transport=transport)

    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test.internal")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")

    # 2. Create customer and assessment
    cust_res = await client.post("/api/v1/customers", json={"name": "Global FinCorp"}, headers=auth_headers)
    assert cust_res.status_code == 201
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_id, "title": "2026 Production Discovery"},
        headers=auth_headers,
    )
    assert ass_res.status_code == 201
    assessment_id = ass_res.json()["id"]

    # 3. Save full responses
    responses_payload = {
        "q01_company_name": "Global FinCorp",
        "q02_industry": "Financial Services",
        "q03_environment_scale": "51-100 Queue Managers",
        "q04_weekly_admin_hours": 15.0,
        "q05_mq_role_split": "Dedicated MQ engineering",
        "q06_frequency_text": "Monthly",
        "q07_labor_hours_text": "1-4 hours",
        "q08_duration_text": "1-2 hours",
        "q09_root_cause_categories": "Channel disconnects",
        "q10_problem_types": "Queue full",
        "q11_monitoring_status": "Third-party tooling",
        "q12_business_impact": "Moderate",
        "q13_annual_outage_count": 2.0,
        "q14_duration_text": "1-2 hours",
        "q15_hourly_cost_override": 50000.0,
        "q16_config_management_method": "Ansible automation",
        "q17_audit_frequency": "Annually",
        "q18_audit_effort": "< 1 day",
        "q19_documentation_effort": "Up to date runbooks",
        "q20_annual_labor_rate": 180000.0,
        "q21_annual_mq_spend": 500000.0,
        "q22_migration_plans": "Evaluating hybrid cloud",
        "raw_responses": {"q01_scale": "51–100", "q04_admin_hours": 15},
    }
    save_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=responses_payload,
        headers=auth_headers,
    )
    assert save_res.status_code == 200

    # 4. Execute Submission via AssessmentService with injected InMemory transport
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)
    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res.status_code == 200
    submitted_data = submit_res.json()

    # 5. Verify finalization and calculation snapshot attachment
    assert submitted_data["id"] == assessment_id
    assert submitted_data["status"] == "SUBMITTED"
    assert submitted_data["latest_snapshot"] is not None
    assert submitted_data["latest_snapshot"]["assessment_id"] == assessment_id
    assert submitted_data["latest_snapshot"]["summary_metrics"] is not None

    # 6. Verify Email Capture in InMemoryEmailTransport
    assert len(transport.sent_messages) == 1
    sent_msg = transport.last_message
    assert sent_msg is not None
    assert sent_msg.recipients == ["r.sabbavarapu@dataeko.ai", "s.verma@dataeko.ai"]
    assert "DATAEKO × meshIQ" in sent_msg.subject
    assert "Global FinCorp" in sent_msg.subject
    assert len(sent_msg.attachments) == 2

    # Verify attachment types and names
    pdf_att = next(a for a in sent_msg.attachments if a.filename.endswith(".pdf"))
    assert pdf_att.content_type == "application/pdf"
    assert len(pdf_att.content) > 100

    csv_att = next(a for a in sent_msg.attachments if a.filename.endswith(".csv"))
    assert csv_att.content_type == "text/csv"
    assert b"Metadata,Value" in csv_att.content

    # 7. Verify Audit Events
    stmt = (
        select(AuditEvent)
        .where(AuditEvent.resource_id == assessment_id)
        .order_by(AuditEvent.created_at.asc())
    )
    res = await db_session.execute(stmt)
    events = list(res.scalars().all())
    event_types = [e.event_type for e in events]
    assert "ASSESSMENT_SUBMITTED" in event_types
    assert "CALCULATION_EXECUTED" in event_types
    assert "DELIVERABLES_GENERATED" in event_types
    assert "EMAIL_SENT" in event_types


@pytest.mark.asyncio
async def test_submission_idempotency_prevents_duplicate_delivery(client: AsyncClient, db_session, monkeypatch, auth_headers: dict):
    """
    Verifies that repeated submissions of an already-submitted assessment are idempotent:
    - Does not re-calculate duplicate snapshots
    - Does not re-send duplicate emails
    - Preserves finalized responses
    """
    transport = InMemoryEmailTransport()

    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test.internal")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)

    cust_res = await client.post("/api/v1/customers", json={"name": "Idempotent Bank"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Idempotency Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={
            "q03_environment_scale": "10-25 Queue Managers",
            "q04_weekly_admin_hours": 8.0,
            "raw_responses": {"q01_scale": "10–25"},
        },
        headers=auth_headers,
    )

    first_submit = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
    assert first_submit.status_code == 200
    assert len(transport.sent_messages) == 1

    # Second submission attempt
    second_submit = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
    assert second_submit.status_code == 200
    # Email count must remain 1 (no duplicate emails sent)
    assert len(transport.sent_messages) == 1


@pytest.mark.asyncio
async def test_email_failure_does_not_reopen_or_rollback_submission(client: AsyncClient, db_session, monkeypatch, auth_headers: dict):
    """
    Verifies failure isolation:
    If email dispatch fails (e.g. SMTP down), the assessment remains SUBMITTED,
    the CalculationSnapshot is preserved, responses remain immutable, and EMAIL_SEND_FAILED is audited.
    """
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")

    cust_res = await client.post("/api/v1/customers", json={"name": "Failure Resilience Corp"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Email Failure Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={
            "q03_environment_scale": "10-25 Queue Managers",
            "q04_weekly_admin_hours": 10.0,
            "raw_responses": {"q01_scale": "10–25"},
        },
        headers=auth_headers,
    )

    # Force email service to raise an exception
    with patch.object(EmailService, "send_email", side_effect=RuntimeError("Simulated SMTP Connection Refused")):
        submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
        assert submit_res.status_code == 200
        data = submit_res.json()
        assert data["status"] == "SUBMITTED"
        assert data["latest_snapshot"] is not None

    # Verify responses remain immutable
    mutation_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q04_weekly_admin_hours": 99.0},
        headers=auth_headers,
    )
    assert mutation_res.status_code == 409

    # Verify EMAIL_SEND_FAILED audit event was logged
    stmt = (
        select(AuditEvent)
        .where(AuditEvent.resource_id == assessment_id, AuditEvent.event_type == "EMAIL_SEND_FAILED")
    )
    res = await db_session.execute(stmt)
    failed_event = res.scalar_one_or_none()
    assert failed_event is not None
    assert failed_event.status == "FAILURE"


@pytest.mark.asyncio
async def test_missing_test_recipients_skips_cleanly(client: AsyncClient, db_session, monkeypatch, auth_headers: dict):
    """
    Verifies that when test recipients are not configured:
    - Submission and calculation succeed
    - Deliverables are generated
    - Email is safely skipped and EMAIL_SEND_SKIPPED is logged
    """
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", None)
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", None)
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)

    cust_res = await client.post("/api/v1/customers", json={"name": "No Recipient Co"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "No Recipient Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "10-25 Queue Managers", "q04_weekly_admin_hours": 10.0},
        headers=auth_headers,
    )

    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
    assert submit_res.status_code == 200
    assert len(transport.sent_messages) == 0

    stmt = select(AuditEvent).where(
        AuditEvent.resource_id == assessment_id,
        AuditEvent.event_type == "EMAIL_SEND_SKIPPED",
    )
    res = await db_session.execute(stmt)
    skipped_event = res.scalar_one_or_none()
    assert skipped_event is not None
    assert "No test recipients" in skipped_event.details_json["reason"]


@pytest.mark.asyncio
async def test_calculation_failure_leaves_assessment_submitted_and_skips_email(
    client: AsyncClient, db_session, monkeypatch, auth_headers: dict
):
    """
    Verifies that if calculation fails during submission:
    - Assessment remains in SUBMITTED state (immutable)
    - CALCULATION_FAILED audit event is recorded
    - Email is NOT dispatched
    """
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)

    cust_res = await client.post("/api/v1/customers", json={"name": "Calc Failure Corp"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Calc Failure Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "10-25 Queue Managers", "q04_weekly_admin_hours": 10.0},
        headers=auth_headers,
    )

    with patch("app.services.calculation_service.calculate_assessment", side_effect=ValueError("Simulated Calculation Engine Error")):
        submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
        assert submit_res.status_code == 200
        data = submit_res.json()
        assert data["status"] == "SUBMITTED"
        assert data["latest_snapshot"] is None

    # Verify no email was dispatched
    assert len(transport.sent_messages) == 0

    # Verify CALCULATION_FAILED audit event
    stmt = select(AuditEvent).where(
        AuditEvent.resource_id == assessment_id,
        AuditEvent.event_type == "CALCULATION_FAILED",
    )
    res = await db_session.execute(stmt)
    failed_event = res.scalar_one_or_none()
    assert failed_event is not None
    assert failed_event.status == "FAILURE"

    # Verify responses remain immutable
    mutation_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q04_weekly_admin_hours": 99.0},
        headers=auth_headers,
    )
    assert mutation_res.status_code == 409


@pytest.mark.asyncio
async def test_no_secrets_in_submission_audit_or_api(client: AsyncClient, db_session, monkeypatch, auth_headers: dict):
    """
    Verifies that neither API responses nor audit logs expose SMTP credentials or raw passwords.
    """
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "super_secret_smtp_token_12345")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)

    cust_res = await client.post("/api/v1/customers", json={"name": "Privacy Audit Org"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Privacy Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "10-25 Queue Managers", "q04_weekly_admin_hours": 10.0},
        headers=auth_headers,
    )

    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
    assert submit_res.status_code == 200
    resp_text = submit_res.text
    assert "super_secret_smtp_token_12345" not in resp_text

    # Check all audit events for assessment
    stmt = select(AuditEvent).where(AuditEvent.resource_id == assessment_id)
    res = await db_session.execute(stmt)
    events = list(res.scalars().all())
    for e in events:
        details_str = str(e.details_json)
        assert "super_secret_smtp_token_12345" not in details_str


@pytest.mark.asyncio
async def test_repeated_submission_after_email_failure_preserves_state_and_does_not_duplicate(
    client: AsyncClient, db_session, monkeypatch, auth_headers: dict
):
    """
    Documents Classification B behavior:
    - Initial submit: submission succeeds, calculation succeeds, deliverables succeed, email fails.
    - Assessment remains SUBMITTED and snapshot is preserved.
    - Second POST /submit:
      - Assessment remains SUBMITTED
      - Response editing remains blocked (409 Conflict)
      - No duplicate snapshot is created (snapshot count remains 1)
      - No second email attempt is dispatched
      - Existing snapshot is returned cleanly
    """
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")

    cust_res = await client.post("/api/v1/customers", json={"name": "Retry Boundary Bank"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Classification B Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "25-50 Queue Managers", "q04_weekly_admin_hours": 12.0},
        headers=auth_headers,
    )

    # Initial submission: Email fails
    with patch.object(EmailService, "send_email", side_effect=RuntimeError("SMTP Transport Timeout")):
        first_submit = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
        assert first_submit.status_code == 200
        first_data = first_submit.json()
        assert first_data["status"] == "SUBMITTED"
        assert first_data["latest_snapshot"] is not None
        first_snapshot_id = first_data["latest_snapshot"]["id"]

    # Second submission: Idempotent early return
    # Route SMTPTransport to transport to verify no emails are sent
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)
    second_submit = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
    assert second_submit.status_code == 200
    second_data = second_submit.json()
    assert second_data["status"] == "SUBMITTED"
    assert second_data["latest_snapshot"]["id"] == first_snapshot_id

    # Verify no second email was sent
    assert len(transport.sent_messages) == 0

    # Verify responses remain immutable
    mutation_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q04_weekly_admin_hours": 99.0},
        headers=auth_headers,
    )
    assert mutation_res.status_code == 409

    # Verify snapshot count in DB is exactly 1
    snapshots_res = await client.get(f"/api/v1/assessments/{assessment_id}/snapshots", headers=auth_headers)
    assert snapshots_res.status_code == 200
    assert len(snapshots_res.json()) == 1


@pytest.mark.asyncio
async def test_deliverable_generation_failure_audits_cleanly_and_skips_email(
    client: AsyncClient, db_session, monkeypatch, auth_headers: dict
):
    """
    Verifies that if PDF/CSV deliverable generation fails:
    - Assessment remains in SUBMITTED state (immutable)
    - CalculationSnapshot remains preserved
    - DELIVERABLES_GENERATION_FAILED audit event is recorded (NOT EMAIL_SEND_FAILED)
    - Email is NOT attempted
    - Response returns SUBMITTED with snapshot
    """
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)

    cust_res = await client.post("/api/v1/customers", json={"name": "Deliverable Failure Org"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Deliverable Failure Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "25-50 Queue Managers", "q04_weekly_admin_hours": 12.0},
        headers=auth_headers,
    )

    # Force deliverable generation to fail
    with patch("app.services.deliverable_service.DeliverableService.generate_pdf", side_effect=RuntimeError("Node PDF Renderer Crash")):
        submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
        assert submit_res.status_code == 200
        data = submit_res.json()
        assert data["status"] == "SUBMITTED"
        assert data["latest_snapshot"] is not None

    # Verify no email was attempted
    assert len(transport.sent_messages) == 0

    # Verify DELIVERABLES_GENERATION_FAILED was logged, and EMAIL_SEND_FAILED was NOT logged
    stmt = select(AuditEvent).where(AuditEvent.resource_id == assessment_id)
    res = await db_session.execute(stmt)
    events = list(res.scalars().all())
    event_types = [e.event_type for e in events]
    assert "DELIVERABLES_GENERATION_FAILED" in event_types
    assert "EMAIL_SEND_FAILED" not in event_types
    assert "EMAIL_SEND_REQUESTED" not in event_types
    assert "EMAIL_SENT" not in event_types

    # Verify responses remain immutable
    mutation_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q04_weekly_admin_hours": 99.0},
        headers=auth_headers,
    )
    assert mutation_res.status_code == 409


@pytest.mark.asyncio
async def test_submission_uses_get_internal_recipients_governance(client: AsyncClient, db_session, monkeypatch, auth_headers: dict):
    """
    Verifies that submit_assessment delegates recipient resolution to get_internal_recipients(),
    honoring EMAIL_DISTRIBUTION_MODE governance.
    """
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "EMAIL_DISTRIBUTION_MODE", "test")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test.internal")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "roop@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "sumit@dataeko.ai")
    monkeypatch.setattr(settings, "PROD_DATAEKO_DISTRIBUTION_EMAILS", ["prod.leak@dataeko.ai"])
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)

    cust_res = await client.post("/api/v1/customers", json={"name": "Governance Org"}, headers=auth_headers)
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Governance Test"}, headers=auth_headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "25-50 Queue Managers", "q04_weekly_admin_hours": 10.0},
        headers=auth_headers,
    )

    with patch.object(EmailService, "get_internal_recipients", autospec=True, side_effect=lambda self: ["roop@dataeko.ai", "sumit@dataeko.ai"]) as spy_internal:
        submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit", headers=auth_headers)
        assert submit_res.status_code == 200
        assert spy_internal.called
        assert len(transport.sent_messages) == 1
        msg = transport.sent_messages[0]
        # In test mode, only test recipients are resolved
        assert msg.recipients == ["roop@dataeko.ai", "sumit@dataeko.ai"]
        assert "prod.leak@dataeko.ai" not in msg.recipients



