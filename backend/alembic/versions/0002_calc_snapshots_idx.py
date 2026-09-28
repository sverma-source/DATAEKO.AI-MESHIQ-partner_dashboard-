"""Add composite index on calculation_snapshots (assessment_id, created_at DESC)

Revision ID: 0002_calc_snapshots_idx
Revises: 0001_initial_schema
Create Date: 2026-09-28 12:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = "0002_calc_snapshots_idx"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_calc_snapshots_assessment_created_at_desc",
        "calculation_snapshots",
        ["assessment_id", sa.text("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_calc_snapshots_assessment_created_at_desc",
        table_name="calculation_snapshots",
    )
