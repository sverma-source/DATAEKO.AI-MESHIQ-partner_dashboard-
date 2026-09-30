import pytest
from httpx import AsyncClient
from sqlalchemy import select
from unittest.mock import patch, MagicMock

from app.api.deps import DEFAULT_TENANT_ID
from app.config import settings
from app.core.rbac import Role
from app.core.security import create_access_token, get_password_hash
from app.models.assessment import Assessment, AssessmentStatus
from app.models.audit_event import AuditEvent
from app.models.customer import Customer
from app.models.user import User
from app.services.assessment_service import AssessmentService
from app.services.email_service import EmailService, InMemoryEmailTransport


FULL_RESPONSES = {
    "q01_company_name": "Acme Technologies Inc",
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


@pytest.fixture
def mock_email_env(monkeypatch):
    """Configures safe in-memory email environment."""
    transport = InMemoryEmailTransport()
    monkeypatch.setattr(settings, "EMAIL_ENABLED", True)
    monkeypatch.setattr(settings, "EMAIL_DISTRIBUTION_MODE", "test")
    monkeypatch.setattr(settings, "EMAIL_TRANSPORT_TYPE", "smtp")
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test.internal")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_ROOP", "r.sabbavarapu@dataeko.ai")
    monkeypatch.setattr(settings, "TEST_RECIPIENT_SUMIT", "s.verma@dataeko.ai")
    monkeypatch.setattr("app.services.email_service.SMTPTransport.send", transport.send)
    monkeypatch.setattr("app.services.email_service.GmailAPITransport.send", transport.send)
    return transport


@pytest.mark.asyncio
async def test_customer_user_self_submission_client_email(client: AsyncClient, db_session, mock_email_env):
    """
    REQ 1, 10, 11, 12, 15:
    CUSTOMER_USER self-submission:
    - Recipient must be authenticated customer user's persisted email.
    - Client email contains 0 attachments.
    - Client email contains Q01-Q22 responses.
    - Client email does NOT contain CalculationSnapshot or economic metrics.
    - Internal deliverable email behavior remains unchanged.
    """
    transport = mock_email_env

    # 1. Create customer
    cust = Customer(id="cust-001", tenant_id=DEFAULT_TENANT_ID, name="Acme Corp")
    db_session.add(cust)

    # 2. Create customer user
    client_user = User(
        id="usr-client-001",
        email="client.user@acme.corp",
        hashed_password=get_password_hash("ClientPass123!"),
        full_name="Alice Client",
        role=Role.CUSTOMER_USER.value,
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=cust.id,
        is_active=True,
    )
    db_session.add(client_user)
    await db_session.commit()

    token = create_access_token(
        subject=client_user.id,
        tenant_id=DEFAULT_TENANT_ID,
        role=client_user.role,
        email=client_user.email,
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create assessment as client user
    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Acme IBM MQ Discovery"},
        headers=headers,
    )
    assert ass_res.status_code == 201
    assessment_id = ass_res.json()["id"]

    # 4. Save responses
    save_res = await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=headers,
    )
    assert save_res.status_code == 200

    # 5. Submit assessment
    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=headers,
    )
    assert submit_res.status_code == 200

    # 6. Verify Emails: Expect 2 messages (1 Internal Deliverable, 1 Client Confirmation)
    assert len(transport.sent_messages) == 2

    # Internal deliverable email
    internal_msg = transport.sent_messages[0]
    assert internal_msg.recipients == ["r.sabbavarapu@dataeko.ai", "s.verma@dataeko.ai"]
    assert len(internal_msg.attachments) == 2  # PDF + CSV

    # Client confirmation email
    client_msg = transport.sent_messages[1]
    assert client_msg.recipients == ["client.user@acme.corp"]
    assert len(client_msg.attachments) == 0  # REQ 10: NO ATTACHMENTS
    assert "Submission Confirmation" in client_msg.subject
    assert "Acme IBM MQ Discovery" in client_msg.subject

    # REQ 11: Contains Q01-Q22 responses
    for q_num in range(1, 23):
        q_tag = f"Q{q_num:02d}"
        assert q_tag in client_msg.text_body
        assert q_tag in client_msg.html_body

    # REQ 12: Does NOT contain CalculationSnapshot or internal metrics
    prohibited_terms = [
        "CalculationSnapshot",
        "snapshot_id",
        "summary_metrics",
        "total_annual_troubleshooting_cost",
        "total_annual_economic_value",
        "recoverable_opportunity",
        "SMTP_HOST",
        "EMAIL_DISTRIBUTION_MODE",
        "r.sabbavarapu@dataeko.ai",
        "s.verma@dataeko.ai",
    ]
    for term in prohibited_terms:
        assert term not in client_msg.text_body
        assert term not in client_msg.html_body

    # Audit events
    audit_stmt = select(AuditEvent).where(
        AuditEvent.resource_id == assessment_id,
        AuditEvent.event_type.in_(["CLIENT_EMAIL_REQUESTED", "CLIENT_EMAIL_SENT"]),
    )
    audit_events = (await db_session.execute(audit_stmt)).scalars().all()
    assert len(audit_events) == 2
    for event in audit_events:
        assert "client.user@acme.corp" not in str(event.details_json)  # No recipient leak


@pytest.mark.asyncio
async def test_customer_admin_submission_client_email(client: AsyncClient, db_session, mock_email_env):
    """
    REQ 2:
    CUSTOMER_ADMIN submission: recipient = authenticated customer admin email.
    """
    transport = mock_email_env

    cust = Customer(id="cust-002", tenant_id=DEFAULT_TENANT_ID, name="Beta Financial")
    db_session.add(cust)

    cust_admin = User(
        id="usr-cust-admin-002",
        email="admin@betafinancial.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Bob Admin",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=cust.id,
        is_active=True,
    )
    db_session.add(cust_admin)
    await db_session.commit()

    token = create_access_token(
        subject=cust_admin.id,
        tenant_id=DEFAULT_TENANT_ID,
        role=cust_admin.role,
        email=cust_admin.email,
    )
    headers = {"Authorization": f"Bearer {token}"}

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Beta MQ Review"},
        headers=headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=headers,
    )

    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=headers,
    )
    assert submit_res.status_code == 200

    assert len(transport.sent_messages) == 2
    client_msg = transport.sent_messages[1]
    assert client_msg.recipients == ["admin@betafinancial.com"]


@pytest.mark.asyncio
async def test_consultant_submission_with_primary_contact(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 3, 13:
    CONSULTANT submits on behalf of customer:
    - Recipient must resolve to customer.primary_contact_email.
    - Consultant email (consultant@dataeko.ai) MUST NOT be recipient.
    """
    transport = mock_email_env

    cust = Customer(
        id="cust-003",
        tenant_id=DEFAULT_TENANT_ID,
        name="Gamma Logistics",
        primary_contact_name="Grace Contact",
        primary_contact_email="grace.contact@gammalogistics.com",
    )
    db_session.add(cust)
    await db_session.commit()

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Gamma Infrastructure Assessment"},
        headers=auth_headers,  # Consultant headers
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=auth_headers,
    )

    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res.status_code == 200

    assert len(transport.sent_messages) == 2
    client_msg = transport.sent_messages[1]
    # Authoritative customer recipient
    assert client_msg.recipients == ["grace.contact@gammalogistics.com"]
    # Consultant email MUST NEVER be the client recipient
    assert "consultant@dataeko.ai" not in client_msg.recipients


@pytest.mark.asyncio
async def test_admin_roles_submission_resolution(client: AsyncClient, db_session, mock_email_env, admin_auth_headers):
    """
    REQ 4, 5:
    PARTNER_ADMIN and PLATFORM_ADMIN submissions on behalf of customer:
    - Recipient resolves to customer.primary_contact_email.
    - Admin email MUST NOT be recipient.
    """
    transport = mock_email_env

    cust = Customer(
        id="cust-004",
        tenant_id=DEFAULT_TENANT_ID,
        name="Delta Retail",
        primary_contact_name="Dan Director",
        primary_contact_email="dan.director@deltaretail.com",
    )
    db_session.add(cust)
    await db_session.commit()

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Delta MQ Modernization"},
        headers=admin_auth_headers,  # PLATFORM_ADMIN
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=admin_auth_headers,
    )

    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=admin_auth_headers,
    )
    assert submit_res.status_code == 200

    assert len(transport.sent_messages) == 2
    client_msg = transport.sent_messages[1]
    assert client_msg.recipients == ["dan.director@deltaretail.com"]
    assert "admin@dataeko.ai" not in client_msg.recipients


@pytest.mark.asyncio
async def test_fallback_to_customer_creator_when_primary_contact_missing(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 6:
    Customer.primary_contact_email is None:
    Falls back to assessment.created_by ONLY when creator is CUSTOMER_USER or CUSTOMER_ADMIN.
    """
    transport = mock_email_env

    # 1. Customer with NO primary contact email
    cust = Customer(id="cust-006", tenant_id=DEFAULT_TENANT_ID, name="Epsilon Health", primary_contact_email=None)
    db_session.add(cust)

    # 2. Customer User who creates the assessment
    client_creator = User(
        id="usr-client-006",
        email="eva.creator@epsilonhealth.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Eva Creator",
        role=Role.CUSTOMER_USER.value,
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=cust.id,
        is_active=True,
    )
    db_session.add(client_creator)
    await db_session.commit()

    client_token = create_access_token(
        subject=client_creator.id,
        tenant_id=DEFAULT_TENANT_ID,
        role=client_creator.role,
        email=client_creator.email,
    )
    client_headers = {"Authorization": f"Bearer {client_token}"}

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Epsilon Self Assessment"},
        headers=client_headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=client_headers,
    )

    # 3. Consultant submits on behalf of Epsilon
    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res.status_code == 200

    assert len(transport.sent_messages) == 2
    client_msg = transport.sent_messages[1]
    # Falls back to creator's email
    assert client_msg.recipients == ["eva.creator@epsilonhealth.com"]
    assert "consultant@dataeko.ai" not in client_msg.recipients


@pytest.mark.asyncio
async def test_fallback_to_active_customer_users(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 7:
    Customer.primary_contact_email is None, and assessment was created by Consultant.
    Falls back to active users belonging to customer, prioritizing CUSTOMER_ADMIN then CUSTOMER_USER.
    """
    transport = mock_email_env

    cust = Customer(id="cust-007", tenant_id=DEFAULT_TENANT_ID, name="Zeta Energy", primary_contact_email=None)
    db_session.add(cust)

    # Add CUSTOMER_USER and CUSTOMER_ADMIN
    cust_user = User(
        id="usr-zeta-user",
        email="user@zetaenergy.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Zeta User",
        role=Role.CUSTOMER_USER.value,
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=cust.id,
        is_active=True,
    )
    cust_admin = User(
        id="usr-zeta-admin",
        email="admin@zetaenergy.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Zeta Admin",
        role=Role.CUSTOMER_ADMIN.value,
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=cust.id,
        is_active=True,
    )
    db_session.add_all([cust_user, cust_admin])
    await db_session.commit()

    # Consultant creates and submits
    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Zeta Review"},
        headers=auth_headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=auth_headers,
    )

    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res.status_code == 200

    assert len(transport.sent_messages) == 2
    client_msg = transport.sent_messages[1]
    # Prioritizes CUSTOMER_ADMIN
    assert client_msg.recipients == ["admin@zetaenergy.com"]
    assert "consultant@dataeko.ai" not in client_msg.recipients


@pytest.mark.asyncio
async def test_no_client_email_anywhere_safe_skip(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 8:
    No client recipient email anywhere:
    - Internal email still sent (len == 1).
    - CLIENT_EMAIL_SKIPPED recorded with exact reason.
    - Assessment remains successfully submitted.
    """
    transport = mock_email_env

    # Customer with no contact email and no user accounts
    cust = Customer(id="cust-008", tenant_id=DEFAULT_TENANT_ID, name="Orphan Corp", primary_contact_email=None)
    db_session.add(cust)
    await db_session.commit()

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Orphan Corp Assessment"},
        headers=auth_headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=auth_headers,
    )

    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # Only Internal email was sent
    assert len(transport.sent_messages) == 1
    assert transport.sent_messages[0].recipients == ["r.sabbavarapu@dataeko.ai", "s.verma@dataeko.ai"]

    # CLIENT_EMAIL_SKIPPED audit log
    audit_stmt = select(AuditEvent).where(
        AuditEvent.resource_id == assessment_id,
        AuditEvent.event_type == "CLIENT_EMAIL_SKIPPED",
    )
    skip_event = (await db_session.execute(audit_stmt)).scalar_one_or_none()
    assert skip_event is not None
    assert skip_event.details_json["reason"] == "No client recipient email configured for customer"


@pytest.mark.asyncio
async def test_malformed_primary_contact_email_safe_skip(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 9:
    Malformed Customer.primary_contact_email:
    - Must be rejected by recipient validation.
    - Must not reach SMTP/transport.
    - Safe skip occurs.
    """
    transport = mock_email_env

    # Malformed email with newline / header injection characters
    cust = Customer(
        id="cust-009",
        tenant_id=DEFAULT_TENANT_ID,
        name="Inject Corp",
        primary_contact_email="bad_email\r\nBcc: evil@attacker.com",
    )
    db_session.add(cust)
    await db_session.commit()

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Inject Corp Assessment"},
        headers=auth_headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=auth_headers,
    )

    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res.status_code == 200

    # Only Internal email sent; malformed client email rejected and skipped
    assert len(transport.sent_messages) == 1
    assert transport.sent_messages[0].recipients == ["r.sabbavarapu@dataeko.ai", "s.verma@dataeko.ai"]

    audit_stmt = select(AuditEvent).where(
        AuditEvent.resource_id == assessment_id,
        AuditEvent.event_type == "CLIENT_EMAIL_SKIPPED",
    )
    skip_event = (await db_session.execute(audit_stmt)).scalar_one_or_none()
    assert skip_event is not None
    assert skip_event.details_json["reason"] == "No client recipient email configured for customer"


@pytest.mark.asyncio
async def test_arbitrary_request_recipient_cannot_influence_selection(client: AsyncClient, db_session, mock_email_env):
    """
    REQ 14:
    Arbitrary recipient parameter supplied via request body or query param
    cannot influence recipient selection. Server-side authoritative resolution is absolute.
    """
    transport = mock_email_env

    cust = Customer(id="cust-014", tenant_id=DEFAULT_TENANT_ID, name="Secure Bank")
    db_session.add(cust)

    client_user = User(
        id="usr-client-014",
        email="authorized.client@securebank.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Authorized Client",
        role=Role.CUSTOMER_USER.value,
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=cust.id,
        is_active=True,
    )
    db_session.add(client_user)
    await db_session.commit()

    token = create_access_token(
        subject=client_user.id,
        tenant_id=DEFAULT_TENANT_ID,
        role=client_user.role,
        email=client_user.email,
    )
    headers = {"Authorization": f"Bearer {token}"}

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Secure Assessment"},
        headers=headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=headers,
    )

    # Malicious attempt to inject an attacker recipient via body and query param
    submit_res = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit?recipient_email=attacker@evil.com",
        json={"recipient_email": "attacker@evil.com", "to": "attacker@evil.com"},
        headers=headers,
    )
    assert submit_res.status_code == 200

    assert len(transport.sent_messages) == 2
    client_msg = transport.sent_messages[1]
    # Attacker email is completely ignored; only persisted authorized email is used
    assert client_msg.recipients == ["authorized.client@securebank.com"]
    assert "attacker@evil.com" not in client_msg.recipients


@pytest.mark.asyncio
async def test_failure_isolation_internal_fails_client_succeeds(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 16, 17:
    Internal email generation/dispatch fails; Client email still delivers!
    Assessment submission and calculation snapshot remain durable.
    """
    transport = mock_email_env

    cust = Customer(
        id="cust-016",
        tenant_id=DEFAULT_TENANT_ID,
        name="Iso Corp",
        primary_contact_email="contact@isocorp.com",
    )
    db_session.add(cust)
    await db_session.commit()

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Iso Assessment"},
        headers=auth_headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=auth_headers,
    )

    # Simulate DeliverableService failure (PDF generation error)
    with patch("app.services.deliverable_service.DeliverableService.generate_pdf", side_effect=RuntimeError("PDF engine crash")):
        submit_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/submit",
            headers=auth_headers,
        )
        assert submit_res.status_code == 200
        assert submit_res.json()["status"] == "SUBMITTED"

    # Client confirmation email still succeeded!
    assert len(transport.sent_messages) == 1
    assert transport.sent_messages[0].recipients == ["contact@isocorp.com"]

    # Audit events verify deliverable failure logged, client email sent
    audit_stmt = select(AuditEvent).where(AuditEvent.resource_id == assessment_id)
    events = (await db_session.execute(audit_stmt)).scalars().all()
    event_types = [e.event_type for e in events]
    assert "DELIVERABLES_GENERATION_FAILED" in event_types
    assert "CLIENT_EMAIL_SENT" in event_types


@pytest.mark.asyncio
async def test_failure_isolation_client_fails_internal_succeeds(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 16, 17:
    Client email fails; Internal email remains successful!
    Assessment submission and calculation snapshot remain durable.
    """
    transport = mock_email_env

    cust = Customer(
        id="cust-017",
        tenant_id=DEFAULT_TENANT_ID,
        name="Iso Corp 2",
        primary_contact_email="contact@isocorp2.com",
    )
    db_session.add(cust)
    await db_session.commit()

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Iso 2 Assessment"},
        headers=auth_headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=auth_headers,
    )

    # Make client message creation raise an error
    with patch("app.services.email_service.EmailService.create_client_submission_email", side_effect=ValueError("Template parse error")):
        submit_res = await client.post(
            f"/api/v1/assessments/{assessment_id}/submit",
            headers=auth_headers,
        )
        assert submit_res.status_code == 200
        assert submit_res.json()["status"] == "SUBMITTED"

    # Internal deliverable email was sent successfully
    assert len(transport.sent_messages) == 1
    assert transport.sent_messages[0].recipients == ["r.sabbavarapu@dataeko.ai", "s.verma@dataeko.ai"]

    # Client failure was audited
    audit_stmt = select(AuditEvent).where(
        AuditEvent.resource_id == assessment_id,
        AuditEvent.event_type == "CLIENT_EMAIL_FAILED",
    )
    client_failed_event = (await db_session.execute(audit_stmt)).scalar_one_or_none()
    assert client_failed_event is not None
    assert client_failed_event.details_json["error_type"] == "ValueError"


@pytest.mark.asyncio
async def test_duplicate_submission_idempotency_no_duplicate_client_email(client: AsyncClient, db_session, mock_email_env, auth_headers):
    """
    REQ 18:
    Duplicate submission does not re-send internal or client emails.
    """
    transport = mock_email_env

    cust = Customer(
        id="cust-018",
        tenant_id=DEFAULT_TENANT_ID,
        name="Idempotent Corp",
        primary_contact_email="idempotent@corp.com",
    )
    db_session.add(cust)
    await db_session.commit()

    ass_res = await client.post(
        "/api/v1/assessments",
        json={"customer_id": cust.id, "title": "Idempotent Assessment"},
        headers=auth_headers,
    )
    assessment_id = ass_res.json()["id"]

    await client.put(
        f"/api/v1/assessments/{assessment_id}/responses",
        json=FULL_RESPONSES,
        headers=auth_headers,
    )

    # First submission -> 2 emails sent
    submit_res_1 = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res_1.status_code == 200
    assert len(transport.sent_messages) == 2

    # Second submission -> Idempotent return, 0 extra emails
    submit_res_2 = await client.post(
        f"/api/v1/assessments/{assessment_id}/submit",
        headers=auth_headers,
    )
    assert submit_res_2.status_code == 200
    assert len(transport.sent_messages) == 2
