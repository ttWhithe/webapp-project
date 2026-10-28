import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # 'stripe' или 'yookassa'
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    # ID транзакции в платежной системе (для идемпотентности)
    external_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="RUB")

    # 'pending', 'succeeded', 'canceled'
    status: Mapped[str] = mapped_column(String(50), default="pending")

    # 'donation' или 'subscription'
    type: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship with user (optional)
    # user: Mapped["User"] = relationship(back_populates="payments")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Название плана (например, 'premium_visual')
    plan: Mapped[str] = mapped_column(String(50), nullable=False)

    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # 'active', 'canceled', 'expired'
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Флаг для авто-продления (если делаем рекуррентные платежи)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
