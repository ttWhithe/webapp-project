"""add_parser_fields_to_characters

Revision ID: c6e2ba580413
Revises: 36eeeca1c954
Create Date: 2026-10-20 19:01:54.570450

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c6e2ba580413"
down_revision: str | None = "36eeeca1c954"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("characters", sa.Column("release_date", sa.String(length=50), nullable=True))
    op.add_column("characters", sa.Column("namecard_url", sa.String(length=500), nullable=True))
    op.add_column(
        "characters", sa.Column("constellation_icon_url", sa.String(length=500), nullable=True)
    )
    op.add_column("characters", sa.Column("talents", sa.JSON(), nullable=True))
    op.add_column("characters", sa.Column("constellations", sa.JSON(), nullable=True))
    op.add_column("characters", sa.Column("c3_increases", sa.String(length=50), nullable=True))
    op.add_column("characters", sa.Column("c5_increases", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("characters", "c5_increases")
    op.drop_column("characters", "c3_increases")
    op.drop_column("characters", "constellations")
    op.drop_column("characters", "talents")
    op.drop_column("characters", "constellation_icon_url")
    op.drop_column("characters", "namecard_url")
    op.drop_column("characters", "release_date")
