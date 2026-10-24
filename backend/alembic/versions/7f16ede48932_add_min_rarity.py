"""add_min_rarity

Revision ID: 7f16ede48932
Revises: 8284024eced4
Create Date: 2026-10-24 13:29:48.999785

"""

from collections.abc import Sequence

from alembic import op

revision: str = "7f16ede48932"
down_revision: str | None = "8284024eced4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Колонка min_rarity уже была добавлена в миграции 8284024eced4.
    # Оставляем эту миграцию пустой для сохранения цепочки версий.
    pass


def downgrade() -> None:
    op.drop_column("artifact_sets", "min_rarity")
