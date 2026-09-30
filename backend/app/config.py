import ipaddress
import re
from typing import Any, Dict, List, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SUPPORTED_ENVIRONMENTS = {"development", "test", "production"}
SUPPORTED_EMAIL_DISTRIBUTION_MODES = {"disabled", "test", "production"}
SUPPORTED_EMAIL_TRANSPORT_TYPES = {"smtp", "gmail_api", "in_memory"}

BROAD_PRIVATE_NETWORKS = {
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
}

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


def validate_ip_or_cidr(entry: str) -> ipaddress.IPv4Network | ipaddress.IPv6Network:
    """Validates and parses an IP address or CIDR string."""
    cleaned = entry.strip()
    if not cleaned:
        raise ValueError("Trusted proxy entry cannot be empty.")
    if cleaned == "*":
        raise ValueError("Wildcard '*' is forbidden for TRUSTED_PROXY_IPS.")
    try:
        return ipaddress.ip_network(cleaned, strict=False)
    except ValueError as exc:
        raise ValueError(f"Invalid IP address or CIDR network '{cleaned}': {exc}") from exc


class Settings(BaseSettings):
    PROJECT_NAME: str = "DATAEKO × meshIQ Partner Dashboard"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database URL: Supports PostgreSQL (asyncpg) or SQLite (aiosqlite)
    DATABASE_URL: str = "sqlite+aiosqlite:///./meshiq_partner.db"
    
    # Database Connection Pool Configuration
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    
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
    CALCULATION_ENGINE_VERSION: str = "1.0.0"
    DEFAULT_ASSESSMENT_VERSION: str = "1.0.0"

    # Rate Limiting & Resource Protection (Configurable Operational Defaults)
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5
    RATE_LIMIT_CALCULATION_PER_MINUTE: int = 10
    RATE_LIMIT_MUTATION_PER_MINUTE: int = 60
    RATE_LIMIT_READ_PER_MINUTE: int = 300

    # Trusted Proxy Resolution (Explicit IPs/CIDRs)
    TRUSTED_PROXY_IPS: List[str] = ["127.0.0.1", "::1"]

    # Maximum Request Payload Size (Defense against payload flooding / memory exhaustion)
    MAX_REQUEST_BODY_BYTES: int = 2 * 1024 * 1024  # 2 MB default

    # Server-Side Email Configuration (Batch 1 Hardening & G1 Gmail API)
    EMAIL_ENABLED: bool = False
    EMAIL_DISTRIBUTION_MODE: str = "test"
    EMAIL_TRANSPORT_TYPE: str = "smtp"
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    EMAIL_FROM_ADDRESS: str = "noreply@dataeko.ai"
    EMAIL_FROM_NAME: str = "DATAEKO × meshIQ Assessment Platform"

    # Google OAuth 2.0 & Gmail API Settings (G1 Foundation)
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REDIRECT_URI: Optional[str] = None
    GMAIL_AUTHORIZED_SENDER: Optional[str] = None
    GMAIL_REFRESH_TOKEN: Optional[str] = None

    # Server-Side Test Distribution Recipients (Dev/Testing placeholders only)
    TEST_RECIPIENT_ROOP: Optional[str] = None
    TEST_RECIPIENT_SUMIT: Optional[str] = None

    # Server-Side Production Distribution Lists (Unconfigured placeholders until production activation batch)
    PROD_DATAEKO_DISTRIBUTION_EMAILS: List[str] = []
    PROD_MESHIQ_DISTRIBUTION_EMAILS: List[str] = []

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

    @field_validator("TRUSTED_PROXY_IPS", mode="before")
    @classmethod
    def parse_trusted_proxies(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("EMAIL_DISTRIBUTION_MODE", mode="before")
    @classmethod
    def parse_distribution_mode(cls, v: Any) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("EMAIL_TRANSPORT_TYPE", mode="before")
    @classmethod
    def parse_transport_type(cls, v: Any) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return "smtp"

    @field_validator("PROD_DATAEKO_DISTRIBUTION_EMAILS", "PROD_MESHIQ_DISTRIBUTION_EMAILS", mode="before")
    @classmethod
    def parse_email_list(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        if isinstance(v, (list, set, tuple)):
            return [str(item).strip() for item in v if str(item).strip()]
        return v

    @model_validator(mode="after")
    def validate_environment_and_production_settings(self) -> "Settings":
        # 1. Environment canonical validation
        if self.ENVIRONMENT not in SUPPORTED_ENVIRONMENTS:
            raise ValueError(
                f"Invalid ENVIRONMENT '{self.ENVIRONMENT}'. "
                f"Supported environments are: {', '.join(sorted(SUPPORTED_ENVIRONMENTS))}."
            )

        # Email distribution mode canonical validation
        if self.EMAIL_DISTRIBUTION_MODE not in SUPPORTED_EMAIL_DISTRIBUTION_MODES:
            raise ValueError(
                f"Invalid EMAIL_DISTRIBUTION_MODE '{self.EMAIL_DISTRIBUTION_MODE}'. "
                f"Supported modes are: {', '.join(sorted(SUPPORTED_EMAIL_DISTRIBUTION_MODES))}."
            )

        # Email transport type canonical validation
        if self.EMAIL_TRANSPORT_TYPE not in SUPPORTED_EMAIL_TRANSPORT_TYPES:
            raise ValueError(
                f"Invalid EMAIL_TRANSPORT_TYPE '{self.EMAIL_TRANSPORT_TYPE}'. "
                f"Supported types are: {', '.join(sorted(SUPPORTED_EMAIL_TRANSPORT_TYPES))}."
            )

        # 2. General validation across all environments
        if self.MAX_REQUEST_BODY_BYTES <= 0:
            raise ValueError("MAX_REQUEST_BODY_BYTES must be greater than 0.")

        if not (1 <= self.RATE_LIMIT_LOGIN_PER_MINUTE <= 30):
            raise ValueError(
                f"RATE_LIMIT_LOGIN_PER_MINUTE must be between 1 and 30 (got {self.RATE_LIMIT_LOGIN_PER_MINUTE})."
            )

        # Database connection pool validation
        if not (1 <= self.DB_POOL_SIZE <= 100):
            raise ValueError(
                f"DB_POOL_SIZE must be between 1 and 100 (got {self.DB_POOL_SIZE})."
            )
        if not (0 <= self.DB_MAX_OVERFLOW <= 100):
            raise ValueError(
                f"DB_MAX_OVERFLOW must be between 0 and 100 (got {self.DB_MAX_OVERFLOW})."
            )
        if not (1 <= self.DB_POOL_TIMEOUT <= 300):
            raise ValueError(
                f"DB_POOL_TIMEOUT must be between 1 and 300 seconds (got {self.DB_POOL_TIMEOUT})."
            )

        # Email configuration validation
        if not (1 <= self.SMTP_PORT <= 65535):
            raise ValueError(f"SMTP_PORT must be between 1 and 65535 (got {self.SMTP_PORT}).")

        if self.EMAIL_ENABLED:
            if self.EMAIL_DISTRIBUTION_MODE != "disabled":
                if self.EMAIL_TRANSPORT_TYPE == "smtp" and (not self.SMTP_HOST or not self.SMTP_HOST.strip()):
                    raise ValueError("SMTP_HOST must be specified when EMAIL_ENABLED is True and EMAIL_TRANSPORT_TYPE is 'smtp'.")
                if not self.EMAIL_FROM_ADDRESS or "@" not in self.EMAIL_FROM_ADDRESS:
                    raise ValueError(f"EMAIL_FROM_ADDRESS must be a valid email address (got '{self.EMAIL_FROM_ADDRESS}').")

            if self.EMAIL_DISTRIBUTION_MODE == "production":
                if not self.PROD_DATAEKO_DISTRIBUTION_EMAILS and not self.PROD_MESHIQ_DISTRIBUTION_EMAILS:
                    raise ValueError(
                        "Production email distribution mode requires configured recipients in "
                        "PROD_DATAEKO_DISTRIBUTION_EMAILS or PROD_MESHIQ_DISTRIBUTION_EMAILS when EMAIL_ENABLED is True."
                    )

        # Validate trusted proxy IP/CIDR syntax
        for proxy_entry in self.TRUSTED_PROXY_IPS:
            validate_ip_or_cidr(proxy_entry)

        # 3. Production fail-closed validation
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

            # F. Rate Limiting & Resource Protection
            if not self.RATE_LIMIT_ENABLED:
                raise ValueError(
                    "Production configuration error: RATE_LIMIT_ENABLED must be True in production."
                )
            if not (1 <= self.RATE_LIMIT_LOGIN_PER_MINUTE <= 30):
                raise ValueError(
                    f"Production configuration error: RATE_LIMIT_LOGIN_PER_MINUTE must be between 1 and 30 in production (got {self.RATE_LIMIT_LOGIN_PER_MINUTE})."
                )
            if self.MAX_REQUEST_BODY_BYTES > 10 * 1024 * 1024:
                raise ValueError(
                    f"Production configuration error: MAX_REQUEST_BODY_BYTES cannot exceed 10MB in production (got {self.MAX_REQUEST_BODY_BYTES})."
                )

            # G. Trusted Proxies in Production
            if not self.TRUSTED_PROXY_IPS:
                raise ValueError(
                    "Production configuration error: TRUSTED_PROXY_IPS cannot be empty in production. "
                    "Specify explicit load balancer / reverse proxy IPs or CIDRs (e.g. ['127.0.0.1', '::1'])."
                )

            for proxy_entry in self.TRUSTED_PROXY_IPS:
                net = validate_ip_or_cidr(proxy_entry)
                if net in BROAD_PRIVATE_NETWORKS:
                    raise ValueError(
                        f"Production configuration error: Broad private network '{proxy_entry}' is too wide for trusted proxies. "
                        "Specify exact reverse proxy IPs or narrow subnet CIDRs."
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
            "db_pool_size": self.DB_POOL_SIZE,
            "db_max_overflow": self.DB_MAX_OVERFLOW,
            "db_pool_timeout": self.DB_POOL_TIMEOUT,
            "auth_secret_configured": bool(self.effective_secret_key and len(self.effective_secret_key) >= 32),
            "secure_cookies": self.SECURE_COOKIES,
            "cookie_samesite": self.COOKIE_SAMESITE,
            "cors_origins_count": len(self.CORS_ORIGINS),
            "cors_origins": [re.sub(r"://.*@", "://", o) for o in self.CORS_ORIGINS],
            "calculation_engine_version": self.CALCULATION_ENGINE_VERSION,
            "rate_limit_enabled": self.RATE_LIMIT_ENABLED,
            "rate_limit_login_per_minute": self.RATE_LIMIT_LOGIN_PER_MINUTE,
            "rate_limit_calculation_per_minute": self.RATE_LIMIT_CALCULATION_PER_MINUTE,
            "trusted_proxy_ips_count": len(self.TRUSTED_PROXY_IPS),
            "max_request_body_bytes": self.MAX_REQUEST_BODY_BYTES,
            "email_enabled": self.EMAIL_ENABLED,
            "email_distribution_mode": self.EMAIL_DISTRIBUTION_MODE,
            "smtp_host_configured": bool(self.SMTP_HOST and self.SMTP_HOST.strip()),
            "smtp_port": self.SMTP_PORT,
            "smtp_use_tls": self.SMTP_USE_TLS,
            "email_from_address": self.EMAIL_FROM_ADDRESS,
            "email_from_name": self.EMAIL_FROM_NAME,
            "test_recipients_configured": bool(self.TEST_RECIPIENT_ROOP or self.TEST_RECIPIENT_SUMIT),
            "prod_dataeko_recipients_count": len(self.PROD_DATAEKO_DISTRIBUTION_EMAILS),
            "prod_meshiq_recipients_count": len(self.PROD_MESHIQ_DISTRIBUTION_EMAILS),
        }


settings = Settings()

