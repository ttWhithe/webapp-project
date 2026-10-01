"""add character, weapon, artifact_set tables

Revision ID: d639387f8811
Revises: 6eba0398acd2
Create Date: 2026-10-01 19:29:11.612487

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d639387f8811"
down_revision: str | None = "6eba0398acd2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "characters",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("external_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("name_ru", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column(
            "element",
            sa.Enum(
                "pyro",
                "hydro",
                "anemo",
                "electro",
                "dendro",
                "cryo",
                "geo",
                name="character_element",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column(
            "weapon_type",
            sa.Enum(
                "sword",
                "claymore",
                "polearm",
                "bow",
                "catalyst",
                name="character_weapon_type",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("rarity", sa.Integer(), nullable=False),
        sa.Column("region", sa.String(length=80), nullable=True),
        sa.Column("birthday", sa.String(length=20), nullable=True),
        sa.Column("icon_url", sa.String(length=500), nullable=True),
        sa.Column("portrait_url", sa.String(length=500), nullable=True),
        sa.Column("version_added", sa.String(length=10), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_characters_external_id"), "characters", ["external_id"], unique=True)
    op.create_index(op.f("ix_characters_slug"), "characters", ["slug"], unique=True)
    op.create_index(op.f("ix_characters_element"), "characters", ["element"], unique=False)
    op.create_index(op.f("ix_characters_weapon_type"), "characters", ["weapon_type"], unique=False)
    op.create_index(op.f("ix_characters_rarity"), "characters", ["rarity"], unique=False)

    op.create_table(
        "weapons",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("external_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("name_ru", sa.String(length=150), nullable=True),
        sa.Column(
            "weapon_type",
            sa.Enum(
                "sword",
                "claymore",
                "polearm",
                "bow",
                "catalyst",
                name="weapon_type",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("rarity", sa.Integer(), nullable=False),
        sa.Column("base_atk", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("main_stat", sa.String(length=80), nullable=True),
        sa.Column("icon_url", sa.String(length=500), nullable=True),
        sa.Column("version_added", sa.String(length=10), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_weapons_external_id"), "weapons", ["external_id"], unique=True)
    op.create_index(op.f("ix_weapons_slug"), "weapons", ["slug"], unique=True)
    op.create_index(op.f("ix_weapons_weapon_type"), "weapons", ["weapon_type"], unique=False)
    op.create_index(op.f("ix_weapons_rarity"), "weapons", ["rarity"], unique=False)

    op.create_table(
        "artifact_sets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("external_id", sa.Integer(), nullable=True),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("name_ru", sa.String(length=150), nullable=True),
        sa.Column("icon_url", sa.String(length=500), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_artifact_sets_external_id"), "artifact_sets", ["external_id"], unique=True
    )
    op.create_index(op.f("ix_artifact_sets_slug"), "artifact_sets", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_artifact_sets_slug"), table_name="artifact_sets")
    op.drop_index(op.f("ix_artifact_sets_external_id"), table_name="artifact_sets")
    op.drop_table("artifact_sets")

    op.drop_index(op.f("ix_weapons_rarity"), table_name="weapons")
    op.drop_index(op.f("ix_weapons_weapon_type"), table_name="weapons")
    op.drop_index(op.f("ix_weapons_slug"), table_name="weapons")
    op.drop_index(op.f("ix_weapons_external_id"), table_name="weapons")
    op.drop_table("weapons")

    op.drop_index(op.f("ix_characters_rarity"), table_name="characters")
    op.drop_index(op.f("ix_characters_weapon_type"), table_name="characters")
    op.drop_index(op.f("ix_characters_element"), table_name="characters")
    op.drop_index(op.f("ix_characters_slug"), table_name="characters")
    op.drop_index(op.f("ix_characters_external_id"), table_name="characters")
    op.drop_table("characters")
