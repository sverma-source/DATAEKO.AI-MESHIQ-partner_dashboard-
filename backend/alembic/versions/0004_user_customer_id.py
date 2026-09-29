"""Add customer_id column and index to users table

Revision ID: 0004_user_customer_id
Revises: 0003_assessment_created_by
Create Date: 2026-09-29 18:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = "0004_user_customer_id"
down_revision: Union[str, None] = "0003_assessment_created_by"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(
            sa.Column("customer_id", sa.String(length=36), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_users_customer_id",
            "customers",
            ["customer_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_users_customer_id",
            ["customer_id"],
            unique=False,
        )
        batch_op.create_index(
            "ix_users_tenant_customer",
            ["tenant_id", "customer_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_tenant_customer")
        batch_op.drop_index("ix_users_customer_id")
        batch_op.drop_constraint("fk_users_customer_id", type_="foreignkey")
        batch_op.drop_column("customer_id")
