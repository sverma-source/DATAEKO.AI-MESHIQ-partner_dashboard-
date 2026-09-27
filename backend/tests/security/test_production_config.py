import pytest
from app.config import Settings, is_placeholder_or_low_entropy_secret


# 1. Environment Canonical Validation
def test_environment_validation_accepts_canonical():
    for env in ["development", "test"]:
        s = Settings(ENVIRONMENT=env)
        assert s.ENVIRONMENT == env


def test_environment_validation_rejects_unknown():
    with pytest.raises(ValueError, match="Invalid ENVIRONMENT 'staging'"):
        Settings(ENVIRONMENT="staging")


# 2. Production JWT / Secret Validation
def test_production_fails_closed_on_insecure_secret():
    for bad_secret in [
        "dev-insecure-secret-key-change-in-production-dataeko-meshiq-2026",
        "secret",
        "changeme",
        "change-me",
        "your-secret",
        "short-secret-12345",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",  # Low entropy
    ]:
        with pytest.raises(ValueError, match="Insecure, missing, or default JWT secret key detected"):
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY=bad_secret,
                DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
                DEBUG=False,
                CORS_ORIGINS=["https://meshiq.dataeko.ai"],
            )


def test_production_accepts_jwt_secret_override():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="placeholder_that_would_fail",
        JWT_SECRET="strong-production-entropy-key-9284718937128937192837",
        DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
        DEBUG=False,
        CORS_ORIGINS=["https://meshiq.dataeko.ai"],
    )
    assert settings.effective_secret_key == "strong-production-entropy-key-9284718937128937192837"


# 3. Production Database URL Validation
def test_production_fails_closed_on_sqlite():
    with pytest.raises(ValueError, match="SQLite or empty database URL is not permitted in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="sqlite+aiosqlite:///./meshiq.db",
            DEBUG=False,
            CORS_ORIGINS=["https://meshiq.dataeko.ai"],
        )


def test_production_fails_closed_on_non_postgres_url():
    with pytest.raises(ValueError, match="DATABASE_URL must be a valid PostgreSQL connection string"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="mysql://user:pass@localhost:3306/db",
            DEBUG=False,
            CORS_ORIGINS=["https://meshiq.dataeko.ai"],
        )


# 4. Production Debug & Cookie Security Validation
def test_production_fails_closed_on_debug_mode():
    with pytest.raises(ValueError, match="DEBUG mode must be False in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=True,
            CORS_ORIGINS=["https://meshiq.dataeko.ai"],
        )


def test_production_fails_closed_on_insecure_cookies():
    with pytest.raises(ValueError, match="SECURE_COOKIES must be True in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=False,
            SECURE_COOKIES=False,
            CORS_ORIGINS=["https://meshiq.dataeko.ai"],
        )

    with pytest.raises(ValueError, match="COOKIE_SAMESITE must be 'strict' in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=False,
            SECURE_COOKIES=True,
            COOKIE_SAMESITE="lax",
            CORS_ORIGINS=["https://meshiq.dataeko.ai"],
        )


# 5. Production CORS Validation
def test_production_fails_closed_on_wildcard_cors():
    with pytest.raises(ValueError, match="Wildcard '\\*' CORS origin is forbidden in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=False,
            CORS_ORIGINS=["*"],
        )


def test_production_fails_closed_on_empty_cors():
    with pytest.raises(ValueError, match="CORS_ORIGINS cannot be empty in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=False,
            CORS_ORIGINS=[],
        )


def test_production_fails_closed_on_malformed_cors_origin():
    with pytest.raises(ValueError, match="Invalid CORS origin 'meshiq.dataeko.ai'"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long",
            DATABASE_URL="postgresql+asyncpg://user:pass@db:5432/meshiq",
            DEBUG=False,
            CORS_ORIGINS=["meshiq.dataeko.ai"],  # Missing http:// or https://
        )


# 6. Valid Production Configuration & Diagnostics
def test_production_valid_configuration_succeeds():
    settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long-1234",
        DATABASE_URL="postgresql+asyncpg://meshiq_user:super_secret_pw@db:5432/meshiq",
        DEBUG=False,
        SECURE_COOKIES=True,
        COOKIE_SAMESITE="strict",
        CORS_ORIGINS=["https://app.dataeko.ai", "https://meshiq.dataeko.ai"],
    )
    assert settings.ENVIRONMENT == "production"
    assert settings.DEBUG is False
    assert settings.SECURE_COOKIES is True
    assert settings.COOKIE_SAMESITE == "strict"
    assert len(settings.CORS_ORIGINS) == 2

    # Verify safe diagnostics do not expose secrets
    diagnostics = settings.get_safe_diagnostics()
    assert diagnostics["environment"] == "production"
    assert diagnostics["debug"] is False
    assert diagnostics["database_driver"] == "postgresql+asyncpg"
    assert diagnostics["auth_secret_configured"] is True
    assert diagnostics["secure_cookies"] is True
    assert diagnostics["cookie_samesite"] == "strict"
    assert diagnostics["rate_limit_enabled"] is True
    assert diagnostics["rate_limit_login_per_minute"] == 5
    assert "super_secret_pw" not in str(diagnostics)
    assert "a-very-secure-production" not in str(diagnostics)


# 7. Production Rate Limiting & Resource Protection Validation
def test_production_fails_closed_when_rate_limiting_disabled():
    with pytest.raises(ValueError, match="RATE_LIMIT_ENABLED must be True in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long-1234",
            DATABASE_URL="postgresql+asyncpg://meshiq_user:super_secret_pw@db:5432/meshiq",
            DEBUG=False,
            CORS_ORIGINS=["https://meshiq.dataeko.ai"],
            RATE_LIMIT_ENABLED=False,
        )


def test_production_fails_closed_on_invalid_login_rate_limit():
    for bad_limit in [0, -5, 31, 100]:
        with pytest.raises(ValueError, match="RATE_LIMIT_LOGIN_PER_MINUTE must be between 1 and 30"):
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long-1234",
                DATABASE_URL="postgresql+asyncpg://meshiq_user:super_secret_pw@db:5432/meshiq",
                DEBUG=False,
                CORS_ORIGINS=["https://meshiq.dataeko.ai"],
                RATE_LIMIT_LOGIN_PER_MINUTE=bad_limit,
            )


def test_production_fails_closed_on_excessive_request_body_size():
    with pytest.raises(ValueError, match="MAX_REQUEST_BODY_BYTES cannot exceed 10MB"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long-1234",
            DATABASE_URL="postgresql+asyncpg://meshiq_user:super_secret_pw@db:5432/meshiq",
            DEBUG=False,
            CORS_ORIGINS=["https://meshiq.dataeko.ai"],
            MAX_REQUEST_BODY_BYTES=20 * 1024 * 1024,
        )


def test_production_fails_closed_on_broad_trusted_proxies():
    for broad_net in ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]:
        with pytest.raises(ValueError, match="Broad private network.*is too wide for trusted proxies"):
            Settings(
                ENVIRONMENT="production",
                SECRET_KEY="a-very-secure-production-random-secret-key-at-least-32-chars-long-1234",
                DATABASE_URL="postgresql+asyncpg://meshiq_user:super_secret_pw@db:5432/meshiq",
                DEBUG=False,
                CORS_ORIGINS=["https://meshiq.dataeko.ai"],
                TRUSTED_PROXY_IPS=[broad_net],
            )


def test_trusted_proxy_fails_closed_on_wildcard_or_malformed():
    with pytest.raises(ValueError, match="Wildcard '\\*' is forbidden for TRUSTED_PROXY_IPS"):
        Settings(TRUSTED_PROXY_IPS=["*"])

    with pytest.raises(ValueError, match="Invalid IP address or CIDR network 'invalid.ip.string'"):
        Settings(TRUSTED_PROXY_IPS=["invalid.ip.string"])


