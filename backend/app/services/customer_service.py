from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import EntityNotFoundError
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerService:
    @staticmethod
    async def create_customer(
        db: AsyncSession, tenant_id: str, payload: CustomerCreate
    ) -> Customer:
        customer = Customer(
            tenant_id=payload.tenant_id or tenant_id,
            name=payload.name,
            industry=payload.industry,
            primary_contact_name=payload.primary_contact_name,
            primary_contact_email=payload.primary_contact_email,
            notes=payload.notes,
        )
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        return customer

    @staticmethod
    async def get_customer(
        db: AsyncSession, tenant_id: str, customer_id: str
    ) -> Customer:
        stmt = select(Customer).where(
            Customer.id == customer_id, Customer.tenant_id == tenant_id
        )
        result = await db.execute(stmt)
        customer = result.scalar_one_or_none()
        if not customer:
            raise EntityNotFoundError("Customer", customer_id)
        return customer

    @staticmethod
    async def list_customers(
        db: AsyncSession, tenant_id: str, skip: int = 0, limit: int = 100
    ) -> List[Customer]:
        stmt = (
            select(Customer)
            .where(Customer.tenant_id == tenant_id)
            .order_by(Customer.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update_customer(
        db: AsyncSession, tenant_id: str, customer_id: str, payload: CustomerUpdate
    ) -> Customer:
        customer = await CustomerService.get_customer(db, tenant_id, customer_id)
        update_data = payload.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(customer, key, value)
        await db.commit()
        await db.refresh(customer)
        return customer

    @staticmethod
    async def delete_customer(
        db: AsyncSession, tenant_id: str, customer_id: str
    ) -> None:
        customer = await CustomerService.get_customer(db, tenant_id, customer_id)
        await db.delete(customer)
        await db.commit()
