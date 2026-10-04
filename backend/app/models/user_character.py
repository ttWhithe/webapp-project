from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user_artifact import UserArtifact


class UserCharacter(Base):
    """A user's tracked character with progression data.

    Progress fields (used by the progress formula):
        level, friendship, talent_normal/skill/burst, weapon (level/refinement),
        artifacts (via UserArtifact).

    Not used by the progress formula, but shown on UI / used for sorting:
        constellation, crowns_used (computed), level_cap, masterless_stella_fortuna,
        custom_* stats, custom images.
    """

    __tablename__ = "user_characters"
    __table_args__ = (
        UniqueConstraint("user_id", "character_id", name="uq_user_characters_user_character"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    character_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Progression (in formula) ---
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    friendship: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    talent_normal: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    talent_skill: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    talent_burst: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # --- Weapon (in formula, nullable if user hasn't set it yet) ---
    weapon_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("weapons.id", ondelete="SET NULL"),
        nullable=True,
    )
    weapon_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weapon_refinement: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # --- Not in formula ---
    constellation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    level_cap: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    masterless_stella_fortuna: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # --- Custom images (nullable: use catalog defaults when None) ---
    custom_icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    custom_portrait_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    custom_background_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- Custom stats (notes, not in formula, used for sorting) ---
    custom_hp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_atk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_def: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_em: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_crit_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    custom_crit_dmg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    custom_energy_recharge: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    custom_elemental_dmg_bonus: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)

    # --- Meta ---
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    artifacts: Mapped[list[UserArtifact]] = relationship(
        "UserArtifact",
        back_populates="user_character",
        cascade="all, delete-orphan",
    )

    @property
    def crowns_used(self) -> int:
        """Number of talents raised past level 9 (i.e. crowned, 10+)."""
        return sum(1 for t in (self.talent_normal, self.talent_skill, self.talent_burst) if t >= 10)

    def __repr__(self) -> str:
        return f"<UserCharacter id={self.id} character_id={self.character_id} level={self.level}>"
