from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from starlette.types import ASGIApp
import logging
import traceback
from app.config import settings

logger = logging.getLogger("app.security")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects defensive HTTP security headers to all responses.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        
        # Defensive browser headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # Content-Security-Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'"
        )

        # HSTS in production environments
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response


class ExceptionSanitizerMiddleware(BaseHTTPMiddleware):
    """
    Prevents unhandled exceptions from leaking internal SQL statements,
    file paths, database connection strings, or Python tracebacks to clients.
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            # Log full traceback server-side for observability
            logger.error(
                f"Unhandled exception on {request.method} {request.url.path}: {exc}\n"
                f"{traceback.format_exc()}"
            )
            
            # In production, return clean sanitized JSON response without traceback
            if settings.ENVIRONMENT == "production" or not settings.DEBUG:
                return JSONResponse(
                    status_code=500,
                    content={
                        "detail": "An internal server error occurred. Please contact system support.",
                        "error_type": "InternalServerError",
                        "status_code": 500,
                    },
                )
            raise exc
