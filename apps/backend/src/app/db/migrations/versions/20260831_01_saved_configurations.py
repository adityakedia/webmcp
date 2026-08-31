"""add users and revisioned saved custom speaker configurations

Revision ID: 20260831_01
Revises:
Create Date: 2026-08-31
"""

import sqlalchemy as sa
from alembic import op

revision = "20260831_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table(
        "custom_speaker_configurations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("configuration", sa.JSON(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_custom_speaker_configurations_owner_id", "custom_speaker_configurations", ["owner_id"]
    )
    op.create_table(
        "custom_speaker_configuration_revisions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "configuration_id",
            sa.String(),
            sa.ForeignKey("custom_speaker_configurations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("configuration", sa.JSON(), nullable=False),
        sa.Column("actor", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_custom_speaker_configuration_revisions_configuration_id",
        "custom_speaker_configuration_revisions",
        ["configuration_id"],
    )


def downgrade() -> None:
    op.drop_table("custom_speaker_configuration_revisions")
    op.drop_table("custom_speaker_configurations")
    op.drop_table("users")
