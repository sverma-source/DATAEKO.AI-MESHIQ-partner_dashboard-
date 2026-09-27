import re
from typing import Any, Dict, List, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SUPPORTED_ENVIRONMENTS = {"development", "test", "production"}

INSECURE_PLACEHOLDER_SECRETS = {
    "dev-insecure-secret-key-change-in-production-dataeko-meshiq-2026",
    "dev_jwt_secret_key_change_in_production_32char_minimum_",
    "secret",
    "change-me",
    "changeme",
    "changethis",
    "default",
    "your-secret",
    "example",
    "password",
    "test-secret",
    "admin",
    "12345678",
    "placeholder",
}


def is_placeholder_or_low_entropy_secret(secret: str) -> bool:
    """Detect known placeholder secrets, insufficient length, or trivial repetition."""
    if not secret or len(secret) < 32:
        return True
    
    cleaned = secret.strip().lower()
    if cleaned in INSECURE_PLACEHOLDER_SECRETS:
        return True
    
    # Check for simple repetitive patterns (e.g. "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    if len(set(secret)) < 4:
        return True
        
    return False


class Settings(BaseSettings):
    PROJECT_NAME: str = "DATAEKO × meshIQ Partner Dashboard"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database URL: Supports PostgreSQL (asyncpg) or SQLite (aiosqlite)
    DATABASE_URL: str = "sqlite+aiosqlite:///./meshiq_partner.db"
    
    # Authentication & Security
    SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-dataeko-meshiq-2026"
    JWT_SECRET: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    SECURE_COOKIES: bool = True  # Enforce Secure flag on cookies
    COOKIE_SAMESITE: str = "strict"  # Enforce SameSite=Strict on cookies
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Calculation engine versioning
    CALCULATION_ENGINE_VERSION: str = "3.0.0"
    DEFAULT_ASSESSMENT_VERSION: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def effective_secret_key(self) -> str:
        """Returns JWT_SECRET if explicitly set and non-empty, otherwise SECRET_KEY."""
        if self.JWT_SECRET and self.JWT_SECRET.strip():
            return self.JWT_SECRET.strip()
        return self.SECRET_KEY

    @model_validator(mode="after")
    def validate_environment_and_production_settings(self) -> "Settings":
        # 1. Environment canonical validation
        if self.ENVIRONMENT not in SUPPORTED_ENVIRONMENTS:
            raise ValueError(
                f"Invalid ENVIRONMENT '{self.ENVIRONMENT}'. "
                f"Supported environments are: {', '.join(sorted(SUPPORTED_ENVIRONMENTS))}."
            )

        # 2. Production fail-closed validation
        if self.ENVIRONMENT == "production":
            # A. Authentication & Secret Key
            effective_key = self.effective_secret_key
            if is_placeholder_or_low_entropy_secret(effective_key):
                raise ValueError(
                    "Production configuration error: Insecure, missing, or default JWT secret key detected. "
                    "A strong secret key (at least 32 characters with sufficient entropy) must be supplied via SECRET_KEY or JWT_SECRET."
                )

            # B. Database URL Validation
            if not self.DATABASE_URL or self.DATABASE_URL.startswith("sqlite"):
                raise ValueError(
                    "Production configuration error: SQLite or empty database URL is not permitted in production. "
                    "A valid PostgreSQL connection string (postgresql+asyncpg://...) must be supplied via DATABASE_URL."
                )
            if not (self.DATABASE_URL.startswith("postgresql+asyncpg://") or self.DATABASE_URL.startswith("postgresql://")):
                raise ValueError(
                    "Production configuration error: DATABASE_URL must be a valid PostgreSQL connection string."
                )

            # C. Debug Mode
            if self.DEBUG is True:
                raise ValueError(
                    "Production configuration error: DEBUG mode must be False in production."
                )

            # D. Cookie Security Attributes
            if not self.SECURE_COOKIES:
                raise ValueError(
                    "Production configuration error: SECURE_COOKIES must be True in production."
                )
            if self.COOKIE_SAMESITE.lower() != "strict":
                raise ValueError(
                    "Production configuration error: COOKIE_SAMESITE must be 'strict' in production."
                )

            # E. CORS Validation
            if not self.CORS_ORIGINS:
                raise ValueError(
                    "Production configuration error: CORS_ORIGINS cannot be empty in production."
                )
            if "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "Production configuration error: Wildcard '*' CORS origin is forbidden in production with credentials."
                )
            for origin in self.CORS_ORIGINS:
                if not origin.startswith("http://") and not origin.startswith("https://"):
                    raise ValueError(
                        f"Production configuration error: Invalid CORS origin '{origin}'. Origins must start with http:// or https://."
                    )

        return self

    def get_safe_diagnostics(self) -> Dict[str, Any]:
        """
        Provides safe configuration diagnostics for operators and test harnesses
        without exposing passwords, JWT secrets, database connection strings, or cookies.
        """
        driver = "unknown"
        if "asyncpg" in self.DATABASE_URL:
            driver = "postgresql+asyncpg"
        elif "sqlite" in self.DATABASE_URL:
            driver = "sqlite+aiosqlite"
        elif "postgresql" in self.DATABASE_URL:
            driver = "postgresql"

        return {
            "environment": self.ENVIRONMENT,
            "debug": self.DEBUG,
            "database_driver": driver,
            "auth_secret_configured": bool(self.effective_secret_key and len(self.effective_secret_key) >= 32),
            "secure_cookies": self.SECURE_COOKIES,
            "cookie_samesite": self.COOKIE_SAMESITE,
            "cors_origins_count": len(self.CORS_ORIGINS),
            "cors_origins": [re.sub(r"://.*@", "://", o) for o in self.CORS_ORIGINS],
            "calculation_engine_version": self.CALCULATION_ENGINE_VERSION,
        }


settings = Settings()

