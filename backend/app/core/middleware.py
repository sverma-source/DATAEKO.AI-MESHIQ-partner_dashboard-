import time
import logging
import traceback
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.types import ASGIApp

from app.config import settings
from app.core.correlation import get_request_id, sanitize_or_generate_request_id, _request_id_ctx_var
from app.core.errors import PayloadTooLargeError
from app.core.logging import log_structured
from app.core.rate_limit import get_trusted_client_ip

logger = logging.getLogger("app.lifecycle")
security_logger = logging.getLogger("app.security")


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """
    Establishes a unique correlation ID for every request,
    propagating it through contextvars, request state, and response headers.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        raw_header = request.headers.get("X-Request-ID") or request.headers.get("x-request-id")
        request_id = sanitize_or_generate_request_id(raw_header)
        
        # Set context variable and request state
        token = _request_id_ctx_var.set(request_id)
        request.state.request_id = request_id
        
        try:
            response = await call_next(request)
        except Exception:
            _request_id_ctx_var.reset(token)
            raise

        response.headers["X-Request-ID"] = request_id
        _request_id_ctx_var.reset(token)
        return response


class RequestLifecycleMiddleware(BaseHTTPMiddleware):
    """
    Emits structured request lifecycle logs with method, path, status, duration, and resolved client IP.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.perf_counter()
        request_id = get_request_id()
        
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        
        # Determine log severity based on HTTP status code
        if response.status_code >= 500:
            log_level = logging.ERROR
        elif response.status_code >= 400:
            log_level = logging.WARNING
        else:
            log_level = logging.INFO

        client_ip = get_trusted_client_ip(request)
        
        log_structured(
            logger=logger,
            level=log_level,
            event="HTTP_REQUEST_COMPLETED",
            message=f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            client_ip=client_ip,
            request_id=request_id,
        )
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects defensive HTTP security headers to all responses.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'"
        )

        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class RequestSizeLimiterMiddleware:
    """
    Guards against large request payload attacks and memory exhaustion.
    1. Checks Content-Length header first without buffering the body.
    2. Wraps the ASGI receive callable for streaming/chunked requests to reject with
       HTTP 413 as soon as MAX_REQUEST_BODY_BYTES is exceeded.
    """
    def __init__(self, app: ASGIApp, max_bytes: int | None = None):
        self.app = app
        self.max_bytes = max_bytes or settings.MAX_REQUEST_BODY_BYTES

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length_header = headers.get(b"content-length")

        if content_length_header:
            try:
                content_length = int(content_length_header.decode("latin1"))
                if content_length > self.max_bytes:
                    request_id = get_request_id()
                    error_content = {
                        "detail": f"Request payload exceeds maximum allowed size of {self.max_bytes} bytes.",
                        "error_type": "PayloadTooLarge",
                        "details": {"max_bytes": self.max_bytes},
                        "request_id": request_id,
                    }
                    response = JSONResponse(
                        status_code=413,
                        content=error_content,
                        headers={"X-Request-ID": request_id} if request_id else {},
                    )
                    await response(scope, receive, send)
                    return
            except (ValueError, UnicodeDecodeError):
                pass

        bytes_received = 0
        limit_exceeded = False

        async def streaming_receive():
            nonlocal bytes_received, limit_exceeded
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                bytes_received += len(body)
                if bytes_received > self.max_bytes:
                    limit_exceeded = True
                    raise PayloadTooLargeError(
                        f"Request payload exceeds maximum allowed size of {self.max_bytes} bytes.",
                        max_bytes=self.max_bytes,
                    )
            return message

        async def custom_send(message):
            if limit_exceeded:
                return
            await send(message)

        try:
            await self.app(scope, streaming_receive, custom_send)
        except Exception:
            if not limit_exceeded:
                raise

        if limit_exceeded:
            request_id = get_request_id()
            error_content = {
                "detail": f"Request payload exceeds maximum allowed size of {self.max_bytes} bytes.",
                "error_type": "PayloadTooLarge",
                "details": {"max_bytes": self.max_bytes},
                "request_id": request_id,
            }
            response = JSONResponse(
                status_code=413,
                content=error_content,
                headers={"X-Request-ID": request_id} if request_id else {},
            )
            await response(scope, receive, send)



from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.errors import AppError, PayloadTooLargeError

class ExceptionSanitizerMiddleware(BaseHTTPMiddleware):
    """
    Prevents unhandled exceptions from leaking internal SQL statements,
    file paths, database connection strings, or Python tracebacks to clients.
    Includes X-Request-ID on 500 JSON responses.
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = get_request_id()
        try:
            return await call_next(request)
        except (AppError, StarletteHTTPException):
            raise
        except Exception as exc:
            log_structured(
                logger=security_logger,
                level=logging.ERROR,
                event="UNHANDLED_EXCEPTION",
                message=f"Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}",
                method=request.method,
                path=request.url.path,
                exception_class=type(exc).__name__,
                request_id=request_id,
            )
            
            headers = {"X-Request-ID": request_id}
            
            # In production, return clean sanitized JSON response without traceback
            if settings.ENVIRONMENT == "production" or not settings.DEBUG:
                return JSONResponse(
                    status_code=500,
                    content={
                        "detail": f"An internal server error occurred. Reference ID: {request_id}",
                        "error_type": "InternalServerError",
                        "status_code": 500,
                        "request_id": request_id,
                    },
                    headers=headers,
                )
            raise exc

