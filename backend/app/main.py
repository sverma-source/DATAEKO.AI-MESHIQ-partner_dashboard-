from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.deps import DEFAULT_TENANT_ID
from app.api.v1.api import api_router
from app.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.core.errors import (
    AppError,
    AuthenticationError,
    EntityNotFoundError,
    PermissionDeniedError,
    TenantMismatchError,
)
from app.core.middleware import ExceptionSanitizerMiddleware, SecurityHeadersMiddleware
from app.core.rbac import Role
from app.core.security import get_password_hash
from app.models.base import Base
from app.models.tenant import Tenant
from app.models.user import User


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize tables (for dev/test SQLite environments when migrations haven't run)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Ensure default tenant and seed users exist
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

        # Seed default users if they don't exist
        user_stmt = select(User).where(User.email == "consultant@dataeko.ai")
        user_res = await session.execute(user_stmt)
        default_user = user_res.scalar_one_or_none()
        if not default_user:
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

# 1. Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Exception Sanitization Middleware
app.add_middleware(ExceptionSanitizerMiddleware)

# 3. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.ENVIRONMENT == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers
@app.exception_handler(AuthenticationError)
async def authentication_error_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": exc.message, "error_type": "AuthenticationError", "details": exc.details},
        headers={"WWW-Authenticate": "Bearer"},
    )


@app.exception_handler(PermissionDeniedError)
async def permission_denied_handler(request: Request, exc: PermissionDeniedError):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": exc.message, "error_type": "PermissionDenied", "details": exc.details},
    )


@app.exception_handler(TenantMismatchError)
async def tenant_mismatch_handler(request: Request, exc: TenantMismatchError):
    # Hide cross-tenant resource existence
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message, "error_type": "EntityNotFound", "details": exc.details},
    )


@app.exception_handler(EntityNotFoundError)
async def entity_not_found_handler(request: Request, exc: EntityNotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message, "error_type": "EntityNotFound", "details": exc.details},
    )


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message, "error_type": "AppError", "details": exc.details},
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
