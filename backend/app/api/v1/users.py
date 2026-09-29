from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_tenant_id, get_current_user, get_db
from app.core.audit import log_audit_event
from app.core.errors import EntityNotFoundError, PermissionDeniedError
from app.core.rbac import Role
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get(
    "",
    response_model=List[UserResponse],
    summary="List users in current authorized tenant/scope",
)
async def list_users(
    search: Optional[str] = Query(default=None, description="Filter by name or email"),
    role: Optional[str] = Query(default=None, description="Filter by role"),
    is_active: Optional[bool] = Query(default=None, description="Filter by active status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve users within the administrator's authorized tenant scope.
    Restricted to PLATFORM_ADMIN, PARTNER_ADMIN, and CUSTOMER_ADMIN.
    Non-admin roles (CUSTOMER_USER, CONSULTANT) receive 403 Forbidden.
    """
    if current_user.role in [Role.CUSTOMER_USER.value, Role.CONSULTANT.value]:
        raise PermissionDeniedError("You do not have permission to view the user directory.")

    stmt = select(User).where(User.tenant_id == tenant_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
            )
        )
    if role:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    stmt = stmt.order_by(desc(User.created_at)).offset(skip).limit(limit)
    res = await db.execute(stmt)
    users = res.scalars().all()

    return [UserResponse.model_validate(u) for u in users]


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision a new user account",
)
async def create_user(
    payload: UserCreate,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Provision a user with role hierarchy enforcement and bcrypt password hashing.
    """
    # 1. Check actor role authority
    if current_user.role in [Role.CUSTOMER_USER.value, Role.CONSULTANT.value]:
        raise PermissionDeniedError("You do not have permission to provision users.")

    if current_user.role == Role.CUSTOMER_ADMIN.value:
        raise PermissionDeniedError("CUSTOMER_ADMIN user mutation is restricted until organization scoping is configured.")

    # 2. Validate requested role against canonical roles
    if payload.role not in Role.__members__:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role '{payload.role}'. Must be one of: {list(Role.__members__.keys())}",
        )

    # 3. Prevent privilege escalation
    if current_user.role == Role.PARTNER_ADMIN.value:
        if payload.role == Role.PLATFORM_ADMIN.value:
            raise PermissionDeniedError("PARTNER_ADMIN cannot assign PLATFORM_ADMIN role.")

    # 4. Determine target tenant
    if current_user.role == Role.PLATFORM_ADMIN.value:
        target_tenant_id = payload.tenant_id or tenant_id
    else:
        target_tenant_id = current_user.tenant_id

    # 5. Check for duplicate email
    email_check_stmt = select(User).where(User.email == payload.email.strip().lower())
    existing_user = (await db.execute(email_check_stmt)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # 6. Password validation
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters in length.",
        )

    # 7. Create new user entity with bcrypt hashed password
    new_user = User(
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role,
        tenant_id=target_tenant_id,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)

    # 8. Append-only audit logging
    await log_audit_event(
        session=db,
        event_type="USER_CREATED",
        tenant_id=target_tenant_id,
        user_id=current_user.id,
        resource_type="User",
        resource_id=new_user.id,
        status="SUCCESS",
        details={
            "email": new_user.email,
            "role": new_user.role,
            "full_name": new_user.full_name,
        },
    )
    await db.commit()

    return UserResponse.model_validate(new_user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user profile, status, or role",
)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user attributes (is_active, full_name, role) with strict role hierarchy and audit trail.
    """
    # 1. Check actor role authority
    if current_user.role in [Role.CUSTOMER_USER.value, Role.CONSULTANT.value]:
        raise PermissionDeniedError("You do not have permission to update users.")

    if current_user.role == Role.CUSTOMER_ADMIN.value:
        raise PermissionDeniedError("CUSTOMER_ADMIN user mutation is restricted until organization scoping is configured.")

    # 2. Fetch target user within administrator's tenant
    stmt = select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    res = await db.execute(stmt)
    target_user = res.scalar_one_or_none()

    if not target_user:
        raise EntityNotFoundError("User", user_id)

    # 3. Privilege escalation and cross-admin guardrails
    if current_user.role == Role.PARTNER_ADMIN.value:
        if target_user.role == Role.PLATFORM_ADMIN.value:
            raise PermissionDeniedError("PARTNER_ADMIN cannot modify PLATFORM_ADMIN users.")
        if payload.role and payload.role == Role.PLATFORM_ADMIN.value:
            raise PermissionDeniedError("PARTNER_ADMIN cannot assign PLATFORM_ADMIN role.")

    # 4. Apply updates and record granular audit events
    updated_fields = []

    if payload.full_name is not None and payload.full_name.strip() != target_user.full_name:
        target_user.full_name = payload.full_name.strip()
        updated_fields.append("full_name")

    if payload.role is not None and payload.role != target_user.role:
        if payload.role not in Role.__members__:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid role '{payload.role}'.",
            )
        old_role = target_user.role
        target_user.role = payload.role
        updated_fields.append("role")
        await log_audit_event(
            session=db,
            event_type="USER_ROLE_CHANGED",
            tenant_id=target_user.tenant_id,
            user_id=current_user.id,
            resource_type="User",
            resource_id=target_user.id,
            status="SUCCESS",
            details={"email": target_user.email, "old_role": old_role, "new_role": target_user.role},
        )

    if payload.is_active is not None and payload.is_active != target_user.is_active:
        target_user.is_active = payload.is_active
        updated_fields.append("is_active")
        event_name = "USER_ACTIVATED" if target_user.is_active else "USER_DEACTIVATED"
        await log_audit_event(
            session=db,
            event_type=event_name,
            tenant_id=target_user.tenant_id,
            user_id=current_user.id,
            resource_type="User",
            resource_id=target_user.id,
            status="SUCCESS",
            details={"email": target_user.email, "is_active": target_user.is_active},
        )

    if updated_fields:
        await log_audit_event(
            session=db,
            event_type="USER_UPDATED",
            tenant_id=target_user.tenant_id,
            user_id=current_user.id,
            resource_type="User",
            resource_id=target_user.id,
            status="SUCCESS",
            details={"updated_fields": updated_fields},
        )
        await db.commit()
        await db.refresh(target_user)

    return UserResponse.model_validate(target_user)
