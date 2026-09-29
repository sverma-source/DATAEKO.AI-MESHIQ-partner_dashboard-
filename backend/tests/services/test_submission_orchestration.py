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
async def test_submission_orchestration_full_success(client: AsyncClient, db_session, monkeypatch):
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
    cust_res = await client.post("/api/v1/customers", json={"name": "Global FinCorp"})
    assert cust_res.status_code == 201
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust_id, "title": "2026 Production Discovery"},
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
        f"/api/v1/assessments/{assessment_id}/responses", json=responses_payload
    )
    assert save_res.status_code == 200

    # 4. Execute Submission via AssessmentService with injected InMemory transport
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)
    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
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
async def test_submission_idempotency_prevents_duplicate_delivery(client: AsyncClient, db_session, monkeypatch):
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

    cust_res = await client.post("/api/v1/customers", json={"name": "Idempotent Bank"})
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Idempotency Test"}
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={
            "q03_environment_scale": "10-25 Queue Managers",
            "q04_weekly_admin_hours": 8.0,
            "raw_responses": {"q01_scale": "10–25"},
        },
    )

    first_submit = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
    assert first_submit.status_code == 200
    assert len(transport.sent_messages) == 1

    # Second submission attempt
    second_submit = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
    assert second_submit.status_code == 200
    # Email count must remain 1 (no duplicate emails sent)
    assert len(transport.sent_messages) == 1


@pytest.mark.asyncio
async def test_email_failure_does_not_reopen_or_rollback_submission(client: AsyncClient, db_session, monkeypatch):
    """
    Verifies failure isolation:
    If email dispatch fails (e.g. SMTP down), the assessment remains SUBMITTED,
    the CalculationSnapshot is preserved, responses remain immutable, and EMAIL_SEND_FAILED is audited.
    """
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")

    cust_res = await client.post("/api/v1/customers", json={"name": "Failure Resilience Corp"})
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Email Failure Test"}
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={
            "q03_environment_scale": "10-25 Queue Managers",
            "q04_weekly_admin_hours": 10.0,
            "raw_responses": {"q01_scale": "10–25"},
        },
    )

    # Force email service to raise an exception
    with patch.object(EmailService, "send_email", side_effect=RuntimeError("Simulated SMTP Connection Refused")):
        submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
        assert submit_res.status_code == 200
        data = submit_res.json()
        assert data["status"] == "SUBMITTED"
        assert data["latest_snapshot"] is not None

    # Verify responses remain immutable
    mutation_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q04_weekly_admin_hours": 99.0},
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
async def test_missing_test_recipients_skips_cleanly(client: AsyncClient, db_session, monkeypatch):
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

    cust_res = await client.post("/api/v1/customers", json={"name": "No Recipient Co"})
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "No Recipient Test"}
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "10-25 Queue Managers", "q04_weekly_admin_hours": 10.0},
    )

    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
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
    client: AsyncClient, db_session, monkeypatch
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

    cust_res = await client.post("/api/v1/customers", json={"name": "Calc Failure Corp"})
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Calc Failure Test"}
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "10-25 Queue Managers", "q04_weekly_admin_hours": 10.0},
    )

    with patch("app.services.calculation_service.calculate_assessment", side_effect=ValueError("Simulated Calculation Engine Error")):
        submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
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
    )
    assert mutation_res.status_code == 409


@pytest.mark.asyncio
async def test_no_secrets_in_submission_audit_or_api(client: AsyncClient, db_session, monkeypatch):
    """
    Verifies that neither API responses nor audit logs expose SMTP credentials or raw passwords.
    """
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "super_secret_smtp_token_12345")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)

    cust_res = await client.post("/api/v1/customers", json={"name": "Privacy Audit Org"})
    cust_id = cust_res.json()["id"]

    ass_res = await client.post(
        "/api/v1/assessments", json={"customer_id": cust_id, "title": "Privacy Test"}
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json={"q03_environment_scale": "10-25 Queue Managers", "q04_weekly_admin_hours": 10.0},
    )

    submit_res = await client.post(f"/api/v1/assessments/{assessment_id}/submit")
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

