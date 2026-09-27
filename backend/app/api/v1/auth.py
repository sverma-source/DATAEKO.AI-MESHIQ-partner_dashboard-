from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.config import settings
from app.core.audit import log_audit_event
from app.core.errors import AuthenticationError
from app.core.rate_limit import get_trusted_client_ip, rate_limit_login
from app.core.rbac import ROLE_PERMISSIONS, Role
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, AuthResponse
from app.schemas.user import UserResponse

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    _rate_limit: None = Depends(rate_limit_login),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user with email and password.
    Enforces pre-lookup rate limiting (5 attempts/min per resolved client IP).
    Sets secure HTTP-only cookie (HttpOnly, Secure, SameSite=Strict) and returns user profile with permissions.
    The raw JWT access token is NEVER exposed in the JSON response body.
    """
    client_ip = get_trusted_client_ip(request)

    stmt = select(User).where(User.email == login_data.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        tenant_id = user.tenant_id if user else "00000000-0000-0000-0000-000000000001"
        await log_audit_event(
            session=db,
            event_type="USER_LOGIN_FAILED",
            tenant_id=tenant_id,
            user_id=user.id if user else None,
            status="FAILURE",
            details={"email": login_data.email, "reason": "Invalid credentials"},
            ip_address=client_ip,
        )
        await db.commit()
        raise AuthenticationError("Incorrect email or password.")

    if not user.is_active:
        raise AuthenticationError("User account is inactive.")

    # Create access token
    access_token = create_access_token(
        subject=user.id,
        tenant_id=user.tenant_id,
        role=user.role,
        email=user.email,
    )

    # Set HTTP-only, Secure, SameSite=Strict cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    # Log successful login
    await log_audit_event(
        session=db,
        event_type="USER_LOGIN_SUCCESS",
        tenant_id=user.tenant_id,
        user_id=user.id,
        status="SUCCESS",
        details={"email": user.email, "role": user.role},
        ip_address=client_ip,
    )
    await db.commit()

    # Determine user permissions
    role_enum = Role(user.role) if user.role in Role.__members__ else Role.CONSULTANT
    user_perms = [p.value for p in ROLE_PERMISSIONS.get(role_enum, set())]

    return AuthResponse(
        user=UserResponse.model_validate(user),
        permissions=user_perms,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Invalidate session by clearing the access_token cookie.
    """
    client_ip = get_trusted_client_ip(request)

    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )

    await log_audit_event(
        session=db,
        event_type="USER_LOGOUT",
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        status="SUCCESS",
        details={"email": current_user.email},
        ip_address=client_ip,
    )
    await db.commit()

    return {"detail": "Successfully logged out."}


@router.get("/me", response_model=AuthResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get profile, tenant membership, and permissions for current authenticated user.
    """
    role_enum = Role(current_user.role) if current_user.role in Role.__members__ else Role.CONSULTANT
    user_perms = [p.value for p in ROLE_PERMISSIONS.get(role_enum, set())]

    return AuthResponse(
        user=UserResponse.model_validate(current_user),
        permissions=user_perms,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
