import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Set
from app.config import settings
from app.core.correlation import get_request_id

# Sensitive keys to redact from logs
SENSITIVE_KEYS: Set[str] = {
    "password",
    "hashed_password",
    "secret",
    "secret_key",
    "jwt_secret",
    "token",
    "access_token",
    "refresh_token",
    "cookie",
    "cookies",
    "set-cookie",
    "authorization",
    "auth",
    "database_url",
    "raw_responses",
}


def redact_sensitive_data(data: Any) -> Any:
    """
    Recursively scrubs sensitive keys and values from dictionary and list objects.
    """
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = redact_sensitive_data(v)
        return cleaned
    elif isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    elif isinstance(data, str):
        # Basic credential masking in connection strings if any leaked
        if "postgresql://" in data or "postgresql+asyncpg://" in data:
            return "[DATABASE_URL_REDACTED]"
        return data
    return data


class JSONFormatter(logging.Formatter):
    """
    Production-oriented JSON log formatter.
    Outputs one JSON object per log entry with structured metadata and correlation IDs.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "meshiq-backend",
            "environment": settings.ENVIRONMENT,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": get_request_id(),
        }

        # Include structured extra fields if present
        if hasattr(record, "extra_fields") and isinstance(record.extra_fields, dict):
            for k, v in record.extra_fields.items():
                if k not in log_obj:
                    log_obj[k] = redact_sensitive_data(v)

        # Include exception details if present
        if record.exc_info:
            exc_type = record.exc_info[0].__name__ if record.exc_info[0] else "Exception"
            log_obj["exception_class"] = exc_type
            if settings.ENVIRONMENT != "production":
                log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(redact_sensitive_data(log_obj))


def setup_logging() -> None:
    """
    Configures the root logger with the structured JSON formatter.
    """
    root_logger = logging.getLogger()
    
    # Avoid duplicate handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)
    
    log_level = logging.DEBUG if settings.DEBUG and settings.ENVIRONMENT != "production" else logging.INFO
    root_logger.setLevel(log_level)
    
    # Suppress verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def log_structured(
    logger: logging.Logger,
    level: int,
    event: str,
    message: str,
    **kwargs: Any,
) -> None:
    """
    Convenience helper to emit structured JSON logs with an event identifier and safe extra fields.
    """
    extra_fields = {"event": event, **kwargs}
    logger.log(level, message, extra={"extra_fields": extra_fields})
