import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.customer import Customer
from app.models.assessment import Assessment


@pytest.mark.asyncio
async def test_transaction_rollback_on_failed_assessment_creation(
    client: AsyncClient, db_session: AsyncSession, auth_headers: dict
):
    # Attempting to create an assessment for non-existent customer must fail cleanly without persisting partial rows
    res = await client.post(
        "/api/v1/assessments",
        json={
            "customer_id": "00000000-0000-0000-0000-000000000999",
            "title": "Should Not Exist",
        },
        headers=auth_headers,
    )
    assert res.status_code == 404

    # Verify no rogue assessment was saved in database
    stmt = select(Assessment).where(Assessment.title == "Should Not Exist")
    result = await db_session.execute(stmt)
    assert result.scalar_one_or_none() is None
