from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import ArtifactSlot

if TYPE_CHECKING:
    from app.models.artifact_set import ArtifactSet
    from app.models.user_character import UserCharacter


class UserArtifact(Base):
    """One of 5 artifact slots on a user's tracked character.

    `substats` is a JSONB list of {"stat": str, "value": number} entries,
    because artifact substats are inherently variable-length (3-4 items)
    and their composition changes freely.
    """

    __tablename__ = "user_artifacts"
    __table_args__ = (
        UniqueConstraint("user_character_id", "slot", name="uq_user_artifacts_char_slot"),
        CheckConstraint(
            "rarity IN (1, 2, 3, 4, 5)",
            name="ck_user_artifacts_rarity",
        ),
        CheckConstraint(
            "(rarity = 1 AND level <= 4) OR "
            "(rarity = 2 AND level <= 4) OR "
            "(rarity = 3 AND level <= 12) OR "
            "(rarity = 4 AND level <= 16) OR "
            "(rarity = 5 AND level <= 20)",
            name="ck_user_artifacts_level_by_rarity",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    user_character_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("user_characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slot: Mapped[ArtifactSlot] = mapped_column(
        SAEnum(
            ArtifactSlot,
            name="artifact_slot",
            native_enum=False,
            length=20,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    set_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("artifact_sets.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    rarity: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    main_stat: Mapped[str | None] = mapped_column(String(80), nullable=True)
    substats: Mapped[list[dict[str, object]] | None] = mapped_column(JSONB, nullable=True)

    # --- Relationship ---
    user_character: Mapped[UserCharacter] = relationship(
        "UserCharacter",
        back_populates="artifacts",
    )
    artifact_set: Mapped[ArtifactSet] = relationship("ArtifactSet")

    def __repr__(self) -> str:
        return f"<UserArtifact slot={self.slot} set_id={self.set_id} level={self.level}>"
