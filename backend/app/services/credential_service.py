import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.audit import log_audit_event
from app.core.errors import AppError, EntityNotFoundError, PermissionDeniedError
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User
from app.models.user_credential_token import TokenType, UserCredentialToken
from app.services.email_service import EmailMessage, EmailService

logger = logging.getLogger(__name__)


class CredentialTokenError(AppError):
    """Raised when an invitation or reset token is invalid, expired, or already used."""
    def __init__(self, message: str = "Invalid or expired security token."):
        super().__init__(message=message)


class CredentialService:
    """
    Secure lifecycle orchestration for user invitations and password resets.
    Implements cryptographic token generation, SHA-256 hashing at rest,
    atomic token redemption, replay defense, and email dispatch via EmailService.
    """

    @staticmethod
    def generate_raw_token() -> str:
        """Generate a cryptographically secure URL-safe random token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Computes the fixed-length SHA-256 digest of a bearer token."""
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @classmethod
    async def create_invitation(
        cls,
        db: AsyncSession,
        user: User,
        actor_id: Optional[str] = None,
        email_service: Optional[EmailService] = None,
    ) -> str:
        """
        Creates an invitation token for a user, records audit event, and dispatches invitation email.
        Invalidates any prior unused invitation tokens for this user.
        Returns the raw token (to be sent ONLY via email URL).
        """
        raw_token = cls.generate_raw_token()
        token_hash = cls.hash_token(raw_token)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=24)

        # 1. Invalidate previous unused invitation tokens for this user
        invalidate_stmt = (
            update(UserCredentialToken)
            .where(
                UserCredentialToken.user_id == user.id,
                UserCredentialToken.token_type == TokenType.INVITATION.value,
                UserCredentialToken.is_used == False,
            )
            .values(is_used=True, used_at=now)
        )
        await db.execute(invalidate_stmt)

        # 2. Persist new token record with SHA-256 digest
        token_record = UserCredentialToken(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=token_hash,
            token_type=TokenType.INVITATION.value,
            expires_at=expires_at,
            is_used=False,
            created_at=now,
        )
        db.add(token_record)
        await db.flush()

        # 3. Log audit event (NO raw token or hash logged)
        await log_audit_event(
            session=db,
            event_type="USER_INVITATION_CREATED",
            tenant_id=user.tenant_id,
            user_id=actor_id or user.id,
            resource_type="User",
            resource_id=user.id,
            status="SUCCESS",
            details={
                "target_email": user.email,
                "role": user.role,
                "expires_at": expires_at.isoformat(),
            },
        )

        # 4. Dispatch invitation email via EmailService
        frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        invite_url = f"{frontend_base}/accept-invitation?token={raw_token}"

        text_body = (
            f"Hello {user.full_name},\n\n"
            f"You have been invited to join the DATAEKO × meshIQ Partner Dashboard.\n\n"
            f"To activate your account and establish your initial password, please visit the link below within 24 hours:\n"
            f"{invite_url}\n\n"
            f"If you did not expect this invitation, you can safely ignore this email.\n\n"
            f"— DATAEKO × meshIQ Assessment Platform Team"
        )
        html_body = (
            f"<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
            f"<h2 style='color: #172033; margin-top: 0;'>Welcome to DATAEKO × meshIQ Partner Dashboard</h2>"
            f"<p style='color: #475569; line-height: 1.6;'>Hello <strong>{user.full_name}</strong>,</p>"
            f"<p style='color: #475569; line-height: 1.6;'>You have been invited to access the DATAEKO × meshIQ enterprise platform. Click the button below to set up your password and activate your account (valid for 24 hours):</p>"
            f"<div style='margin: 28px 0; text-align: center;'>"
            f"<a href='{invite_url}' style='background-color: #008638; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Accept Invitation & Set Password</a>"
            f"</div>"
            f"<p style='color: #94a3b8; font-size: 12px; line-height: 1.5;'>If the button above does not work, copy and paste this link into your browser:<br/><a href='{invite_url}' style='color: #008638;'>{invite_url}</a></p>"
            f"<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;'/>"
            f"<p style='color: #94a3b8; font-size: 11px;'>This invitation was sent by DATAEKO × meshIQ Assessment Platform.</p>"
            f"</div>"
        )

        email_msg = EmailMessage(
            recipients=[user.email],
            subject="You're invited to DATAEKO × meshIQ Partner Dashboard",
            text_body=text_body,
            html_body=html_body,
        )

        svc = email_service or EmailService()
        try:
            await svc.send_email(email_msg, allow_disabled_skip=True)
        except Exception as e:
            logger.warning("Email delivery skipped or failed for invitation to %s: %s", user.email, str(e))

        return raw_token

    @classmethod
    async def accept_invitation(
        cls,
        db: AsyncSession,
        raw_token: str,
        new_password: str,
        client_ip: Optional[str] = None,
    ) -> User:
        """
        Atomically validates an invitation token, updates the user's password,
        activates the user account, and marks the token as used.
        """
        if len(new_password) < 8:
            raise CredentialTokenError("Password must be at least 8 characters in length.")

        token_hash = cls.hash_token(raw_token.strip())
        now = datetime.now(timezone.utc)

        # Locate token record
        stmt = (
            select(UserCredentialToken)
            .where(
                UserCredentialToken.token_hash == token_hash,
                UserCredentialToken.token_type == TokenType.INVITATION.value,
            )
            .with_for_update()
        )
        res = await db.execute(stmt)
        token_record = res.scalar_one_or_none()

        if not token_record:
            logger.warning("Invitation acceptance attempt with unknown token hash")
            raise CredentialTokenError("Invalid or expired invitation token.")

        if token_record.is_used:
            logger.warning("Invitation acceptance replay attempt for token %s", token_record.id)
            await log_audit_event(
                session=db,
                event_type="USER_INVITATION_FAILED",
                tenant_id=token_record.tenant_id,
                user_id=token_record.user_id,
                resource_type="User",
                resource_id=token_record.user_id,
                status="FAILURE",
                details={"reason": "Token already used"},
                ip_address=client_ip,
            )
            await db.commit()
            raise CredentialTokenError("This invitation link has already been used.")

        # Ensure token expiration comparison is timezone-aware
        expires_at = token_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            logger.warning("Invitation acceptance attempt with expired token %s", token_record.id)
            await log_audit_event(
                session=db,
                event_type="USER_INVITATION_FAILED",
                tenant_id=token_record.tenant_id,
                user_id=token_record.user_id,
                resource_type="User",
                resource_id=token_record.user_id,
                status="FAILURE",
                details={"reason": "Token expired"},
                ip_address=client_ip,
            )
            await db.commit()
            raise CredentialTokenError("This invitation link has expired. Please request a new invitation.")

        # Locate user
        user_stmt = select(User).where(
            User.id == token_record.user_id,
            User.tenant_id == token_record.tenant_id,
        ).with_for_update()
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if not user:
            raise CredentialTokenError("User associated with this invitation was not found.")

        # Update credentials and activate
        user.hashed_password = get_password_hash(new_password)
        user.is_active = True

        # Atomically mark token used
        token_record.is_used = True
        token_record.used_at = now

        # Log audit events
        await log_audit_event(
            session=db,
            event_type="USER_INVITATION_ACCEPTED",
            tenant_id=user.tenant_id,
            user_id=user.id,
            resource_type="User",
            resource_id=user.id,
            status="SUCCESS",
            details={"email": user.email, "role": user.role},
            ip_address=client_ip,
        )
        await log_audit_event(
            session=db,
            event_type="USER_ACTIVATED",
            tenant_id=user.tenant_id,
            user_id=user.id,
            resource_type="User",
            resource_id=user.id,
            status="SUCCESS",
            details={"email": user.email, "role": user.role, "reason": "INVITATION_ACCEPTED"},
            ip_address=client_ip,
        )

        await db.commit()
        await db.refresh(user)
        return user

    @classmethod
    async def request_password_reset(
        cls,
        db: AsyncSession,
        email: str,
        client_ip: Optional[str] = None,
        email_service: Optional[EmailService] = None,
    ) -> None:
        """
        Processes a password reset request without disclosing account existence.
        If account exists and is active, generates a 1-hour reset token and sends email.
        """
        clean_email = email.strip().lower()
        stmt = select(User).where(User.email == clean_email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not user.is_active:
            # Do not disclose account existence or inactivity
            logger.info("Password reset requested for non-existent or inactive user: %s", clean_email)
            # Log sanitized audit event without leaking whether account exists
            await log_audit_event(
                session=db,
                event_type="USER_PASSWORD_RESET_REQUESTED",
                tenant_id=user.tenant_id if user else "00000000-0000-0000-0000-000000000001",
                user_id=user.id if user else None,
                status="SUCCESS",
                details={"status": "PROCESSED_GENERIC"},
                ip_address=client_ip,
            )
            await db.commit()
            return

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=1)
        raw_token = cls.generate_raw_token()
        token_hash = cls.hash_token(raw_token)

        # Invalidate prior unused password reset tokens
        invalidate_stmt = (
            update(UserCredentialToken)
            .where(
                UserCredentialToken.user_id == user.id,
                UserCredentialToken.token_type == TokenType.PASSWORD_RESET.value,
                UserCredentialToken.is_used == False,
            )
            .values(is_used=True, used_at=now)
        )
        await db.execute(invalidate_stmt)

        # Persist new token record
        token_record = UserCredentialToken(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=token_hash,
            token_type=TokenType.PASSWORD_RESET.value,
            expires_at=expires_at,
            is_used=False,
            created_at=now,
        )
        db.add(token_record)

        # Log audit event
        await log_audit_event(
            session=db,
            event_type="USER_PASSWORD_RESET_REQUESTED",
            tenant_id=user.tenant_id,
            user_id=user.id,
            resource_type="User",
            resource_id=user.id,
            status="SUCCESS",
            details={"expires_at": expires_at.isoformat()},
            ip_address=client_ip,
        )
        await db.commit()

        # Send password reset email
        frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_base}/reset-password?token={raw_token}"

        text_body = (
            f"Hello {user.full_name},\n\n"
            f"We received a request to reset your password for the DATAEKO × meshIQ Partner Dashboard.\n\n"
            f"To choose a new password, please visit the link below within 1 hour:\n"
            f"{reset_url}\n\n"
            f"If you did not request a password reset, you can safely ignore this email.\n\n"
            f"— DATAEKO × meshIQ Assessment Platform Team"
        )
        html_body = (
            f"<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
            f"<h2 style='color: #172033; margin-top: 0;'>Password Reset Request</h2>"
            f"<p style='color: #475569; line-height: 1.6;'>Hello <strong>{user.full_name}</strong>,</p>"
            f"<p style='color: #475569; line-height: 1.6;'>We received a request to reset your password. Click the button below to choose a new password (valid for 1 hour):</p>"
            f"<div style='margin: 28px 0; text-align: center;'>"
            f"<a href='{reset_url}' style='background-color: #008638; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Reset Password</a>"
            f"</div>"
            f"<p style='color: #94a3b8; font-size: 12px; line-height: 1.5;'>If you did not request a password reset, please ignore this email.<br/><a href='{reset_url}' style='color: #008638;'>{reset_url}</a></p>"
            f"</div>"
        )

        email_msg = EmailMessage(
            recipients=[user.email],
            subject="Password Reset Request — DATAEKO × meshIQ Partner Dashboard",
            text_body=text_body,
            html_body=html_body,
        )

        svc = email_service or EmailService()
        try:
            await svc.send_email(email_msg, allow_disabled_skip=True)
        except Exception as e:
            logger.warning("Email delivery skipped or failed for password reset to %s: %s", user.email, str(e))

    @classmethod
    async def reset_password(
        cls,
        db: AsyncSession,
        raw_token: str,
        new_password: str,
        client_ip: Optional[str] = None,
    ) -> User:
        """
        Atomically validates a password reset token and updates the user's password.
        Rejects tokens for deactivated accounts without reactivating them.
        """
        if len(new_password) < 8:
            raise CredentialTokenError("Password must be at least 8 characters in length.")

        token_hash = cls.hash_token(raw_token.strip())
        now = datetime.now(timezone.utc)

        stmt = (
            select(UserCredentialToken)
            .where(
                UserCredentialToken.token_hash == token_hash,
                UserCredentialToken.token_type == TokenType.PASSWORD_RESET.value,
            )
            .with_for_update()
        )
        res = await db.execute(stmt)
        token_record = res.scalar_one_or_none()

        if not token_record:
            raise CredentialTokenError("Invalid or expired password reset link.")

        if token_record.is_used:
            await log_audit_event(
                session=db,
                event_type="USER_PASSWORD_RESET_FAILED",
                tenant_id=token_record.tenant_id,
                user_id=token_record.user_id,
                resource_type="User",
                resource_id=token_record.user_id,
                status="FAILURE",
                details={"reason": "Token already used"},
                ip_address=client_ip,
            )
            await db.commit()
            raise CredentialTokenError("This password reset link has already been used.")

        expires_at = token_record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            await log_audit_event(
                session=db,
                event_type="USER_PASSWORD_RESET_FAILED",
                tenant_id=token_record.tenant_id,
                user_id=token_record.user_id,
                resource_type="User",
                resource_id=token_record.user_id,
                status="FAILURE",
                details={"reason": "Token expired"},
                ip_address=client_ip,
            )
            await db.commit()
            raise CredentialTokenError("This password reset link has expired. Please request a new one.")

        # Locate user
        user_stmt = select(User).where(
            User.id == token_record.user_id,
            User.tenant_id == token_record.tenant_id,
        ).with_for_update()
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if not user:
            raise CredentialTokenError("User associated with this reset request was not found.")

        # Deactivated accounts must not regain access via password reset
        if not user.is_active:
            await log_audit_event(
                session=db,
                event_type="USER_PASSWORD_RESET_FAILED",
                tenant_id=user.tenant_id,
                user_id=user.id,
                resource_type="User",
                resource_id=user.id,
                status="FAILURE",
                details={"reason": "Account is deactivated by administrator"},
                ip_address=client_ip,
            )
            await db.commit()
            raise PermissionDeniedError("Account is deactivated. Please contact your system administrator.")

        # Update password hash and increment session auth_version to invalidate prior JWTs
        user.hashed_password = get_password_hash(new_password)
        user.auth_version = (user.auth_version or 1) + 1

        # Mark token used
        token_record.is_used = True
        token_record.used_at = now

        # Log audit event
        await log_audit_event(
            session=db,
            event_type="USER_PASSWORD_RESET_COMPLETED",
            tenant_id=user.tenant_id,
            user_id=user.id,
            resource_type="User",
            resource_id=user.id,
            status="SUCCESS",
            details={"email": user.email, "auth_version": user.auth_version},
            ip_address=client_ip,
        )

        await db.commit()
        await db.refresh(user)
        return user
