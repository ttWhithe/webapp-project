import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ArtifactSet(Base):
    """Catalog entry: an artifact set."""

    __tablename__ = "artifact_sets"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    external_id: Mapped[int | None] = mapped_column(
        Integer,
        unique=True,
        index=True,
        nullable=True,
    )
    slug: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    name_ru: Mapped[str | None] = mapped_column(String(150), nullable=True)
    max_rarity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_rarity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bonus_2pc: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    bonus_4pc: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_plume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_sands_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_goblet_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_circlet_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
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

    def __repr__(self) -> str:
        return f"<ArtifactSet slug={self.slug!r} name={self.name!r}>"
