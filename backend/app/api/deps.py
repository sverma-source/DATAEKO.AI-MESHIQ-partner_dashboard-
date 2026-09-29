from typing import AsyncGenerator, Callable, Optional, List
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.core.rbac import Permission, Role, has_permission
from app.core.security import decode_access_token
from app.models.tenant import Tenant
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)

# Default tenant ID for legacy compatibility / test seeding
DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


async def get_token_from_request(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[str]:
    """
    Extracts access token from HTTP-only cookie first, then falls back to Authorization Bearer header.
    """
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return bearer_token


async def get_current_user_optional(
    token: Optional[str] = Depends(get_token_from_request),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Extracts and validates the current user if a token is present; returns None if anonymous.
    Validates token signature, expiration, active status, and session auth_version.
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    stmt = select(User).where(User.id == user_id, User.is_active == True)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        return None

    token_auth_version = payload.get("auth_version")
    if token_auth_version is None or token_auth_version != user.auth_version:
        return None

    return user


async def get_current_user(
    token: Optional[str] = Depends(get_token_from_request),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Strict dependency requiring an authenticated and active user with matching auth_version.
    """
    if not token:
        raise AuthenticationError("Authentication required. Please log in.")

    payload = decode_access_token(token)
    if not payload:
        raise AuthenticationError("Invalid or expired authentication token.")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Malformed authentication token.")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise AuthenticationError("User associated with token does not exist.")
    if not user.is_active:
        raise AuthenticationError("User account is inactive.")

    token_auth_version = payload.get("auth_version")
    if token_auth_version is None or token_auth_version != user.auth_version:
        raise AuthenticationError("Authentication session has been invalidated. Please log in again.")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user


async def get_current_tenant_id(
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_tenant_id: Optional[str] = Header(default=None, alias="X-Tenant-ID"),
) -> str:
    """
    Resolves the active tenant boundary.
    - If user is authenticated: Strictly bound to user's tenant_id (prevents client header spoofing).
      (Platform Admin can use X-Tenant-ID for cross-tenant operations).
    - If unauthenticated / test fallback: Uses X-Tenant-ID or DEFAULT_TENANT_ID.
    """
    if current_user:
        if current_user.role == Role.PLATFORM_ADMIN.value and x_tenant_id:
            return x_tenant_id
        return current_user.tenant_id
    
    return x_tenant_id or DEFAULT_TENANT_ID


def require_permission(required_permission: Permission) -> Callable:
    """
    Dependency factory that checks if current user has the required permission.
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if not has_permission(current_user.role, required_permission):
            raise PermissionDeniedError(
                f"Role '{current_user.role}' lacks required permission '{required_permission.value}'."
            )
        return current_user

    return permission_checker


def require_role(allowed_roles: List[Role]) -> Callable:
    """
    Dependency factory that checks if current user has one of the allowed roles.
    """
    allowed_values = [r.value for r in allowed_roles]

    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_values:
            raise PermissionDeniedError(
                f"Role '{current_user.role}' is not authorized. Required one of: {allowed_values}."
            )
        return current_user

    return role_checker
