import os
import pytest
from alembic.config import Config
from alembic import command


def test_alembic_upgrade_and_downgrade_cycle(tmp_path):
    """Verifies that Alembic can apply all migrations to a fresh database and cleanly downgrade."""
    db_file = tmp_path / "test_migration.db"
    db_url = f"sqlite+aiosqlite:///{db_file}"

    alembic_cfg = Config("backend/alembic.ini")
    alembic_cfg.set_main_option("script_location", "backend/alembic")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Test upgrade to head
    command.upgrade(alembic_cfg, "head")
    assert db_file.exists()

    # 2. Test downgrade to base
    command.downgrade(alembic_cfg, "base")

    # 3. Test re-upgrade to head
    command.upgrade(alembic_cfg, "head")
