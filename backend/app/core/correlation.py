import re
import uuid
from contextvars import ContextVar
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Context variable for request correlation ID across async task execution
_request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default="unknown")

# Safe request ID validation: alphanumeric, hyphens, underscores, length 1..64
REQUEST_ID_REGEX = re.compile(r"^[a-zA-Z0-9_\-]{1,64}$")


def get_request_id() -> str:
    """
    Returns the current request correlation ID from context, or 'unknown'.
    """
    return _request_id_ctx_var.get()


def set_request_id(request_id: str) -> None:
    """
    Sets the current request correlation ID in context.
    """
    _request_id_ctx_var.set(request_id)


def sanitize_or_generate_request_id(incoming_header: Optional[str]) -> str:
    """
    Validates and sanitizes incoming X-Request-ID. If missing, invalid,
    or oversized, generates a new UUIDv4 string.
    """
    if incoming_header and REQUEST_ID_REGEX.match(incoming_header.strip()):
        return incoming_header.strip()
    return str(uuid.uuid4())


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that establishes a unique correlation ID for every request,
    propagating it through contextvars, request state, and response headers.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        raw_header = request.headers.get("X-Request-ID") or request.headers.get("x-request-id")
        request_id = sanitize_or_generate_request_id(raw_header)
        
        # Set context variable and request state
        _request_id_ctx_var.set(request_id)
        request.state.request_id = request_id
        
        try:
            response = await call_next(request)
        except Exception:
            # Re-raise to let ExceptionSanitizerMiddleware handle it
            raise
        finally:
            pass

        # Ensure X-Request-ID is present on response
        response.headers["X-Request-ID"] = request_id
        return response
