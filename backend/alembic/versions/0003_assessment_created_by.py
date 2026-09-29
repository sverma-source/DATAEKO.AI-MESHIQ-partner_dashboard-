"""Add created_by_user_id column to assessments table

Revision ID: 0003_assessment_created_by
Revises: 0002_calc_snapshots_idx
Create Date: 2026-09-29 12:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = "0003_assessment_created_by"
down_revision: Union[str, None] = "0002_calc_snapshots_idx"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("assessments") as batch_op:
        batch_op.add_column(
            sa.Column("created_by_user_id", sa.String(length=36), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_assessments_created_by_user_id",
            "users",
            ["created_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_assessments_created_by_user_id",
            ["created_by_user_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("assessments") as batch_op:
        batch_op.drop_index("ix_assessments_created_by_user_id")
        batch_op.drop_constraint("fk_assessments_created_by_user_id", type_="foreignkey")
        batch_op.drop_column("created_by_user_id")
