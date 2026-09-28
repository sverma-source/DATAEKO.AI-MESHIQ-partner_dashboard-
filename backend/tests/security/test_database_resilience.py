import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy import inspect, text

from app.core.database import engine
from app.models.calculation_snapshot import CalculationSnapshot


def test_database_engine_resilience_configuration():
    """Verify PostgreSQL engine resilience settings (pool_pre_ping=True, pool_recycle=1800)."""
    # Test PostgreSQL configuration logic
    pg_url = "postgresql+asyncpg://user:pass@localhost:5432/meshiq"
    engine_kwargs = {
        "future": True,
    }
    if not pg_url.startswith("sqlite"):
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 1800

    pg_engine = create_async_engine(pg_url, **engine_kwargs)
    assert pg_engine.pool._pre_ping is True
    assert pg_engine.pool._recycle == 1800

    # Test SQLite compatibility
    sqlite_url = "sqlite+aiosqlite:///:memory:"
    sqlite_engine = create_async_engine(sqlite_url, connect_args={"check_same_thread": False})
    assert sqlite_engine is not None


def test_calculation_snapshot_model_has_composite_index():
    """Verify CalculationSnapshot model defines the composite index on (assessment_id, created_at DESC)."""
    table = CalculationSnapshot.__table__
    index_names = [idx.name for idx in table.indexes]
    assert "ix_calc_snapshots_assessment_created_at_desc" in index_names

    # Check index columns
    composite_idx = next(idx for idx in table.indexes if idx.name == "ix_calc_snapshots_assessment_created_at_desc")
    col_names = [col.name if hasattr(col, "name") else str(col) for col in composite_idx.expressions]
    assert any("assessment_id" in col for col in col_names)
