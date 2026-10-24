"""add_min_rarity_to_artifact_sets

Revision ID: 8284024eced4
Revises: 9b9c76c4c8ca
Create Date: 2026-10-21 21:16:00.096823

"""

import sqlalchemy as sa
from alembic import op

revision: str = "8284024eced4"
down_revision: str | None = "9b9c76c4c8ca"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("artifact_sets", sa.Column("min_rarity", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("artifact_sets", "min_rarity")
