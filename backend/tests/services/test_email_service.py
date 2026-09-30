import pytest
from email import message_from_bytes
from email.policy import default as default_policy
import smtplib
from unittest.mock import MagicMock, patch

from app.config import Settings
from app.services.email_service import (
    EmailAttachment,
    EmailConfigurationError,
    EmailDeliveryError,
    EmailDisabledError,
    EmailMessage,
    EmailService,
    InMemoryEmailTransport,
    SMTPTransport,
)


def get_test_settings(**kwargs) -> Settings:
    defaults = {
        "ENVIRONMENT": "test",
        "SECRET_KEY": "a" * 32,
        "EMAIL_ENABLED": True,
        "EMAIL_DISTRIBUTION_MODE": "test",
        "SMTP_HOST": "smtp.example.com",
        "SMTP_PORT": 587,
        "SMTP_USERNAME": "test_user",
        "SMTP_PASSWORD": "super_secret_smtp_password",
        "SMTP_USE_TLS": True,
        "EMAIL_FROM_ADDRESS": "noreply@dataeko.ai",
        "EMAIL_FROM_NAME": "DATAEKO × meshIQ Assessment Platform",
        "TEST_RECIPIENT_ROOP": "roop.test@example.com",
        "TEST_RECIPIENT_SUMIT": "sumit.test@example.com",
    }
    defaults.update(kwargs)
    return Settings(**defaults)


# ==============================================================================
# CONFIGURATION & DATA MODEL TESTS
# ==============================================================================

def test_email_settings_diagnostics_safe():
    """Confirms get_safe_diagnostics exposes email operational status without passwords or emails."""
    settings = get_test_settings()
    diag = settings.get_safe_diagnostics()
    assert diag["email_enabled"] is True
    assert diag["email_distribution_mode"] == "test"
    assert diag["smtp_host_configured"] is True
    assert diag["smtp_port"] == 587
    assert diag["smtp_use_tls"] is True
    assert diag["email_from_address"] == "noreply@dataeko.ai"
    assert diag["prod_dataeko_recipients_count"] == 0
    assert diag["prod_meshiq_recipients_count"] == 0
    assert "super_secret_smtp_password" not in str(diag)
    assert "roop.test@example.com" not in str(diag)


def test_email_message_validation():
    """Tests validation constraints on EmailMessage construction."""
    # Empty recipients
    with pytest.raises(EmailConfigurationError, match="at least one recipient"):
        EmailMessage(recipients=[], subject="Test", text_body="Body")

    # Invalid recipient email
    with pytest.raises(EmailConfigurationError, match="Invalid recipient email address"):
        EmailMessage(recipients=["not-an-email"], subject="Test", text_body="Body")

    # Header injection attempt in recipient
    with pytest.raises(EmailConfigurationError, match="Header injection detected"):
        EmailMessage(recipients=["victim@example.com\nBcc: evil@example.com"], subject="Test", text_body="Body")

    # Empty subject
    with pytest.raises(EmailConfigurationError, match="subject cannot be empty"):
        EmailMessage(recipients=["user@example.com"], subject="   ", text_body="Body")

    # Empty body
    with pytest.raises(EmailConfigurationError, match="text_body cannot be empty"):
        EmailMessage(recipients=["user@example.com"], subject="Test", text_body="  ")


def test_email_attachment_validation():
    """Tests validation constraints on EmailAttachment."""
    with pytest.raises(EmailConfigurationError, match="filename cannot be empty"):
        EmailAttachment(filename="  ", content=b"data")

    with pytest.raises(EmailConfigurationError, match="must be bytes"):
        EmailAttachment(filename="doc.pdf", content="not bytes string")  # type: ignore


# ==============================================================================
# EMAIL SERVICE & IN-MEMORY TEST TRANSPORT
# ==============================================================================

@pytest.mark.asyncio
async def test_email_disabled_raises_by_default():
    """Verifies that attempting to send an email when EMAIL_ENABLED=False raises EmailDisabledError."""
    settings = get_test_settings(EMAIL_ENABLED=False)
    transport = InMemoryEmailTransport()
    service = EmailService(settings=settings, transport=transport)

    msg = EmailMessage(
        recipients=["test@example.com"],
        subject="Assessment Finalized",
        text_body="Please find attached.",
    )

    with pytest.raises(EmailDisabledError, match="EMAIL_ENABLED=False"):
        await service.send_email(msg)

    assert len(transport.sent_messages) == 0


@pytest.mark.asyncio
async def test_email_disabled_skip_allowed():
    """Verifies that allow_disabled_skip=True safely skips delivery without raising."""
    settings = get_test_settings(EMAIL_ENABLED=False)
    transport = InMemoryEmailTransport()
    service = EmailService(settings=settings, transport=transport)

    msg = EmailMessage(
        recipients=["test@example.com"],
        subject="Assessment Finalized",
        text_body="Please find attached.",
    )

    success = await service.send_email(msg, allow_disabled_skip=True)
    assert success is False
    assert len(transport.sent_messages) == 0


@pytest.mark.asyncio
async def test_email_send_success_in_memory():
    """Verifies successful delivery to in-memory transport with recipients, subject, body, and attachments."""
    settings = get_test_settings()
    transport = InMemoryEmailTransport()
    service = EmailService(settings=settings, transport=transport)

    pdf_bytes = b"%PDF-1.4 Fake PDF Content for Assessment"
    csv_bytes = b"Metadata,Value\nAssessment ID,test-123\n"

    attachments = EmailService.create_deliverable_attachments(
        pdf_bytes=pdf_bytes,
        csv_content=csv_bytes,
    )

    msg = EmailMessage(
        recipients=["roop.test@example.com", "sumit.test@example.com"],
        subject="DATAEKO × meshIQ Assessment Deliverables",
        text_body="Your assessment reports are attached.",
        html_body="<p>Your assessment reports are <b>attached</b>.</p>",
        attachments=attachments,
    )

    result = await service.send_email(msg)
    assert result is True
    assert len(transport.sent_messages) == 1

    captured = transport.last_message
    assert captured is not None
    assert captured.recipients == ["roop.test@example.com", "sumit.test@example.com"]
    assert captured.subject == "DATAEKO × meshIQ Assessment Deliverables"
    assert captured.text_body == "Your assessment reports are attached."
    assert captured.html_body == "<p>Your assessment reports are <b>attached</b>.</p>"
    assert len(captured.attachments) == 2

    # Check attachments preservation
    pdf_att = next(a for a in captured.attachments if a.filename.endswith(".pdf"))
    assert pdf_att.content_type == "application/pdf"
    assert pdf_att.content == pdf_bytes

    csv_att = next(a for a in captured.attachments if a.filename.endswith(".csv"))
    assert csv_att.content_type == "text/csv"
    assert csv_att.content == csv_bytes


def test_test_recipients_resolution():
    """Verifies get_test_recipients correctly pulls configured test recipients."""
    settings = get_test_settings(
        TEST_RECIPIENT_ROOP="roop@example.org",
        TEST_RECIPIENT_SUMIT="sumit@example.org",
    )
    service = EmailService(settings=settings)
    recipients = service.get_test_recipients()
    assert recipients == ["roop@example.org", "sumit@example.org"]


# ==============================================================================
# MIME STRUCTURE & PARSING TESTS
# ==============================================================================

def test_build_mime_message_structure():
    """Verifies that build_mime_message produces RFC compliant multipart with accurate attachments."""
    settings = get_test_settings()
    pdf_data = b"%PDF-1.4 Mock Binary PDF Data\x00\x01\x02"
    csv_data = "Question,Answer\nQ01,Estate Scale\n"

    attachments = EmailService.create_deliverable_attachments(
        pdf_bytes=pdf_data,
        pdf_filename="Executive_Report.pdf",
        csv_content=csv_data,
        csv_filename="Responses.csv",
    )

    msg = EmailMessage(
        recipients=["r1@example.com", "r2@example.com"],
        subject="Executive Deliverables",
        text_body="Plain text overview.",
        html_body="<h3>HTML overview</h3>",
        attachments=attachments,
    )

    mime_msg = EmailService.build_mime_message(msg, settings)
    raw_bytes = mime_msg.as_bytes()

    # Parse raw bytes back using Python email library
    parsed = message_from_bytes(raw_bytes, policy=default_policy)
    assert parsed["To"] == "r1@example.com, r2@example.com"
    assert "DATAEKO" in parsed["From"]
    assert parsed["Subject"] == "Executive Deliverables"
    assert parsed.is_multipart()

    # Find attachments in parsed message
    parsed_attachments = list(parsed.iter_attachments())
    assert len(parsed_attachments) == 2

    pdf_part = next(p for p in parsed_attachments if p.get_filename() == "Executive_Report.pdf")
    assert pdf_part.get_content_type() == "application/pdf"
    assert pdf_part.get_payload(decode=True) == pdf_data

    csv_part = next(p for p in parsed_attachments if p.get_filename() == "Responses.csv")
    assert csv_part.get_content_type() == "text/csv"
    assert csv_part.get_payload(decode=True).decode("utf-8") == csv_data


# ==============================================================================
# SMTP TRANSPORT & ERROR HANDLING (MOCKED SMTP)
# ==============================================================================

def test_smtp_transport_send_success():
    """Tests SMTPTransport dispatch via mocked smtplib.SMTP with STARTTLS and login."""
    settings = get_test_settings(SMTP_PORT=587, SMTP_USE_TLS=True)
    transport = SMTPTransport()

    msg = EmailMessage(
        recipients=["client@example.com"],
        subject="Test Report",
        text_body="Report details.",
    )

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        success = transport.send(msg, settings)
        assert success is True

        mock_smtp_cls.assert_called_once_with("smtp.example.com", 587, timeout=30)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test_user", "super_secret_smtp_password")
        mock_server.send_message.assert_called_once()


def test_smtp_transport_ssl_port_465():
    """Tests SMTPTransport direct SSL connection on port 465."""
    settings = get_test_settings(SMTP_PORT=465, SMTP_USE_TLS=True)
    transport = SMTPTransport()

    msg = EmailMessage(
        recipients=["client@example.com"],
        subject="Test Report",
        text_body="Report details.",
    )

    with patch("smtplib.SMTP_SSL") as mock_smtp_ssl_cls:
        mock_server = MagicMock()
        mock_smtp_ssl_cls.return_value.__enter__.return_value = mock_server

        success = transport.send(msg, settings)
        assert success is True

        mock_smtp_ssl_cls.assert_called_once()
        mock_server.login.assert_called_once_with("test_user", "super_secret_smtp_password")
        mock_server.send_message.assert_called_once()


def test_smtp_transport_authentication_error_sanitized():
    """Verifies that SMTP authentication failures raise EmailDeliveryError without exposing passwords."""
    settings = get_test_settings()
    transport = SMTPTransport()

    msg = EmailMessage(
        recipients=["client@example.com"],
        subject="Test Report",
        text_body="Report details.",
    )

    with patch("smtplib.SMTP") as mock_smtp_cls:
        mock_server = MagicMock()
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Authentication credentials invalid")
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        with pytest.raises(EmailDeliveryError) as exc_info:
            transport.send(msg, settings)

        err_msg = str(exc_info.value)
        assert "SMTP authentication failed" in err_msg
        assert "super_secret_smtp_password" not in err_msg


def test_smtp_transport_connection_error_sanitized():
    """Verifies that SMTP connection errors raise EmailDeliveryError cleanly."""
    settings = get_test_settings()
    transport = SMTPTransport()

    msg = EmailMessage(
        recipients=["client@example.com"],
        subject="Test Report",
        text_body="Report details.",
    )

    with patch("smtplib.SMTP", side_effect=smtplib.SMTPConnectError(421, "Cannot connect to SMTP server")):
        with pytest.raises(EmailDeliveryError) as exc_info:
            transport.send(msg, settings)

        assert "SMTP connection failed" in str(exc_info.value)


# ==============================================================================
# BATCH 1: EMAIL DISTRIBUTION MODE & RECIPIENT GOVERNANCE TESTS
# ==============================================================================

def test_distribution_mode_disabled_parsing():
    """Verifies disabled mode parses correctly and reports safe diagnostics."""
    settings = get_test_settings(EMAIL_DISTRIBUTION_MODE="disabled")
    assert settings.EMAIL_DISTRIBUTION_MODE == "disabled"
    diag = settings.get_safe_diagnostics()
    assert diag["email_distribution_mode"] == "disabled"


def test_distribution_mode_test_parsing():
    """Verifies test mode parses correctly and normalizes lowercase whitespace."""
    settings = get_test_settings(EMAIL_DISTRIBUTION_MODE="  TEST  ")
    assert settings.EMAIL_DISTRIBUTION_MODE == "test"


def test_distribution_mode_production_parsing():
    """Verifies production mode parses correctly with configured production recipients."""
    settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="production",
        PROD_DATAEKO_DISTRIBUTION_EMAILS=["exec@dataeko.ai", "partner-lead@dataeko.ai"],
        PROD_MESHIQ_DISTRIBUTION_EMAILS=["delivery@meshiq.com"],
    )
    assert settings.EMAIL_DISTRIBUTION_MODE == "production"
    assert settings.PROD_DATAEKO_DISTRIBUTION_EMAILS == ["exec@dataeko.ai", "partner-lead@dataeko.ai"]
    assert settings.PROD_MESHIQ_DISTRIBUTION_EMAILS == ["delivery@meshiq.com"]
    diag = settings.get_safe_diagnostics()
    assert diag["email_distribution_mode"] == "production"
    assert diag["prod_dataeko_recipients_count"] == 2
    assert diag["prod_meshiq_recipients_count"] == 1


def test_distribution_mode_invalid_fails_closed():
    """Verifies that an unsupported distribution mode is rejected and fails closed."""
    with pytest.raises(ValueError, match="Invalid EMAIL_DISTRIBUTION_MODE 'staging'"):
        get_test_settings(EMAIL_DISTRIBUTION_MODE="staging")

    with pytest.raises(ValueError, match="Invalid EMAIL_DISTRIBUTION_MODE 'arbitrary'"):
        get_test_settings(EMAIL_DISTRIBUTION_MODE="arbitrary")


def test_recipient_governance_test_mode_resolves_only_roop_and_sumit():
    """Verifies test mode resolves exclusively Roop + Sumit, ignoring production recipients."""
    settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="test",
        TEST_RECIPIENT_ROOP="roop@example.com",
        TEST_RECIPIENT_SUMIT="sumit@example.com",
        PROD_DATAEKO_DISTRIBUTION_EMAILS=["prod_leak@dataeko.ai"],
        PROD_MESHIQ_DISTRIBUTION_EMAILS=["prod_leak@meshiq.com"],
    )
    service = EmailService(settings=settings)
    recipients = service.get_internal_recipients()
    assert recipients == ["roop@example.com", "sumit@example.com"]
    assert "prod_leak@dataeko.ai" not in recipients
    assert "prod_leak@meshiq.com" not in recipients


def test_recipient_governance_production_mode_resolves_configured_recipients():
    """Verifies production mode resolves configured DATAEKO + meshIQ recipients."""
    settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="production",
        TEST_RECIPIENT_ROOP="roop@example.com",
        TEST_RECIPIENT_SUMIT="sumit@example.com",
        PROD_DATAEKO_DISTRIBUTION_EMAILS=["exec@dataeko.ai"],
        PROD_MESHIQ_DISTRIBUTION_EMAILS=["team@meshiq.com"],
    )
    service = EmailService(settings=settings)
    recipients = service.get_internal_recipients()
    assert recipients == ["exec@dataeko.ai", "team@meshiq.com"]
    # Roop and Sumit test addresses must NEVER appear in production resolution
    assert "roop@example.com" not in recipients
    assert "sumit@example.com" not in recipients


def test_recipient_governance_production_mode_missing_recipients_fails_closed():
    """
    Verifies that production mode with missing recipients fails closed:
    1. Settings validation raises ValueError when EMAIL_ENABLED=True.
    2. EmailService.get_internal_recipients() raises EmailConfigurationError.
    """
    # 1. Settings validation failure when active in production without recipients
    with pytest.raises(ValueError, match="Production email distribution mode requires configured recipients"):
        get_test_settings(
            EMAIL_ENABLED=True,
            EMAIL_DISTRIBUTION_MODE="production",
            PROD_DATAEKO_DISTRIBUTION_EMAILS=[],
            PROD_MESHIQ_DISTRIBUTION_EMAILS=[],
        )

    # 2. Service level resolution failure (when instantiated with unconfigured prod mode)
    unconfigured_settings = get_test_settings(
        EMAIL_ENABLED=False,
        EMAIL_DISTRIBUTION_MODE="production",
        PROD_DATAEKO_DISTRIBUTION_EMAILS=[],
        PROD_MESHIQ_DISTRIBUTION_EMAILS=[],
    )
    service = EmailService(settings=unconfigured_settings)
    with pytest.raises(EmailConfigurationError, match="Production email distribution mode requires configured recipients"):
        service.get_internal_recipients()


@pytest.mark.asyncio
async def test_recipient_governance_disabled_mode_produces_no_delivery():
    """Verifies that disabled mode resolves empty recipients and safely halts/skips email delivery."""
    settings = get_test_settings(
        EMAIL_ENABLED=True,
        EMAIL_DISTRIBUTION_MODE="disabled",
    )
    transport = InMemoryEmailTransport()
    service = EmailService(settings=settings, transport=transport)

    assert service.get_internal_recipients() == []
    assert service.is_email_active is False

    msg = EmailMessage(
        recipients=["test@example.com"],
        subject="Deliverables",
        text_body="Content",
    )

    # With allow_disabled_skip=True, delivery is safely skipped with False
    result = await service.send_email(msg, allow_disabled_skip=True)
    assert result is False
    assert len(transport.sent_messages) == 0

    # With allow_disabled_skip=False, EmailDisabledError is raised
    with pytest.raises(EmailDisabledError, match="EMAIL_DISTRIBUTION_MODE=disabled"):
        await service.send_email(msg, allow_disabled_skip=False)


def test_browser_request_cannot_override_internal_recipients():
    """
    Verifies that get_internal_recipients is an authoritative server-side resolution
    that cannot be parameterized or overridden by external client/browser input.
    """
    settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="test",
        TEST_RECIPIENT_ROOP="roop@example.com",
        TEST_RECIPIENT_SUMIT="sumit@example.com",
    )
    service = EmailService(settings=settings)

    # The function accepts no recipient arguments and returns only configured server recipients
    recipients = service.get_internal_recipients()
    assert recipients == ["roop@example.com", "sumit@example.com"]


def test_production_recipients_cannot_be_overridden_by_test_recipients():
    """
    Verifies that in production mode, test recipients never override or pollute
    production recipient lists.
    """
    settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="production",
        TEST_RECIPIENT_ROOP="roop@example.com",
        TEST_RECIPIENT_SUMIT="sumit@example.com",
        PROD_DATAEKO_DISTRIBUTION_EMAILS=["prod@dataeko.ai"],
    )
    service = EmailService(settings=settings)
    recipients = service.get_internal_recipients()
    assert recipients == ["prod@dataeko.ai"]
    assert "roop@example.com" not in recipients
    assert "sumit@example.com" not in recipients


def test_test_recipients_cannot_accidentally_receive_production_traffic():
    """
    Verifies isolation between test and production recipient channels:
    Production channel never receives test recipients;
    Test channel never receives production recipients.
    """
    test_settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="test",
        TEST_RECIPIENT_ROOP="roop@test.com",
        TEST_RECIPIENT_SUMIT="sumit@test.com",
        PROD_DATAEKO_DISTRIBUTION_EMAILS=["prod@dataeko.ai"],
    )
    prod_settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="production",
        TEST_RECIPIENT_ROOP="roop@test.com",
        TEST_RECIPIENT_SUMIT="sumit@test.com",
        PROD_DATAEKO_DISTRIBUTION_EMAILS=["prod@dataeko.ai"],
    )

    test_service = EmailService(settings=test_settings)
    prod_service = EmailService(settings=prod_settings)

    test_resolved = test_service.get_internal_recipients()
    prod_resolved = prod_service.get_internal_recipients()

    assert set(test_resolved).isdisjoint(set(prod_resolved))
    assert "prod@dataeko.ai" not in test_resolved
    assert "roop@test.com" not in prod_resolved
    assert "sumit@test.com" not in prod_resolved


def test_in_memory_email_transport_remains_functional():
    """Verifies InMemoryEmailTransport captures, stores, and clears messages properly."""
    transport = InMemoryEmailTransport()
    msg1 = EmailMessage(recipients=["a@example.com"], subject="Sub 1", text_body="Body 1")
    msg2 = EmailMessage(recipients=["b@example.com"], subject="Sub 2", text_body="Body 2")

    settings = get_test_settings()
    assert transport.send(msg1, settings) is True
    assert transport.send(msg2, settings) is True

    assert len(transport.sent_messages) == 2
    assert transport.last_message.subject == "Sub 2"
    assert transport.sent_messages[0].subject == "Sub 1"

    transport.clear()
    assert len(transport.sent_messages) == 0
    assert transport.last_message is None


def test_recipient_governance_duplicate_test_recipients_collapse_to_one():
    """
    Verifies that get_test_recipients and get_internal_recipients deterministically
    deduplicate recipients when ROOP and SUMIT resolve to the same address.
    """
    settings = get_test_settings(
        EMAIL_DISTRIBUTION_MODE="test",
        TEST_RECIPIENT_ROOP="shared.mailbox@example.com",
        TEST_RECIPIENT_SUMIT="shared.mailbox@example.com",
    )
    service = EmailService(settings=settings)

    # Both get_test_recipients and get_internal_recipients must return the address exactly once
    assert service.get_test_recipients() == ["shared.mailbox@example.com"]
    assert service.get_internal_recipients() == ["shared.mailbox@example.com"]

