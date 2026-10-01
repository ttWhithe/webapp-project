import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Uuid, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.enums import Element, WeaponType


class Character(Base):
    """Catalog entry: a playable character."""

    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    external_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        index=True,
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(
        String(80),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ru: Mapped[str | None] = mapped_column(String(120), nullable=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    element: Mapped[Element] = mapped_column(
        SAEnum(
            Element,
            name="character_element",
            native_enum=False,
            length=20,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        index=True,
    )
    weapon_type: Mapped[WeaponType] = mapped_column(
        SAEnum(
            WeaponType,
            name="character_weapon_type",
            native_enum=False,
            length=20,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        index=True,
    )
    rarity: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    region: Mapped[str | None] = mapped_column(String(80), nullable=True)
    birthday: Mapped[str | None] = mapped_column(String(20), nullable=True)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    portrait_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version_added: Mapped[str | None] = mapped_column(String(10), nullable=True)
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
        return f"<Character slug={self.slug!r} name={self.name!r}>"
