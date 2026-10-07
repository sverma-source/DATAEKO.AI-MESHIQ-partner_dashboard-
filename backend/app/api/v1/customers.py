from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import (
    get_current_tenant_id,
    get_current_user_optional,
    get_db,
    require_permission,
    require_role,
)
from app.core.audit import log_audit_event
from app.core.errors import EntityNotFoundError, PermissionDeniedError
from app.core.rbac import Permission, Role
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services.customer_service import CustomerService

router = APIRouter()


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Customer",
)
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(require_permission(Permission.CUSTOMER_CREATE)),
):
    customer = await CustomerService.create_customer(db, tenant_id, payload)
    await log_audit_event(
        session=db,
        event_type="CUSTOMER_CREATED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
        resource_type="Customer",
        resource_id=customer.id,
        status="SUCCESS",
        details={"name": customer.name, "industry": customer.industry},
    )
    await db.commit()
    return customer


@router.get(
    "",
    response_model=List[CustomerResponse],
    summary="List Customers for current Tenant",
)
async def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    # Enforce customer scoping for CUSTOMER_USER and CUSTOMER_ADMIN: only return authorized assigned organization
    if current_user and current_user.role in (Role.CUSTOMER_USER.value, Role.CUSTOMER_ADMIN.value):
        if not current_user.customer_id:
            return []
        try:
            customer = await CustomerService.get_customer(db, tenant_id, current_user.customer_id)
            return [customer]
        except EntityNotFoundError:
            return []
    return await CustomerService.list_customers(db, tenant_id, skip=skip, limit=limit)


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Get Customer by ID",
)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    # Enforce boundary: CUSTOMER_USER and CUSTOMER_ADMIN cannot retrieve unauthorized customer organizations
    if current_user and current_user.role in (Role.CUSTOMER_USER.value, Role.CUSTOMER_ADMIN.value):
        if not current_user.customer_id or customer_id != current_user.customer_id:
            raise PermissionDeniedError("Access to this customer organization is forbidden.")
    return await CustomerService.get_customer(db, tenant_id, customer_id)


@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Update Customer by ID",
)
async def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(require_permission(Permission.CUSTOMER_UPDATE)),
):
    if current_user.role == Role.CUSTOMER_ADMIN.value:
        if not current_user.customer_id or customer_id != current_user.customer_id:
            raise PermissionDeniedError("Access to this customer organization is forbidden.")
    customer = await CustomerService.update_customer(db, tenant_id, customer_id, payload)
    await log_audit_event(
        session=db,
        event_type="CUSTOMER_UPDATED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
        resource_type="Customer",
        resource_id=customer.id,
        status="SUCCESS",
        details={"name": customer.name},
    )
    await db.commit()
    return customer


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Customer by ID",
)
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
    current_user: User = Depends(require_role([Role.PLATFORM_ADMIN, Role.PARTNER_ADMIN])),
):
    await CustomerService.delete_customer(db, tenant_id, customer_id)
    await log_audit_event(
        session=db,
        event_type="CUSTOMER_DELETED",
        tenant_id=tenant_id,
        user_id=current_user.id if current_user else None,
        resource_type="Customer",
        resource_id=customer_id,
        status="SUCCESS",
    )
    await db.commit()
