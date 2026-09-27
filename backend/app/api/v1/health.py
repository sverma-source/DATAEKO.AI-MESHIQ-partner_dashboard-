import logging
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.config import settings

logger = logging.getLogger("app.health")
router = APIRouter()


@router.get("/health/live", summary="Liveness Probe")
async def liveness_probe():
    """
    Liveness probe to verify the application process is running.
    Does NOT check external dependencies such as the database.
    """
    return {
        "status": "alive",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/ready", summary="Readiness Probe")
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """
    Readiness probe to verify the application is capable of serving traffic.
    Validates core dependencies including PostgreSQL connectivity.
    Fails safely with HTTP 503 without leaking credentials or infrastructure details.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "service": settings.PROJECT_NAME,
            "environment": settings.ENVIRONMENT,
            "database": "connected",
            "calculation_engine_version": settings.CALCULATION_ENGINE_VERSION,
        }
    except Exception as exc:
        logger.warning(f"Readiness probe failed database check: {type(exc).__name__}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "service": settings.PROJECT_NAME,
                "environment": settings.ENVIRONMENT,
                "database": "unavailable",
            },
        )


@router.get("/health", summary="System & Calculation Engine Health Check (Backward Compatible)")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Legacy combined health check endpoint preserved for backward compatibility.
    """
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unavailable"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "calculation_engine_version": settings.CALCULATION_ENGINE_VERSION,
        "database": db_status,
    }

