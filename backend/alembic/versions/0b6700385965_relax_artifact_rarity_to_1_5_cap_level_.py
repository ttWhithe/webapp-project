"""relax artifact rarity to 1-5, cap level by rarity

Revision ID: 0b6700385965
Revises: 615b32c09367
Create Date: 2026-10-04 08:15:31.019996

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0b6700385965"
down_revision: str | None = "615b32c09367"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_user_artifacts_rarity", "user_artifacts", type_="check")
    op.drop_constraint("ck_user_artifacts_level", "user_artifacts", type_="check")

    op.create_check_constraint(
        "ck_user_artifacts_rarity",
        "user_artifacts",
        "rarity IN (1, 2, 3, 4, 5)",
    )
    op.create_check_constraint(
        "ck_user_artifacts_level_by_rarity",
        "user_artifacts",
        "(rarity = 1 AND level <= 4) OR "
        "(rarity = 2 AND level <= 4) OR "
        "(rarity = 3 AND level <= 12) OR "
        "(rarity = 4 AND level <= 16) OR "
        "(rarity = 5 AND level <= 20)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_user_artifacts_level_by_rarity", "user_artifacts", type_="check")
    op.drop_constraint("ck_user_artifacts_rarity", "user_artifacts", type_="check")

    op.create_check_constraint(
        "ck_user_artifacts_rarity",
        "user_artifacts",
        "rarity IN (4, 5)",
    )
    op.create_check_constraint(
        "ck_user_artifacts_level",
        "user_artifacts",
        "level >= 0 AND level <= 20",
    )
