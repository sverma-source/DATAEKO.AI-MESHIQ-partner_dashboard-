"""Add auth_version column to users table for authentication session hardening

Revision ID: 0006_user_auth_version
Revises: 0005_user_credential_tokens
Create Date: 2026-09-29 19:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0006_user_auth_version"
down_revision: Union[str, None] = "0005_user_credential_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add auth_version to users table with server_default='1'
    op.add_column(
        "users",
        sa.Column(
            "auth_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "auth_version")
