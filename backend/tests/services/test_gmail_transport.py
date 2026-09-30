import base64
import email
from email.message import Message
import pytest
from unittest.mock import MagicMock, patch

from app.config import Settings
from app.services.email_service import (
    EmailAttachment,
    EmailConfigurationError,
    EmailDeliveryError,
    EmailMessage,
    EmailService,
    GmailAPITransport,
    InMemoryEmailTransport,
    SMTPTransport,
)
from googleapiclient.errors import HttpError


class MockHttpResponse:
    def __init__(self, status: int = 400, reason: str = "Bad Request"):
        self.status = status
        self.reason = reason


@pytest.fixture
def gmail_settings() -> Settings:
    """Settings configured for Gmail API transport."""
    return Settings(
        EMAIL_ENABLED=True,
        EMAIL_DISTRIBUTION_MODE="test",
        EMAIL_TRANSPORT_TYPE="gmail_api",
        GMAIL_CLIENT_ID="mock-client-id.apps.googleusercontent.com",
        GMAIL_CLIENT_SECRET="mock-client-secret-12345",
        GMAIL_REDIRECT_URI="http://127.0.0.1:8000/api/v1/admin/email/oauth/callback",
        GMAIL_AUTHORIZED_SENDER="r.sabbavarapu@dataeko.ai",
        GMAIL_REFRESH_TOKEN="mock-refresh-token-xyz987",
        TEST_RECIPIENT_ROOP="r.sabbavarapu@dataeko.ai",
        TEST_RECIPIENT_SUMIT="s.verma@dataeko.ai",
    )


@pytest.fixture
def sample_message() -> EmailMessage:
    return EmailMessage(
        recipients=["client@acme.corp", "auditor@acme.corp"],
        subject="Assessment Finalized: Acme Corp",
        text_body="Dear Client,\n\nYour assessment is complete.",
        html_body="<p>Dear Client,<br>Your assessment is complete.</p>",
        attachments=[
            EmailAttachment(
                filename="report.pdf",
                content=b"%PDF-1.4 Mock PDF Content",
                content_type="application/pdf",
            ),
            EmailAttachment(
                filename="responses.csv",
                content=b"Q01,Scale\nQ02,10",
                content_type="text/csv",
            ),
        ],
    )


def test_gmail_transport_encodes_and_dispatches_mime_correctly(gmail_settings, sample_message):
    """
    REQ 4:
    - Gmail transport accepts existing MIME message from EmailService.
    - Base64url encodes raw MIME message.
    - Calls Gmail API users.messages.send with userId='me' and body={'raw': ...}.
    - Does not alter MIME structure, recipients, subject, body, or attachments.
    - Uses configured GMAIL_AUTHORIZED_SENDER.
    """
    mock_service = MagicMock()
    mock_messages = MagicMock()
    mock_send = MagicMock()

    mock_send.execute.return_value = {"id": "gmail-msg-1234567890", "threadId": "thread-abc"}
    mock_messages.send.return_value = mock_send
    mock_service.users.return_value.messages.return_value = mock_messages

    mock_factory = MagicMock(return_value=mock_service)
    transport = GmailAPITransport(service_factory=mock_factory)

    success = transport.send(sample_message, gmail_settings)
    assert success is True

    # Verify service factory was called with Gmail v1 and credentials with the exact send scope
    mock_factory.assert_called_once()
    call_args = mock_factory.call_args
    assert call_args[0][0] == "gmail"
    assert call_args[0][1] == "v1"
    creds = call_args[1]["credentials"]
    assert creds.client_id == "mock-client-id.apps.googleusercontent.com"
    assert creds.refresh_token == "mock-refresh-token-xyz987"
    assert creds.scopes == ["https://www.googleapis.com/auth/gmail.send"]
    # Explicitly verify broader mail.google.com scope is NOT used
    assert "https://mail.google.com/" not in creds.scopes

    # Verify users.messages.send call parameters
    mock_messages.send.assert_called_once()
    send_kwargs = mock_messages.send.call_args[1]
    assert send_kwargs["userId"] == "me"
    assert "raw" in send_kwargs["body"]

    # Decode and verify the raw MIME payload
    raw_b64 = send_kwargs["body"]["raw"]
    raw_bytes = base64.urlsafe_b64decode(raw_b64)
    parsed_msg = email.message_from_bytes(raw_bytes)

    # Verify From header uses GMAIL_AUTHORIZED_SENDER
    assert "r.sabbavarapu@dataeko.ai" in parsed_msg["From"]
    # Verify To header contains original recipients
    assert "client@acme.corp" in parsed_msg["To"]
    assert "auditor@acme.corp" in parsed_msg["To"]
    # Verify Subject is unchanged
    decoded_subject = str(email.header.make_header(email.header.decode_header(parsed_msg["Subject"])))
    assert decoded_subject == "Assessment Finalized: Acme Corp"

    # Verify attachments exist in MIME payload
    part_filenames = [p.get_filename() for p in parsed_msg.walk() if p.get_filename()]
    assert "report.pdf" in part_filenames
    assert "responses.csv" in part_filenames


def test_gmail_transport_missing_configuration_fails_safely(sample_message):
    """
    REQ 6:
    Missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN fails safely
    with EmailConfigurationError without making API calls.
    """
    transport = GmailAPITransport(service_factory=MagicMock())

    # Missing Client ID
    cfg1 = Settings(
        EMAIL_ENABLED=True,
        EMAIL_TRANSPORT_TYPE="gmail_api",
        GMAIL_CLIENT_ID=None,
        GMAIL_CLIENT_SECRET="secret",
        GMAIL_REFRESH_TOKEN="token",
    )
    with pytest.raises(EmailConfigurationError, match="GMAIL_CLIENT_ID is not configured"):
        transport.send(sample_message, cfg1)

    # Missing Client Secret
    cfg2 = Settings(
        EMAIL_ENABLED=True,
        EMAIL_TRANSPORT_TYPE="gmail_api",
        GMAIL_CLIENT_ID="id",
        GMAIL_CLIENT_SECRET="",
        GMAIL_REFRESH_TOKEN="token",
    )
    with pytest.raises(EmailConfigurationError, match="GMAIL_CLIENT_SECRET is not configured"):
        transport.send(sample_message, cfg2)

    # Missing Refresh Token
    cfg3 = Settings(
        EMAIL_ENABLED=True,
        EMAIL_TRANSPORT_TYPE="gmail_api",
        GMAIL_CLIENT_ID="id",
        GMAIL_CLIENT_SECRET="secret",
        GMAIL_REFRESH_TOKEN="   ",
    )
    with pytest.raises(EmailConfigurationError, match="GMAIL_REFRESH_TOKEN is not configured"):
        transport.send(sample_message, cfg3)


def test_gmail_transport_http_error_is_sanitized(gmail_settings, sample_message):
    """
    REQ 6:
    Google HttpError (e.g. 403 / 500) is sanitized to EmailDeliveryError.
    Tokens and secrets are never leaked.
    """
    mock_service = MagicMock()
    mock_send = MagicMock()
    mock_send.execute.side_effect = HttpError(
        resp=MockHttpResponse(status=403, reason="Rate Limit Exceeded"),
        content=b'{"error": {"code": 403, "message": "User rate limit exceeded", "status": "RESOURCE_EXHAUSTED"}}',
    )
    mock_service.users.return_value.messages.return_value.send.return_value = mock_send

    transport = GmailAPITransport(service_factory=MagicMock(return_value=mock_service))

    with pytest.raises(EmailDeliveryError) as exc_info:
        transport.send(sample_message, gmail_settings)

    err_msg = str(exc_info.value)
    assert "Gmail API delivery failed with HTTP status 403" in err_msg
    # Ensure no tokens or secrets appear in the exception message
    assert "mock-client-secret" not in err_msg
    assert "mock-refresh-token" not in err_msg


def test_gmail_transport_unexpected_exception_is_sanitized(gmail_settings, sample_message):
    """
    REQ 6:
    Unexpected socket / network exceptions are sanitized to EmailDeliveryError.
    """
    mock_service = MagicMock()
    mock_send = MagicMock()
    mock_send.execute.side_effect = ConnectionResetError("Connection abruptly closed by peer")
    mock_service.users.return_value.messages.return_value.send.return_value = mock_send

    transport = GmailAPITransport(service_factory=MagicMock(return_value=mock_service))

    with pytest.raises(EmailDeliveryError) as exc_info:
        transport.send(sample_message, gmail_settings)

    err_msg = str(exc_info.value)
    assert "Unexpected failure during Gmail API email dispatch: ConnectionResetError" in err_msg
    assert "mock-client-secret" not in err_msg


def test_email_service_transport_selection_logic():
    """
    REQ 7:
    - EMAIL_ENABLED=False -> InMemoryEmailTransport
    - EMAIL_ENABLED=True, EMAIL_TRANSPORT_TYPE='smtp' -> SMTPTransport
    - EMAIL_ENABLED=True, EMAIL_TRANSPORT_TYPE='gmail_api' -> GmailAPITransport
    - EMAIL_ENABLED=True, EMAIL_TRANSPORT_TYPE='in_memory' -> InMemoryEmailTransport
    - Explicit transport argument always takes precedence.
    """
    # 1. Disabled email defaults to in-memory
    s_disabled = Settings(EMAIL_ENABLED=False, EMAIL_TRANSPORT_TYPE="smtp")
    svc_disabled = EmailService(settings=s_disabled)
    assert isinstance(svc_disabled.transport, InMemoryEmailTransport)

    # 2. Enabled with SMTP
    s_smtp = Settings(EMAIL_ENABLED=True, EMAIL_TRANSPORT_TYPE="smtp", SMTP_HOST="smtp.test.internal")
    svc_smtp = EmailService(settings=s_smtp)
    assert isinstance(svc_smtp.transport, SMTPTransport)

    # 3. Enabled with Gmail API
    s_gmail = Settings(EMAIL_ENABLED=True, EMAIL_TRANSPORT_TYPE="gmail_api")
    svc_gmail = EmailService(settings=s_gmail)
    assert isinstance(svc_gmail.transport, GmailAPITransport)

    # 4. Enabled with In-Memory override
    s_mem = Settings(EMAIL_ENABLED=True, EMAIL_TRANSPORT_TYPE="in_memory")
    svc_mem = EmailService(settings=s_mem)
    assert isinstance(svc_mem.transport, InMemoryEmailTransport)

    # 5. Explicit transport override takes precedence regardless of settings
    custom_transport = InMemoryEmailTransport()
    svc_custom = EmailService(settings=s_gmail, transport=custom_transport)
    assert svc_custom.transport is custom_transport


@pytest.mark.asyncio
async def test_email_service_send_email_delegates_to_gmail_transport(gmail_settings, sample_message):
    """
    End-to-end delegation through EmailService.send_email using GmailAPITransport.
    """
    mock_service = MagicMock()
    mock_send = MagicMock()
    mock_send.execute.return_value = {"id": "gmail-msg-999"}
    mock_service.users.return_value.messages.return_value.send.return_value = mock_send

    transport = GmailAPITransport(service_factory=MagicMock(return_value=mock_service))
    svc = EmailService(settings=gmail_settings, transport=transport)

    dispatched = await svc.send_email(sample_message)
    assert dispatched is True
    mock_send.execute.assert_called_once()
