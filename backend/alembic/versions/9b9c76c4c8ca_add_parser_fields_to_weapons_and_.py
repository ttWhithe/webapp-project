"""add_parser_fields_to_weapons_and_artifacts

Revision ID: 9b9c76c4c8ca
Revises: c6e2ba580413
Create Date: 2026-10-21 05:39:37.083878

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "9b9c76c4c8ca"
down_revision = "c6e2ba580413"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("weapons", sa.Column("passive_name", sa.String(length=200), nullable=True))
    op.add_column("weapons", sa.Column("passive_desc", sa.String(length=1000), nullable=True))

    op.add_column("artifact_sets", sa.Column("max_rarity", sa.Integer(), nullable=True))
    op.add_column("artifact_sets", sa.Column("bonus_2pc", sa.String(length=1000), nullable=True))
    op.add_column("artifact_sets", sa.Column("bonus_4pc", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("artifact_sets", "bonus_4pc")
    op.drop_column("artifact_sets", "bonus_2pc")
    op.drop_column("artifact_sets", "max_rarity")
    op.drop_column("weapons", "passive_desc")
    op.drop_column("weapons", "passive_name")
