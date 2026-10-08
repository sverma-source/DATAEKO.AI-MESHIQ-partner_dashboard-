import asyncio
import base64
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
from typing import Any, Callable, Dict, List, Optional

try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build as google_api_build
    from googleapiclient.errors import HttpError
except ImportError:  # pragma: no cover
    Credentials = None  # type: ignore
    google_api_build = None  # type: ignore
    HttpError = Exception  # type: ignore

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


class GmailAPITransport(EmailTransport):
    """
    Gmail API OAuth 2.0 transport using Google API Python Client.
    Dispatches RFC-compliant MIME messages via users.messages.send.
    Uses strictly the https://www.googleapis.com/auth/gmail.send scope.
    """

    GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"

    def __init__(self, service_factory: Optional[Callable[..., Any]] = None):
        self._service_factory = service_factory or google_api_build

    def send(self, message: EmailMessage, settings: Settings) -> bool:
        if not settings.GMAIL_CLIENT_ID or not settings.GMAIL_CLIENT_ID.strip():
            raise EmailConfigurationError("Cannot send email via GmailAPITransport: GMAIL_CLIENT_ID is not configured.")
        if not settings.GMAIL_CLIENT_SECRET or not settings.GMAIL_CLIENT_SECRET.strip():
            raise EmailConfigurationError("Cannot send email via GmailAPITransport: GMAIL_CLIENT_SECRET is not configured.")
        if not settings.GMAIL_REFRESH_TOKEN or not settings.GMAIL_REFRESH_TOKEN.strip():
            raise EmailConfigurationError("Cannot send email via GmailAPITransport: GMAIL_REFRESH_TOKEN is not configured.")

        if self._service_factory is None:
            raise EmailConfigurationError("Cannot send email via GmailAPITransport: Google API client libraries are not available.")

        # Build raw MIME message using authoritative EmailService builder
        mime_msg = EmailService.build_mime_message(message, settings)
        recipients = message.recipients
        sender = (
            settings.GMAIL_AUTHORIZED_SENDER
            or message.from_address
            or settings.EMAIL_FROM_ADDRESS
        )

        raw_bytes = mime_msg.as_bytes()
        raw_b64 = base64.urlsafe_b64encode(raw_bytes).decode("utf-8")

        logger.info(
            "GmailAPITransport: Initiating dispatch to %d recipient(s) via Gmail API (sender=%s)",
            len(recipients),
            sender,
        )

        try:
            creds = Credentials(
                token=None,
                refresh_token=settings.GMAIL_REFRESH_TOKEN.strip(),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GMAIL_CLIENT_ID.strip(),
                client_secret=settings.GMAIL_CLIENT_SECRET.strip(),
                scopes=[self.GMAIL_SEND_SCOPE],
            )

            service = self._service_factory("gmail", "v1", credentials=creds, cache_discovery=False)
            result = service.users().messages().send(
                userId="me",
                body={"raw": raw_b64},
            ).execute()

            msg_id = result.get("id", "unknown") if isinstance(result, dict) else "unknown"
            logger.info("GmailAPITransport: Email successfully dispatched to %d recipient(s) (message_id=%s).", len(recipients), msg_id)
            return True

        except HttpError as exc:
            # Sanitize Google HttpError without leaking credentials, refresh tokens, or headers
            status_code = exc.resp.status if hasattr(exc, "resp") and hasattr(exc.resp, "status") else "unknown"
            logger.error("GmailAPITransport: Google API HTTP error %s during email dispatch", status_code)
            raise EmailDeliveryError(f"Gmail API delivery failed with HTTP status {status_code}.") from exc
        except EmailServiceError:
            raise
        except Exception as exc:
            logger.error("GmailAPITransport: Unexpected failure during email dispatch: %s", type(exc).__name__)
            raise EmailDeliveryError(f"Unexpected failure during Gmail API email dispatch: {type(exc).__name__}") from exc


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
        self.transport: EmailTransport = transport or self._resolve_default_transport(self.settings)

    @staticmethod
    def _resolve_default_transport(settings: Settings) -> EmailTransport:
        """
        Determines the default transport based on configuration.
        - EMAIL_ENABLED=False -> InMemoryEmailTransport
        - EMAIL_ENABLED=True & EMAIL_TRANSPORT_TYPE="gmail_api" -> GmailAPITransport
        - EMAIL_ENABLED=True & EMAIL_TRANSPORT_TYPE="in_memory" -> InMemoryEmailTransport
        - EMAIL_ENABLED=True & EMAIL_TRANSPORT_TYPE="smtp" (default) -> SMTPTransport
        """
        if not settings.EMAIL_ENABLED:
            return InMemoryEmailTransport()

        transport_type = (settings.EMAIL_TRANSPORT_TYPE or "smtp").strip().lower()
        if transport_type == "gmail_api":
            return GmailAPITransport()
        if transport_type == "in_memory":
            return InMemoryEmailTransport()
        return SMTPTransport()

    @staticmethod
    def build_mime_message(message: EmailMessage, settings: Optional[Settings] = None) -> MIMEMultipart:
        """
        Constructs a RFC-compliant MIME multipart email message with headers,
        text/html body alternatives, and binary/text attachments.
        """
        cfg = settings or global_settings
        from_addr = message.from_address or (
            cfg.GMAIL_AUTHORIZED_SENDER
            if getattr(cfg, "EMAIL_TRANSPORT_TYPE", "smtp") == "gmail_api" and cfg.GMAIL_AUTHORIZED_SENDER
            else cfg.EMAIL_FROM_ADDRESS
        )
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
        Deterministically deduplicates recipients if Roop and Sumit resolve to the same address.
        """
        recipients = []
        if self.settings.TEST_RECIPIENT_ROOP and self.settings.TEST_RECIPIENT_ROOP.strip():
            addr = self.settings.TEST_RECIPIENT_ROOP.strip()
            if addr not in recipients:
                recipients.append(addr)
        if self.settings.TEST_RECIPIENT_SUMIT and self.settings.TEST_RECIPIENT_SUMIT.strip():
            addr = self.settings.TEST_RECIPIENT_SUMIT.strip()
            if addr not in recipients:
                recipients.append(addr)
        return recipients

    def get_production_recipients(self) -> List[str]:
        """
        Returns the non-empty configured internal production distribution recipients
        from DATAEKO and meshIQ distribution lists.
        """
        recipients = []
        for addr in self.settings.PROD_DATAEKO_DISTRIBUTION_EMAILS:
            cleaned = addr.strip()
            if cleaned and cleaned not in recipients:
                recipients.append(cleaned)
        for addr in self.settings.PROD_MESHIQ_DISTRIBUTION_EMAILS:
            cleaned = addr.strip()
            if cleaned and cleaned not in recipients:
                recipients.append(cleaned)
        return recipients

    def get_internal_recipients(self) -> List[str]:
        """
        Authoritative server-side recipient-resolution path for internal deliverable emails.
        Strictly governed by EMAIL_DISTRIBUTION_MODE:
        - 'disabled': returns [] (delivery disabled).
        - 'test': returns ONLY test recipients (Roop + Sumit). Production recipients are NEVER returned.
        - 'production': returns ONLY configured production recipients (DATAEKO + meshIQ).
          Fails closed by raising EmailConfigurationError if no production recipients are configured.
          Test recipients are NEVER returned in production mode (no fallback).
        """
        mode = (self.settings.EMAIL_DISTRIBUTION_MODE or "").strip().lower()

        if mode == "disabled":
            return []

        if mode == "test":
            return self.get_test_recipients()

        if mode == "production":
            prod_recipients = self.get_production_recipients()
            if not prod_recipients:
                raise EmailConfigurationError(
                    "Production email distribution mode requires configured recipients in "
                    "PROD_DATAEKO_DISTRIBUTION_EMAILS or PROD_MESHIQ_DISTRIBUTION_EMAILS. "
                    "System fails closed to prevent unverified delivery."
                )
            return prod_recipients

        raise EmailConfigurationError(
            f"Invalid email distribution mode '{mode}'. Supported modes: 'disabled', 'test', 'production'."
        )

    @property
    def is_email_active(self) -> bool:
        """
        Returns True if email is enabled and distribution mode is not 'disabled'.
        """
        return bool(
            self.settings.EMAIL_ENABLED
            and self.settings.EMAIL_DISTRIBUTION_MODE in ("test", "production")
        )

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

    @staticmethod
    def validate_recipient_email(email: Optional[str]) -> Optional[str]:
        """
        Validates and sanitizes a single recipient email address.
        Returns the sanitized, lowercase email if valid.
        Returns None if email is empty, not a string, contains spaces/control characters/CRLF,
        or fails basic email syntax.
        """
        if not email or not isinstance(email, str):
            return None
        cleaned = email.strip()
        if not cleaned:
            return None
        if "\n" in cleaned or "\r" in cleaned:
            return None
        if any(c in cleaned for c in (" ", "\t", "\x00")):
            return None
        if "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
            return None
        user_part, sep, domain_part = cleaned.partition("@")
        if not user_part or not domain_part or "." not in domain_part or domain_part.endswith("."):
            return None
        return cleaned.lower()

    @staticmethod
    def create_client_submission_email(
        recipient_email: str,
        recipient_name: Optional[str],
        customer_name: str,
        assessment_title: str,
        assessment_id: str,
        responses: List[dict],
    ) -> EmailMessage:
        """
        Dedicated client confirmation email builder.
        Provides plain text and HTML versions.
        Contains ONLY:
        - customer/client identity
        - submission confirmation
        - finalized Q01-Q22 responses
        Strictly contains NO attachments, NO CalculationSnapshot metrics,
        NO economic metrics, NO PDF, NO CSV, NO internal recipients, and NO SMTP info.
        """
        display_name = recipient_name.strip() if recipient_name and recipient_name.strip() else customer_name

        # Build Plain Text Body
        lines = [
            f"Dear {display_name},",
            "",
            "Thank you for submitting your IBM MQ Discovery Assessment.",
            "Below is a record of your finalized responses (Q01–Q22) submitted for evaluation.",
            "",
            f"Customer Organization: {customer_name}",
            f"Assessment Title: {assessment_title}",
            f"Assessment Reference ID: {assessment_id}",
            "",
            "============================================================",
            "FINALIZED DISCOVERY RESPONSES (Q01–Q22)",
            "============================================================",
            "",
        ]

        current_section = None
        for item in responses:
            section = item.get("section") or "Discovery Questions"
            if section != current_section:
                current_section = section
                lines.append(f"\n--- {current_section} ---")

            q_id = item.get("question_id", "")
            title = item.get("title", "")
            resp_val = item.get("response", "")
            exact_val = item.get("exact_value", "")

            if exact_val and str(exact_val).strip():
                if resp_val and resp_val not in ("None", "Not answered", "Not provided"):
                    if "(Exact" in resp_val or exact_val in resp_val:
                        val_str = resp_val
                    else:
                        val_str = f"{resp_val} (Specified: {exact_val})"
                else:
                    val_str = f"Specified: {exact_val}"
            else:
                val_str = resp_val or "Not answered"

            lines.append(f"[{q_id}] {title}: {val_str}")

        lines.extend([
            "",
            "============================================================",
            "This confirmation has been sent to your registered address for your records.",
            "— DATAEKO × meshIQ Assessment Platform Team",
        ])
        text_body = "\n".join(lines)

        # Build HTML Body
        html_rows = []
        current_section = None
        for item in responses:
            section = item.get("section") or "Discovery Questions"
            if section != current_section:
                current_section = section
                html_rows.append(
                    f"<tr><td colspan='3' style='background-color: #F8FAFC; border-top: 1px solid #E2E8F0; "
                    f"border-bottom: 1px solid #E2E8F0; border-left: 3.5px solid #008638; padding: 9px 12px; "
                    f"font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; "
                    f"letter-spacing: 0.5px;'>{section}</td></tr>"
                )

            q_id = item.get("question_id", "")
            title = item.get("title", "")
            resp_val = item.get("response", "")
            exact_val = item.get("exact_value", "")

            if exact_val and str(exact_val).strip():
                if resp_val and resp_val not in ("None", "Not answered", "Not provided"):
                    if "(Exact" in resp_val or exact_val in resp_val:
                        val_str = f"<strong>{resp_val}</strong>"
                    else:
                        val_str = f"<strong>{resp_val}</strong> <span style='color: #64748B; font-weight: normal; font-size: 12px;'>(Specified: {exact_val})</span>"
                else:
                    val_str = f"<strong>Specified: {exact_val}</strong>"
            else:
                val_str = f"<strong>{resp_val or 'Not answered'}</strong>"

            html_rows.append(
                f"<tr style='border-bottom: 1px solid #F1F5F9;'>"
                f"<td style='padding: 8px 12px; font-weight: 800; color: #008638; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11.5px; width: 45px; vertical-align: top;'>{q_id}</td>"
                f"<td style='padding: 8px 12px; color: #334155; font-size: 12.5px; vertical-align: top;'>{title}</td>"
                f"<td style='padding: 8px 12px; color: #0F172A; font-size: 12.5px; vertical-align: top; text-align: right;'>{val_str}</td>"
                f"</tr>"
            )

        rows_html = "\n".join(html_rows)

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Submission Confirmation</title>
</head>
<body style="margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; line-height: 1.45;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 660px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <!-- Brand Topline -->
    <tr>
      <td style="background-color: #008638; height: 3px; font-size: 1px; line-height: 1px;">&nbsp;</td>
    </tr>
    <!-- Hero Banner -->
    <tr>
      <td style="background-color: #0D1322; padding: 22px 26px; color: #FFFFFF;">
        <div style="font-size: 9.5px; font-weight: 800; color: #8CC63E; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
          DATAEKO × MESHIQ ASSESSMENT PLATFORM
        </div>
        <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
          Assessment Submission Confirmation
        </h1>
        <p style="margin: 4px 0 0 0; font-size: 12.5px; color: #94A3B8;">
          Discovery Assessment Submission Confirmation
        </p>
      </td>
    </tr>
    <!-- Content Body -->
    <tr>
      <td style="padding: 24px 26px;">
        <p style="margin-top: 0; margin-bottom: 12px; font-size: 14.5px; color: #0F172A;">
          Dear <strong>{display_name}</strong>,
        </p>
        <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin-top: 0; margin-bottom: 16px;">
          Thank you for completing your IBM MQ Discovery Assessment. Your finalized responses (Q01–Q22) have been securely recorded and submitted to the evaluation team.
        </p>

        <!-- Metadata Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; margin: 16px 0 20px 0; font-size: 12.5px;">
          <tr>
            <td style="padding: 8px 14px; color: #64748B; width: 110px; font-size: 11px; text-transform: uppercase; font-weight: 700;">Customer</td>
            <td style="padding: 8px 14px; color: #0F172A; font-weight: 700;">{customer_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 14px; color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 700; border-top: 1px solid #F1F5F9;">Assessment</td>
            <td style="padding: 8px 14px; color: #0F172A; font-weight: 600; border-top: 1px solid #F1F5F9;">{assessment_title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 14px; color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 700; border-top: 1px solid #F1F5F9;">Reference ID</td>
            <td style="padding: 8px 14px; color: #0F172A; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11.5px; border-top: 1px solid #F1F5F9;">{assessment_id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 14px; color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 700; border-top: 1px solid #F1F5F9;">Status</td>
            <td style="padding: 8px 14px; border-top: 1px solid #F1F5F9;">
              <span style="display: inline-block; font-size: 10.5px; font-weight: 800; background-color: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; border-radius: 9999px; padding: 2px 8px; text-transform: uppercase; letter-spacing: 0.5px;">SUBMITTED</span>
            </td>
          </tr>
        </table>

        <!-- Responses Table -->
        <h3 style="font-size: 13.5px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px 0;">
          Finalized Discovery Responses (Q01–Q22)
        </h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background-color: #F1F5F9; text-align: left;">
              <th style="padding: 8px 12px; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; width: 45px;">ID</th>
              <th style="padding: 8px 12px; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Question</th>
              <th style="padding: 8px 12px; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Response</th>
            </tr>
          </thead>
          <tbody>
            {rows_html}
          </tbody>
        </table>

        <!-- Notice & Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
          <tr>
            <td style="font-size: 11px; color: #64748B; line-height: 1.45;">
              This confirmation has been sent to your registered address for your records.<br>
              © 2026 meshIQ · DATAEKO × meshIQ Assessment Platform
            </td>
            <td style="font-size: 11px; color: #64748B; text-align: right; vertical-align: top;">
              Powered by <strong style="color: #0F172A;">DATAEKO.AI</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        return EmailMessage(
            recipients=[recipient_email],
            subject=f"DATAEKO × meshIQ Assessment Submission Confirmation: {assessment_title}",
            text_body=text_body,
            html_body=html_body,
            attachments=[],
        )

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

        if self.settings.EMAIL_DISTRIBUTION_MODE == "disabled":
            if allow_disabled_skip:
                logger.info(
                    "Email delivery skipped: EMAIL_DISTRIBUTION_MODE is disabled. Subject: '%s', Recipients: %d",
                    message.subject,
                    len(message.recipients),
                )
                return False
            raise EmailDisabledError("Email delivery is disabled in current configuration (EMAIL_DISTRIBUTION_MODE=disabled).")

        # Validate transport-specific configuration prerequisites
        if isinstance(self.transport, SMTPTransport):
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

