from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.deps import DEFAULT_TENANT_ID
from app.api.v1.api import api_router
from app.config import settings
from app.core.correlation import get_request_id
from app.core.database import AsyncSessionLocal, engine
from app.core.errors import (
    AppError,
    AuthenticationError,
    ConflictError,
    EntityNotFoundError,
    PayloadTooLargeError,
    PermissionDeniedError,
    RateLimitExceededError,
    TenantMismatchError,
)
from app.core.logging import setup_logging
from app.core.middleware import (
    ExceptionSanitizerMiddleware,
    RequestCorrelationMiddleware,
    RequestLifecycleMiddleware,
    RequestSizeLimiterMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.rbac import Role
from app.core.security import get_password_hash
from app.models.base import Base
from app.models.tenant import Tenant
from app.models.user import User

# Configure structured JSON logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # In development and test environments, auto-initialize tables and seed development users
    if settings.ENVIRONMENT != "production":
        # Initialize tables (for dev/test SQLite environments when migrations haven't run)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Ensure default tenant and seed development users exist for dev convenience
        async with AsyncSessionLocal() as session:
            stmt = select(Tenant).where(Tenant.id == DEFAULT_TENANT_ID)
            res = await session.execute(stmt)
            default_tenant = res.scalar_one_or_none()
            if not default_tenant:
                tenant = Tenant(
                    id=DEFAULT_TENANT_ID,
                    name="Primary Organization (DATAEKO / meshIQ)",
                    slug="default-org",
                )
                session.add(tenant)
                await session.flush()

            # Seed default development users if they don't exist
            user_stmt = select(User).where(User.email == "consultant@dataeko.ai")
            user_res = await session.execute(user_stmt)
            if not user_res.scalar_one_or_none():
                consultant_user = User(
                    id="00000000-0000-0000-0000-000000000002",
                    email="consultant@dataeko.ai",
                    hashed_password=get_password_hash("Consultant123!"),
                    full_name="Lead MQ Consultant",
                    role=Role.CONSULTANT.value,
                    tenant_id=DEFAULT_TENANT_ID,
                    is_active=True,
                )
                session.add(consultant_user)

            admin_stmt = select(User).where(User.email == "admin@dataeko.ai")
            admin_res = await session.execute(admin_stmt)
            if not admin_res.scalar_one_or_none():
                admin_user = User(
                    id="00000000-0000-0000-0000-000000000003",
                    email="admin@dataeko.ai",
                    hashed_password=get_password_hash("AdminPass123!"),
                    full_name="Platform Admin",
                    role=Role.PLATFORM_ADMIN.value,
                    tenant_id=DEFAULT_TENANT_ID,
                    is_active=True,
                )
                session.add(admin_user)

            client_stmt = select(User).where(User.email == "client@dataeko.ai")
            client_res = await session.execute(client_stmt)
            if not client_res.scalar_one_or_none():
                client_user = User(
                    id="00000000-0000-0000-0000-000000000007",
                    email="client@dataeko.ai",
                    hashed_password=get_password_hash("ClientPass123!"),
                    full_name="Assessment Client",
                    role=Role.CUSTOMER_USER.value,
                    tenant_id=DEFAULT_TENANT_ID,
                    is_active=True,
                )
                session.add(client_user)

            partner_stmt = select(User).where(User.email == "partner_admin@dataeko.ai")
            partner_res = await session.execute(partner_stmt)
            if not partner_res.scalar_one_or_none():
                partner_user = User(
                    email="partner_admin@dataeko.ai",
                    hashed_password=get_password_hash("PartnerPass123!"),
                    full_name="Partner Administrator",
                    role=Role.PARTNER_ADMIN.value,
                    tenant_id=DEFAULT_TENANT_ID,
                    is_active=True,
                )
                session.add(partner_user)

            cust_admin_stmt = select(User).where(User.email == "customer_admin@dataeko.ai")
            cust_admin_res = await session.execute(cust_admin_stmt)
            if not cust_admin_res.scalar_one_or_none():
                cust_admin_user = User(
                    email="customer_admin@dataeko.ai",
                    hashed_password=get_password_hash("CustomerAdmin123!"),
                    full_name="Customer Administrator",
                    role=Role.CUSTOMER_ADMIN.value,
                    tenant_id=DEFAULT_TENANT_ID,
                    is_active=True,
                )
                session.add(cust_admin_user)

            await session.commit()

    yield

    # Clean up database engine on shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise IBM MQ Economic Cost & Efficiency Assessment Platform API",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Middleware Pipeline (executed from outermost to innermost):
# 1. CORS Middleware (outermost)
# 2. Request Correlation (generates/propagates X-Request-ID)
# 3. Request Lifecycle Logging (measures duration and logs start/completion)
# 4. Security Headers
# 5. Request Size Limiter (non-buffering body size defense)
# 6. Exception Sanitization (innermost exception catch-all)

app.add_middleware(ExceptionSanitizerMiddleware)
app.add_middleware(RequestSizeLimiterMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLifecycleMiddleware)
app.add_middleware(RequestCorrelationMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.ENVIRONMENT == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID",
        "Retry-After",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
    ],
)


def _get_error_headers() -> dict:
    req_id = get_request_id()
    return {"X-Request-ID": req_id} if req_id else {}


# Global Exception Handlers
@app.exception_handler(RateLimitExceededError)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceededError):
    headers = {
        "Retry-After": str(exc.retry_after_seconds),
        "X-RateLimit-Limit": str(exc.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": str(exc.retry_after_seconds),
        **_get_error_headers(),
    }
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "detail": exc.message,
            "error_type": "RateLimitExceeded",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=headers,
    )


@app.exception_handler(PayloadTooLargeError)
async def payload_too_large_handler(request: Request, exc: PayloadTooLargeError):
    return JSONResponse(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        content={
            "detail": exc.message,
            "error_type": "PayloadTooLarge",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=_get_error_headers(),
    )


@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    headers = {"WWW-Authenticate": "Bearer", **_get_error_headers()}
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "detail": exc.message,
            "error_type": "AuthenticationError",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=headers,
    )


@app.exception_handler(PermissionDeniedError)
async def permission_denied_handler(request: Request, exc: PermissionDeniedError):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "detail": exc.message,
            "error_type": "PermissionDenied",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=_get_error_headers(),
    )


@app.exception_handler(TenantMismatchError)
async def tenant_mismatch_handler(request: Request, exc: TenantMismatchError):
    # Hide cross-tenant resource existence
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": exc.message,
            "error_type": "EntityNotFound",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=_get_error_headers(),
    )


@app.exception_handler(EntityNotFoundError)
async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": exc.message,
            "error_type": "EntityNotFound",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=_get_error_headers(),
    )


@app.exception_handler(ConflictError)
async def conflict_error_handler(request: Request, exc: ConflictError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "detail": exc.message,
            "error_type": "ConflictError",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=_get_error_headers(),
    )


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": exc.message,
            "error_type": "AppError",
            "details": exc.details,
            "request_id": get_request_id(),
        },
        headers=_get_error_headers(),
    )


# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }

