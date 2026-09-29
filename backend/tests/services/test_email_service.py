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
    assert diag["smtp_host_configured"] is True
    assert diag["smtp_port"] == 587
    assert diag["smtp_use_tls"] is True
    assert diag["email_from_address"] == "noreply@dataeko.ai"
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
