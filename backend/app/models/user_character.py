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
    from app.models.character import Character
    from app.models.user_artifact import UserArtifact
    from app.models.weapon import Weapon


class UserCharacter(Base):
    """A user's tracked character with progression data."""

    __tablename__ = "user_characters"
    __table_args__ = (
        UniqueConstraint("user_id", "character_id", name="uq_user_characters_user_character"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
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

    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    friendship: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    talent_normal: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    talent_skill: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    talent_burst: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    weapon_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("weapons.id", ondelete="SET NULL"),
        nullable=True,
    )
    weapon_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weapon_refinement: Mapped[int | None] = mapped_column(Integer, nullable=True)

    constellation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    level_cap: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    masterless_stella_fortuna: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    custom_icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    custom_portrait_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    custom_background_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    custom_hp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_atk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_def: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_em: Mapped[int | None] = mapped_column(Integer, nullable=True)
    custom_crit_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    custom_crit_dmg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    custom_energy_recharge: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    custom_elemental_dmg_bonus: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --- Relationships ---
    character: Mapped[Character] = relationship("Character")
    weapon: Mapped[Weapon | None] = relationship("Weapon")
    artifacts: Mapped[list[UserArtifact]] = relationship(
        "UserArtifact",
        back_populates="user_character",
        cascade="all, delete-orphan",
    )

    @property
    def crowns_used(self) -> int:
        return sum(1 for t in (self.talent_normal, self.talent_skill, self.talent_burst) if t >= 10)

    def __repr__(self) -> str:
        return f"<UserCharacter id={self.id} level={self.level}>"
