"""Create user_credential_tokens table for invitation and password reset lifecycle

Revision ID: 0005_user_credential_tokens
Revises: 0004_user_customer_id
Create Date: 2026-09-29 18:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005_user_credential_tokens"
down_revision: Union[str, None] = "0004_user_customer_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_credential_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("token_type", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_credential_tokens_id", "user_credential_tokens", ["id"], unique=False)
    op.create_index("ix_user_credential_tokens_tenant_id", "user_credential_tokens", ["tenant_id"], unique=False)
    op.create_index("ix_user_credential_tokens_user_id", "user_credential_tokens", ["user_id"], unique=False)
    op.create_index("ix_user_credential_tokens_token_hash", "user_credential_tokens", ["token_hash"], unique=False)
    op.create_index("ix_user_credential_tokens_token_type", "user_credential_tokens", ["token_type"], unique=False)
    op.create_index(
        "ix_user_credential_tokens_hash_type",
        "user_credential_tokens",
        ["token_hash", "token_type"],
        unique=False,
    )
    op.create_index(
        "ix_user_credential_tokens_user_type",
        "user_credential_tokens",
        ["user_id", "token_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_credential_tokens_user_type", table_name="user_credential_tokens")
    op.drop_index("ix_user_credential_tokens_hash_type", table_name="user_credential_tokens")
    op.drop_index("ix_user_credential_tokens_token_type", table_name="user_credential_tokens")
    op.drop_index("ix_user_credential_tokens_token_hash", table_name="user_credential_tokens")
    op.drop_index("ix_user_credential_tokens_user_id", table_name="user_credential_tokens")
    op.drop_index("ix_user_credential_tokens_tenant_id", table_name="user_credential_tokens")
    op.drop_index("ix_user_credential_tokens_id", table_name="user_credential_tokens")
    op.drop_table("user_credential_tokens")
