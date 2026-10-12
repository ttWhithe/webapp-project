"""add awakened weapon icon and artifact slot icons

Revision ID: 36eeeca1c954
Revises: 0b6700385965
Create Date: 2026-10-12 17:01:42.627784

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "36eeeca1c954"
down_revision: str | None = "0b6700385965"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "weapons",
        sa.Column("icon_awakened_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "artifact_sets",
        sa.Column("icon_plume_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "artifact_sets",
        sa.Column("icon_sands_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "artifact_sets",
        sa.Column("icon_goblet_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "artifact_sets",
        sa.Column("icon_circlet_url", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("artifact_sets", "icon_circlet_url")
    op.drop_column("artifact_sets", "icon_goblet_url")
    op.drop_column("artifact_sets", "icon_sands_url")
    op.drop_column("artifact_sets", "icon_plume_url")
    op.drop_column("weapons", "icon_awakened_url")
