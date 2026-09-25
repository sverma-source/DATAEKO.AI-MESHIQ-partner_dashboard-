from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.config import settings

router = APIRouter()


@router.get("/health", summary="System & Calculation Engine Health Check")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "calculation_engine_version": settings.CALCULATION_ENGINE_VERSION,
        "database": db_status,
    }
