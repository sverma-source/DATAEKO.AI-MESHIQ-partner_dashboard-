from typing import List, Optional
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
    SECURE_COOKIES: bool = False  # Set to True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"  # "strict" in production, "lax" for dev cross-origin
    
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


settings = Settings()
