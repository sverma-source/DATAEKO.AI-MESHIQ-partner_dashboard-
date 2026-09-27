import pytest
from app.config import Settings


def test_production_fails_closed_on_insecure_secret():
    with pytest.raises(ValueError, match="Insecure or default SECRET_KEY detected"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="dev-insecure-secret-key-change-in-production-dataeko-meshiq-2026",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=False,
        )


def test_production_fails_closed_on_sqlite():
    with pytest.raises(ValueError, match="SQLite is not permitted in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="sqlite+aiosqlite:///./meshiq.db",
            DEBUG=False,
        )


def test_production_fails_closed_on_debug_mode():
    with pytest.raises(ValueError, match="DEBUG mode must be False in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=True,
        )


def test_production_valid_configuration_succeeds():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
        DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
        DEBUG=False,
        SECURE_COOKIES=True,
        COOKIE_SAMESITE="strict",
    )
    assert settings.ENVIRONMENT == "production"
    assert settings.DEBUG is False
    assert settings.SECURE_COOKIES is True
    assert settings.COOKIE_SAMESITE == "strict"
