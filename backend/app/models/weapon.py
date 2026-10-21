import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, String, Uuid, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.enums import WeaponType


class Weapon(Base):
    """Catalog entry: a weapon."""

    __tablename__ = "weapons"

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
        String(120),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    name_ru: Mapped[str | None] = mapped_column(String(150), nullable=True)
    weapon_type: Mapped[WeaponType] = mapped_column(
        SAEnum(
            WeaponType,
            name="weapon_type",
            native_enum=False,
            length=20,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        index=True,
    )
    rarity: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    base_atk: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    main_stat: Mapped[str | None] = mapped_column(String(80), nullable=True)
    passive_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    passive_desc: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    icon_awakened_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
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
        return f"<Weapon slug={self.slug!r} name={self.name!r}>"
