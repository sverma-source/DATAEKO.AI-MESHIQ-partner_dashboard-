import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from email import encoders
from email.header import Header
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
import logging
import smtplib
import ssl
from typing import List, Optional

from app.config import Settings, settings as global_settings
from app.core.errors import AppError

logger = logging.getLogger(__name__)


# ==============================================================================
# EXCEPTIONS
# ==============================================================================

class EmailServiceError(AppError):
    """Base exception for email service operations."""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message=message, details=details)


class EmailDisabledError(EmailServiceError):
    """Raised when email dispatch is requested while EMAIL_ENABLED is False."""
    def __init__(self, message: str = "Email delivery is disabled in current configuration."):
        super().__init__(message=message)


class EmailConfigurationError(EmailServiceError):
    """Raised when SMTP/email settings are invalid or missing required parameters."""
    def __init__(self, message: str):
        super().__init__(message=message)


class EmailDeliveryError(EmailServiceError):
    """Raised when an email transport failure occurs (connection, auth, timeout, etc.)."""
    def __init__(self, message: str):
        super().__init__(message=message)


# ==============================================================================
# DATA MODELS
# ==============================================================================

@dataclass
class EmailAttachment:
    """Represents a file attachment to be enclosed in an email message."""
    filename: str
    content: bytes
    content_type: str = "application/octet-stream"

    def __post_init__(self):
        if not self.filename or not self.filename.strip():
            raise EmailConfigurationError("Attachment filename cannot be empty.")
        if not isinstance(self.content, bytes):
            raise EmailConfigurationError(f"Attachment '{self.filename}' content must be bytes, got {type(self.content).__name__}.")


@dataclass
class EmailMessage:
    """Represents a complete outgoing email message."""
    recipients: List[str]
    subject: str
    text_body: str
    html_body: Optional[str] = None
    attachments: List[EmailAttachment] = field(default_factory=list)
    from_address: Optional[str] = None
    from_name: Optional[str] = None

    def __post_init__(self):
        if not self.recipients or not any(r.strip() for r in self.recipients):
            raise EmailConfigurationError("EmailMessage must contain at least one recipient address.")
        if not self.subject or not self.subject.strip():
            raise EmailConfigurationError("EmailMessage subject cannot be empty.")
        if not self.text_body or not self.text_body.strip():
            raise EmailConfigurationError("EmailMessage text_body cannot be empty.")
        
        # Clean and validate recipient list
        cleaned_recipients = []
        for r in self.recipients:
            cleaned = r.strip()
            if not cleaned or "@" not in cleaned:
                raise EmailConfigurationError(f"Invalid recipient email address: '{r}'")
            if "\n" in cleaned or "\r" in cleaned:
                raise EmailConfigurationError("Header injection detected in recipient address.")
            cleaned_recipients.append(cleaned)
        self.recipients = cleaned_recipients


# ==============================================================================
# TRANSPORTS
# ==============================================================================

class EmailTransport(ABC):
    """Abstract transport boundary for email transmission."""

    @abstractmethod
    def send(self, message: EmailMessage, settings: Settings) -> bool:
        """Sends an email message using the specified configuration settings."""
        pass


class InMemoryEmailTransport(EmailTransport):
    """
    Test and development transport that captures sent messages in memory.
    Ensures tests and dry-runs never attempt live network or SMTP calls.
    """

    def __init__(self):
        self.sent_messages: List[EmailMessage] = []

    def send(self, message: EmailMessage, settings: Settings) -> bool:
        self.sent_messages.append(message)
        logger.info(
            "InMemoryEmailTransport: Captured email to %d recipients with subject '%s' (%d attachments)",
            len(message.recipients),
            message.subject,
            len(message.attachments) if message.attachments else 0,
        )
        return True

    def clear(self) -> None:
        self.sent_messages.clear()

    @property
    def last_message(self) -> Optional[EmailMessage]:
        return self.sent_messages[-1] if self.sent_messages else None


class SMTPTransport(EmailTransport):
    """Live SMTP transport using Python smtplib with STARTTLS/SSL support."""

    def send(self, message: EmailMessage, settings: Settings) -> bool:
        if not settings.SMTP_HOST:
            raise EmailConfigurationError("Cannot send email via SMTPTransport: SMTP_HOST is not configured.")

        # Build raw MIME message
        mime_msg = EmailService.build_mime_message(message, settings)
        recipients = message.recipients
        sender = message.from_address or settings.EMAIL_FROM_ADDRESS

        logger.info(
            "SMTPTransport: Initiating dispatch to %d recipient(s) via %s:%d (TLS=%s)",
            len(recipients),
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            settings.SMTP_USE_TLS,
        )

        try:
            if settings.SMTP_PORT == 465:
                # Direct SSL/TLS connection
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=30) as server:
                    if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.send_message(mime_msg, from_addr=sender, to_addrs=recipients)
            else:
                # Standard SMTP connection with optional STARTTLS
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                    server.ehlo()
                    if settings.SMTP_USE_TLS:
                        context = ssl.create_default_context()
                        server.starttls(context=context)
                        server.ehlo()
                    if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.send_message(mime_msg, from_addr=sender, to_addrs=recipients)

            logger.info("SMTPTransport: Email successfully dispatched to %d recipient(s).", len(recipients))
            return True

        except smtplib.SMTPAuthenticationError as exc:
            # Explicitly sanitize to ensure passwords or raw auth tokens are never leaked
            logger.error("SMTPTransport authentication failed for host %s", settings.SMTP_HOST)
            raise EmailDeliveryError("SMTP authentication failed. Verify server username/password configuration.") from exc
        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError, OSError) as exc:
            logger.error("SMTPTransport connection failure connecting to %s:%d", settings.SMTP_HOST, settings.SMTP_PORT)
            raise EmailDeliveryError(f"SMTP connection failed connecting to {settings.SMTP_HOST}:{settings.SMTP_PORT}.") from exc
        except smtplib.SMTPException as exc:
            logger.error("SMTPTransport general protocol error occurred: %s", type(exc).__name__)
            raise EmailDeliveryError(f"SMTP protocol error during email dispatch: {type(exc).__name__}") from exc
        except Exception as exc:
            logger.error("SMTPTransport unexpected failure during email dispatch: %s", type(exc).__name__)
            raise EmailDeliveryError(f"Unexpected failure during email dispatch: {type(exc).__name__}") from exc


# ==============================================================================
# EMAIL SERVICE
# ==============================================================================

class EmailService:
    """
    Modular, secure email service for DATAEKO × meshIQ assessment deliverables.
    Encapsulates message assembly, attachment encoding, configuration validation,
    and asynchronous dispatch via pluggable transports.
    """

    def __init__(
        self,
        settings: Optional[Settings] = None,
        transport: Optional[EmailTransport] = None,
    ):
        self.settings: Settings = settings or global_settings
        self.transport: EmailTransport = transport or (
            SMTPTransport() if self.settings.EMAIL_ENABLED else InMemoryEmailTransport()
        )

    @staticmethod
    def build_mime_message(message: EmailMessage, settings: Optional[Settings] = None) -> MIMEMultipart:
        """
        Constructs a RFC-compliant MIME multipart email message with headers,
        text/html body alternatives, and binary/text attachments.
        """
        cfg = settings or global_settings
        from_addr = message.from_address or cfg.EMAIL_FROM_ADDRESS
        from_name = message.from_name or cfg.EMAIL_FROM_NAME

        # Root multipart container
        if message.attachments:
            root = MIMEMultipart("mixed")
        elif message.html_body:
            root = MIMEMultipart("alternative")
        else:
            root = MIMEMultipart("mixed")

        # Standard RFC headers
        if from_name:
            root["From"] = f"{Header(from_name, 'utf-8').encode()} <{from_addr}>"
        else:
            root["From"] = from_addr

        root["To"] = ", ".join(message.recipients)
        root["Subject"] = Header(message.subject, "utf-8").encode()
        root["Date"] = formatdate(localtime=True)
        root["Message-ID"] = make_msgid(domain="dataeko.ai")

        # Body container
        if message.html_body:
            body_part = MIMEMultipart("alternative")
            body_part.attach(MIMEText(message.text_body, "plain", "utf-8"))
            body_part.attach(MIMEText(message.html_body, "html", "utf-8"))
            root.attach(body_part)
        else:
            root.attach(MIMEText(message.text_body, "plain", "utf-8"))

        # Attachments
        if message.attachments:
            for attachment in message.attachments:
                maintype, _, subtype = (attachment.content_type or "application/octet-stream").partition("/")
                part = MIMEBase(maintype or "application", subtype or "octet-stream")
                part.set_payload(attachment.content)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=attachment.filename,
                )
                root.attach(part)

        return root

    def get_test_recipients(self) -> List[str]:
        """
        Returns the non-empty configured internal test distribution recipients.
        Used for development and QA testing without hard-coding addresses in source.
        """
        recipients = []
        if self.settings.TEST_RECIPIENT_ROOP and self.settings.TEST_RECIPIENT_ROOP.strip():
            recipients.append(self.settings.TEST_RECIPIENT_ROOP.strip())
        if self.settings.TEST_RECIPIENT_SUMIT and self.settings.TEST_RECIPIENT_SUMIT.strip():
            recipients.append(self.settings.TEST_RECIPIENT_SUMIT.strip())
        return recipients

    @staticmethod
    def create_deliverable_attachments(
        pdf_bytes: Optional[bytes] = None,
        pdf_filename: str = "DATAEKO_meshIQ_Executive_Assessment_Report.pdf",
        csv_content: Optional[str | bytes] = None,
        csv_filename: str = "DATAEKO_meshIQ_Assessment_Responses.csv",
    ) -> List[EmailAttachment]:
        """
        Utility to construct standardized EmailAttachment objects for assessment deliverables.
        Ensures proper MIME types and byte encoding without regenerating deliverables.
        """
        attachments: List[EmailAttachment] = []

        if pdf_bytes is not None:
            attachments.append(
                EmailAttachment(
                    filename=pdf_filename,
                    content=pdf_bytes,
                    content_type="application/pdf",
                )
            )

        if csv_content is not None:
            csv_bytes = csv_content.encode("utf-8") if isinstance(csv_content, str) else csv_content
            attachments.append(
                EmailAttachment(
                    filename=csv_filename,
                    content=csv_bytes,
                    content_type="text/csv",
                )
            )

        return attachments

    async def send_email(
        self,
        message: EmailMessage,
        allow_disabled_skip: bool = False,
    ) -> bool:
        """
        Dispatches an email message asynchronously via the configured transport.
        
        If allow_disabled_skip is True and EMAIL_ENABLED is False, delivery is
        safely skipped with an INFO log.
        If allow_disabled_skip is False and EMAIL_ENABLED is False, EmailDisabledError is raised.
        """
        # Validate email active state
        if not self.settings.EMAIL_ENABLED:
            if allow_disabled_skip:
                logger.info(
                    "Email delivery skipped: EMAIL_ENABLED is False. Subject: '%s', Recipients: %d",
                    message.subject,
                    len(message.recipients),
                )
                return False
            raise EmailDisabledError("Email delivery is disabled in current configuration (EMAIL_ENABLED=False).")

        # Validate SMTP configuration prerequisites
        if not self.settings.SMTP_HOST or not self.settings.SMTP_HOST.strip():
            raise EmailConfigurationError("SMTP_HOST must be configured when EMAIL_ENABLED is True.")

        # Execute blocking transport in worker thread to prevent event loop starvation
        loop = asyncio.get_running_loop()
        success = await loop.run_in_executor(
            None,
            self.transport.send,
            message,
            self.settings,
        )
        return success
