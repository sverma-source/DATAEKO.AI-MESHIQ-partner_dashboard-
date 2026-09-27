import json
import logging
import pytest
from app.core.logging import JSONFormatter, redact_sensitive_data
from app.core.audit import log_audit_event
from app.core.correlation import set_request_id
from app.models.audit_event import AuditEvent



def test_json_formatter_outputs_valid_json():
    """Verify that JSONFormatter formats standard LogRecord as parseable JSON with required fields."""
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="app.test",
        level=logging.INFO,
        pathname="test.py",
        lineno=42,
        msg="Test operation completed",
        args=(),
        exc_info=None,
    )
    formatted = formatter.format(record)
    parsed = json.loads(formatted)
    
    assert "timestamp" in parsed
    assert parsed["level"] == "INFO"
    assert parsed["service"] == "meshiq-backend"
    assert parsed["logger"] == "app.test"
    assert parsed["message"] == "Test operation completed"


def test_redact_sensitive_data_scrubs_secrets():
    """Verify that sensitive keys and URL tokens are redacted by redact_sensitive_data."""
    payload = {
        "user_email": "operator@dataeko.ai",
        "password": "SuperSecretPassword123!",
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token",
        "cookie": "access_token=secret_jwt_cookie",
        "nested": {
            "secret_key": "api_secret_key_123",
            "db_url": "postgresql://user:secretpass@localhost:5432/db",
            "safe_kpi": 1250000.50,
        }
    }
    
    sanitized = redact_sensitive_data(payload)
    
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["access_token"] == "[REDACTED]"
    assert sanitized["authorization"] == "[REDACTED]"
    assert sanitized["cookie"] == "[REDACTED]"
    assert sanitized["nested"]["secret_key"] == "[REDACTED]"
    assert sanitized["nested"]["db_url"] == "[DATABASE_URL_REDACTED]"
    assert sanitized["user_email"] == "operator@dataeko.ai"
    assert sanitized["nested"]["safe_kpi"] == 1250000.50


@pytest.mark.asyncio
async def test_audit_event_incorporates_correlation_id(db_session):
    """Verify that log_audit_event attaches the active request_id to details_json."""
    test_req_id = "trace-req-audit-98765"
    set_request_id(test_req_id)
    
    event = await log_audit_event(
        session=db_session,
        event_type="ASSESSMENT_ACCESSED",
        resource_type="Assessment",
        resource_id="00000000-0000-0000-0000-000000000001",
        tenant_id="00000000-0000-0000-0000-000000000001",
        user_id="00000000-0000-0000-0000-000000000002",
        details={"view_mode": "summary"},
    )
    
    assert event.details_json is not None
    assert event.details_json.get("request_id") == test_req_id
    assert event.details_json.get("view_mode") == "summary"

