import os
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import select

from app.api.deps import DEFAULT_TENANT_ID
from app.config import Settings
from app.core.database import AsyncSessionLocal, engine
from app.core.rbac import Role
from app.core.security import verify_password
from app.main import lifespan, app
from app.models.base import Base
from app.models.tenant import Tenant
from app.models.user import User
from scripts.bootstrap_admin import (
    bootstrap_user,
    parse_args,
    validate_password_strength,
    main_async,
)


@pytest.mark.asyncio
async def test_production_lifespan_does_not_mutate_schema_or_seed_users():
    """Verify that in production mode, startup does NOT call create_all and does NOT seed users."""
    with patch("app.main.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "production"

        mock_engine = AsyncMock()
        with patch("app.main.engine", mock_engine), \
             patch("app.main.AsyncSessionLocal") as mock_session_factory:

            # Execute lifespan context
            async with lifespan(app):
                pass

            # No schema creation or session query / user seeding should have occurred in production
            mock_session_factory.assert_not_called()
            mock_engine.begin.assert_not_called()
            mock_engine.dispose.assert_awaited_once()


@pytest.mark.asyncio
async def test_development_lifespan_initializes_schema_and_seeds_dev_users():
    """Verify that in development mode, startup initializes schema and seeds default users."""
    with patch("app.main.settings") as mock_settings:
        mock_settings.ENVIRONMENT = "development"

        # Execute lifespan
        async with lifespan(app):
            pass

        # Verify consultant and admin exist in DB
        async with AsyncSessionLocal() as session:
            consultant = (await session.execute(
                select(User).where(User.email == "consultant@dataeko.ai")
            )).scalar_one_or_none()
            assert consultant is not None
            assert consultant.role == Role.CONSULTANT.value
            assert verify_password("Consultant123!", consultant.hashed_password)

            admin = (await session.execute(
                select(User).where(User.email == "admin@dataeko.ai")
            )).scalar_one_or_none()
            assert admin is not None
            assert admin.role == Role.PLATFORM_ADMIN.value
            assert verify_password("AdminPass123!", admin.hashed_password)


# Bootstrap CLI Tests
def test_password_strength_validation():
    # Passwords under 12 characters should fail
    with pytest.raises(ValueError, match="Password must be at least 12 characters"):
        validate_password_strength("Short123!")

    # Low entropy passwords should fail
    with pytest.raises(ValueError, match="insufficient character variety"):
        validate_password_strength("aaaaaaaaaaaaaaaaaaaa")

    # Recognized placeholder passwords should fail
    with pytest.raises(ValueError, match="recognized weak or default placeholder"):
        validate_password_strength("adminpass123!")

    # Valid strong password should succeed
    validate_password_strength("SuperSecretStrongAdminPass2026!")


@pytest.mark.asyncio
async def test_bootstrap_admin_creates_user_with_bcrypt_hash():
    """Verify bootstrap_user creates a new user, hashes password, and creates tenant if needed."""
    unique_suffix = uuid.uuid4().hex[:8]
    test_email = f"bootstrap_admin_{unique_suffix}@enterprise.com"
    test_pass = "EnterpriseAdminPass2026!#"

    user = await bootstrap_user(
        email=test_email,
        password=test_pass,
        full_name="Enterprise Admin Officer",
        role=Role.PLATFORM_ADMIN.value,
        tenant_id=DEFAULT_TENANT_ID,
        tenant_name="Primary Organization",
        tenant_slug="default-org",
    )

    assert user.id is not None
    assert user.email == test_email
    assert user.full_name == "Enterprise Admin Officer"
    assert user.role == Role.PLATFORM_ADMIN.value
    assert user.tenant_id == DEFAULT_TENANT_ID
    assert user.is_active is True

    # Password must be hashed with bcrypt and verifiable
    assert user.hashed_password != test_pass
    assert user.hashed_password.startswith("$2b$") or user.hashed_password.startswith("$2a$")
    assert verify_password(test_pass, user.hashed_password)


@pytest.mark.asyncio
async def test_bootstrap_admin_rejects_duplicate_email():
    """Verify bootstrap_user aborts if user already exists."""
    unique_suffix = uuid.uuid4().hex[:8]
    test_email = f"dup_admin_{unique_suffix}@enterprise.com"
    test_pass = "EnterpriseAdminPass2026!#"

    # First creation
    await bootstrap_user(
        email=test_email,
        password=test_pass,
        full_name="Admin One",
        role=Role.PLATFORM_ADMIN.value,
        tenant_id=DEFAULT_TENANT_ID,
        tenant_name="Primary Organization",
        tenant_slug="default-org",
    )

    # Second creation with same email must fail
    with pytest.raises(ValueError, match="already exists"):
        await bootstrap_user(
            email=test_email,
            password=test_pass,
            full_name="Admin Two",
            role=Role.PLATFORM_ADMIN.value,
            tenant_id=DEFAULT_TENANT_ID,
            tenant_name="Primary Organization",
            tenant_slug="default-org",
        )


@pytest.mark.asyncio
async def test_bootstrap_admin_main_async_non_interactive():
    """Test CLI runner main_async in non-interactive mode via environment variable."""
    unique_suffix = uuid.uuid4().hex[:8]
    test_email = f"cli_admin_{unique_suffix}@enterprise.com"
    test_pass = "EnterpriseAdminPass2026!#"

    args = parse_args([
        "--email", test_email,
        "--full-name", "CLI Admin",
        "--role", "PLATFORM_ADMIN",
        "--non-interactive",
    ])

    with patch.dict(os.environ, {"BOOTSTRAP_ADMIN_PASSWORD": test_pass}):
        exit_code = await main_async(args)
        assert exit_code == 0

    # Verify user was created in database
    async with AsyncSessionLocal() as session:
        user = (await session.execute(
            select(User).where(User.email == test_email)
        )).scalar_one_or_none()
        assert user is not None
        assert user.full_name == "CLI Admin"
        assert verify_password(test_pass, user.hashed_password)
