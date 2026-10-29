import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ProgressWeights(Base):
    __tablename__ = "progress_weights"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    w_level: Mapped[float] = mapped_column(Float, default=0.2)
    w_talents: Mapped[float] = mapped_column(Float, default=0.2)
    w_weapon: Mapped[float] = mapped_column(Float, default=0.2)
    w_artifacts: Mapped[float] = mapped_column(Float, default=0.2)
    w_friendship: Mapped[float] = mapped_column(Float, default=0.2)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
