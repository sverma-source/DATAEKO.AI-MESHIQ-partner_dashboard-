"""Initial schema for tenants, users, audit events, customers, assessments, responses, and calculation snapshots

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-25 14:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tenants Table
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tenants_id", "tenants", ["id"], unique=False)
    op.create_index("ix_tenants_slug", "tenants", ["slug"], unique=True)

    # 2. Users Table
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="CONSULTANT"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"], unique=False)

    # 3. Audit Events Table
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("resource_type", sa.String(length=100), nullable=True),
        sa.Column("resource_id", sa.String(length=36), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="SUCCESS"),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("details_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_id", "audit_events", ["id"], unique=False)
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"], unique=False)
    op.create_index("ix_audit_events_tenant_id", "audit_events", ["tenant_id"], unique=False)
    op.create_index("ix_audit_events_user_id", "audit_events", ["user_id"], unique=False)

    # 4. Customers Table
    op.create_table(
        "customers",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("industry", sa.String(length=100), nullable=True),
        sa.Column("primary_contact_name", sa.String(length=255), nullable=True),
        sa.Column("primary_contact_email", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customers_id", "customers", ["id"], unique=False)
    op.create_index("ix_customers_tenant_id", "customers", ["tenant_id"], unique=False)
    op.create_index("ix_customers_name", "customers", ["name"], unique=False)

    # 5. Assessments Table
    op.create_table(
        "assessments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("customer_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="DRAFT"),
        sa.Column("assessment_version", sa.String(length=50), nullable=False, server_default="1.0.0"),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assessments_id", "assessments", ["id"], unique=False)
    op.create_index("ix_assessments_tenant_id", "assessments", ["tenant_id"], unique=False)
    op.create_index("ix_assessments_customer_id", "assessments", ["customer_id"], unique=False)
    op.create_index("ix_assessments_status", "assessments", ["status"], unique=False)

    # 6. Assessment Responses Table
    op.create_table(
        "assessment_responses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("assessment_id", sa.String(length=36), nullable=False),
        sa.Column("q01_company_name", sa.String(length=255), nullable=True),
        sa.Column("q02_industry", sa.String(length=100), nullable=True),
        sa.Column("q03_environment_scale", sa.String(length=100), nullable=True),
        sa.Column("q04_weekly_admin_hours", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("q05_mq_role_split", sa.String(length=100), nullable=True),
        sa.Column("q06_frequency_text", sa.String(length=100), nullable=True),
        sa.Column("q06_frequency_override", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("q07_labor_hours_text", sa.String(length=100), nullable=True),
        sa.Column("q07_labor_hours_override", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("q08_duration_text", sa.String(length=100), nullable=True),
        sa.Column("q09_root_cause_categories", sa.Text(), nullable=True),
        sa.Column("q10_problem_types", sa.Text(), nullable=True),
        sa.Column("q11_monitoring_status", sa.String(length=100), nullable=True),
        sa.Column("q12_business_impact", sa.String(length=100), nullable=True),
        sa.Column("q13_annual_outage_count", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("q14_duration_text", sa.String(length=100), nullable=True),
        sa.Column("q14_duration_override", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("q15_hourly_cost_override", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("q16_config_management_method", sa.String(length=100), nullable=True),
        sa.Column("q17_audit_frequency", sa.String(length=100), nullable=True),
        sa.Column("q18_audit_effort", sa.String(length=100), nullable=True),
        sa.Column("q19_documentation_effort", sa.String(length=100), nullable=True),
        sa.Column("q20_annual_labor_rate", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("q21_annual_mq_spend", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("q22_migration_plans", sa.String(length=100), nullable=True),
        sa.Column("raw_responses", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_id"),
    )
    op.create_index("ix_assessment_responses_id", "assessment_responses", ["id"], unique=False)
    op.create_index("ix_assessment_responses_assessment_id", "assessment_responses", ["assessment_id"], unique=True)

    # 7. Calculation Snapshots Table
    op.create_table(
        "calculation_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("assessment_id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("calculation_engine_version", sa.String(length=50), nullable=False),
        sa.Column("assessment_version", sa.String(length=50), nullable=False, server_default="1.0.0"),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("normalized_inputs", sa.JSON(), nullable=False),
        sa.Column("computed_metrics", sa.JSON(), nullable=False),
        sa.Column("summary_metrics", sa.JSON(), nullable=False),
        sa.Column("assumptions_used", sa.JSON(), nullable=False),
        sa.Column("benchmarks_used", sa.JSON(), nullable=False),
        sa.Column("provenance_summary", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["assessments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_calculation_snapshots_id", "calculation_snapshots", ["id"], unique=False)
    op.create_index("ix_calculation_snapshots_assessment_id", "calculation_snapshots", ["assessment_id"], unique=False)
    op.create_index("ix_calculation_snapshots_tenant_id", "calculation_snapshots", ["tenant_id"], unique=False)
    op.create_index("ix_calculation_snapshots_calculation_engine_version", "calculation_snapshots", ["calculation_engine_version"], unique=False)


def downgrade() -> None:
    op.drop_table("calculation_snapshots")
    op.drop_table("assessment_responses")
    op.drop_table("assessments")
    op.drop_table("customers")
    op.drop_table("audit_events")
    op.drop_table("users")
    op.drop_table("tenants")
