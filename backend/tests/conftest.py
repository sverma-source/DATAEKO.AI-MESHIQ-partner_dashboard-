import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.api.deps import DEFAULT_TENANT_ID, get_db
from app.core.rbac import Role
from app.core.security import get_password_hash
from app.main import app
from app.models.base import Base
from app.models.tenant import Tenant
from app.models.user import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine: AsyncEngine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a clean in-memory database session for each test function."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        # Seed default tenant
        default_tenant = Tenant(
            id=DEFAULT_TENANT_ID,
            name="Primary Organization (DATAEKO / meshIQ)",
            slug="default-org",
        )
        session.add(default_tenant)

        # Seed default users
        consultant_user = User(
            id="00000000-0000-0000-0000-000000000002",
            email="consultant@dataeko.ai",
            hashed_password=get_password_hash("Consultant123!"),
            full_name="Lead MQ Consultant",
            role=Role.CONSULTANT.value,
            tenant_id=DEFAULT_TENANT_ID,
            is_active=True,
        )
        session.add(consultant_user)

        admin_user = User(
            id="00000000-0000-0000-0000-000000000003",
            email="admin@dataeko.ai",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="Platform Admin",
            role=Role.PLATFORM_ADMIN.value,
            tenant_id=DEFAULT_TENANT_ID,
            is_active=True,
        )
        session.add(admin_user)

        await session.commit()

        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


from app.core.security import create_access_token


@pytest.fixture(scope="function")
def auth_headers() -> dict:
    """Provides Authorization headers for default CONSULTANT user."""
    token = create_access_token(
        subject="00000000-0000-0000-0000-000000000002",
        tenant_id=DEFAULT_TENANT_ID,
        role=Role.CONSULTANT.value,
        email="consultant@dataeko.ai",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def admin_auth_headers() -> dict:
    """Provides Authorization headers for default PLATFORM_ADMIN user."""
    token = create_access_token(
        subject="00000000-0000-0000-0000-000000000003",
        tenant_id=DEFAULT_TENANT_ID,
        role=Role.PLATFORM_ADMIN.value,
        email="admin@dataeko.ai",
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an AsyncClient for FastAPI endpoint testing with DB dependency overridden."""
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as ac:
        yield ac

    app.dependency_overrides.clear()
