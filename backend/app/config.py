from typing import List, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "DATAEKO × meshIQ Partner Dashboard"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database URL: Supports PostgreSQL (asyncpg) or SQLite (aiosqlite)
    DATABASE_URL: str = "sqlite+aiosqlite:///./meshiq_partner.db"
    
    # Authentication & Security
    SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-dataeko-meshiq-2026"
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

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            insecure_defaults = {
                "dev-insecure-secret-key-change-in-production-dataeko-meshiq-2026",
                "secret",
                "change-me",
                "changethis",
                "default",
                "",
            }
            if self.SECRET_KEY in insecure_defaults or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "Production configuration error: Insecure or default SECRET_KEY detected. "
                    "A strong secret key (at least 32 characters) must be supplied via the SECRET_KEY environment variable."
                )
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError(
                    "Production configuration error: SQLite is not permitted in production. "
                    "A valid PostgreSQL connection string (postgresql+asyncpg://...) must be supplied via the DATABASE_URL environment variable."
                )
            if self.DEBUG is True:
                raise ValueError(
                    "Production configuration error: DEBUG mode must be False in production."
                )
        return self


settings = Settings()
