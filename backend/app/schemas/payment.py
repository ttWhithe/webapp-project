import uuid

from pydantic import BaseModel, Field


class DonationCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Сумма доната")
    provider: str = Field(..., description="'stripe' или 'yookassa'")


class SubscribeCreate(BaseModel):
    plan: str = Field("premium_visual", description="Название плана")
    provider: str = Field(..., description="'stripe' или 'yookassa'")


class PaymentResponse(BaseModel):
    payment_id: uuid.UUID
    confirmation_url: str  # Ссылка, куда перенаправить пользователя для оплаты
