import uuid
from datetime import datetime, timedelta

import stripe
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.payment import Payment, Subscription
from app.schemas.payment import DonationCreate, PaymentResponse, SubscribeCreate

stripe.api_key = settings.stripe_secret_key
FRONTEND_URL = "http://localhost:5173"


class PaymentService:
    async def create_donation(self, user_id: uuid.UUID, payload: DonationCreate) -> PaymentResponse:
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": "rub",
                            "product_data": {"name": "Донат Genshin Tracker"},
                            "unit_amount": int(payload.amount * 100),
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=f"{FRONTEND_URL}/profile?success=true",
                cancel_url=f"{FRONTEND_URL}/profile?canceled=true",
                client_reference_id=str(user_id),
                metadata={"type": "donation", "user_id": str(user_id)},
            )
            return PaymentResponse(payment_id=uuid.UUID(int=0), confirmation_url=session.url)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    async def create_subscription(
        self, user_id: uuid.UUID, payload: SubscribeCreate
    ) -> PaymentResponse:
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": "rub",
                            "product_data": {"name": "Genshin Tracker Premium"},
                            "unit_amount": 29900,
                            "recurring": {"interval": "month"},
                        },
                        "quantity": 1,
                    }
                ],
                mode="subscription",
                success_url=f"{FRONTEND_URL}/profile?success=true",
                cancel_url=f"{FRONTEND_URL}/profile?canceled=true",
                client_reference_id=str(user_id),
                metadata={"type": "subscription", "plan": payload.plan, "user_id": str(user_id)},
            )
            return PaymentResponse(payment_id=uuid.UUID(int=0), confirmation_url=session.url)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # --- НОВЫЙ МЕТОД ДЛЯ ВЕБХУКОВ ---
    async def handle_webhook(self, db: AsyncSession, payload: bytes, sig_header: str) -> None:
        print("🔐 Проверка подписи...")
        try:
            # Проверяем подпись
            event = stripe.Webhook.construct_event(  # type: ignore
                payload, sig_header, settings.stripe_webhook_secret
            )
            print("✅ Подпись валидна! Событие:", event["type"])
        except ValueError as e:
            print("❌ Invalid payload:", e)
            raise HTTPException(status_code=400, detail="Invalid payload") from e
        except stripe.SignatureVerificationError as e:
            print("❌ Invalid signature (Secret in .env does not match!):", e)
            raise HTTPException(status_code=400, detail="Invalid signature") from e

        # We only care about successful payment
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            client_ref = session.get("client_reference_id")
            if not client_ref:
                # If this is a test trigger without a user, exit without error
                print("⚠️ Вебхук получен, но нет client_reference_id (тестовый триггер)")
                return

            user_id = uuid.UUID(client_ref)
            metadata = session["metadata"]
            payment_type = metadata.get("type")

            # 1. Записываем платеж в БД
            new_payment = Payment(
                user_id=user_id,
                provider="stripe",
                external_id=session["id"],
                amount=session["amount_total"] / 100 if session.get("amount_total") else 0,
                currency=session.get("currency", "rub").upper(),
                status="succeeded",
                type=payment_type,
            )
            db.add(new_payment)

            # 2. Если это подписка, выдаем премиум
            if payment_type == "subscription":
                # Create subscription record for 30 days
                sub = Subscription(
                    user_id=user_id,
                    plan=metadata.get("plan", "premium_visual"),
                    ends_at=datetime.utcnow() + timedelta(days=30),
                    status="active",
                )
                db.add(sub)

                # Обновляем роль пользователя (для проверки в UI)
                from app.models.enums import Role
                from app.models.user import User

            user = await db.get(User, user_id)
            if user and user.role != Role.ADMIN:
                user.role = Role.PREMIUM

            await db.commit()
            print(f"✅ Успешно обработан платеж {session['id']} для юзера {user_id}")


def get_payment_service() -> PaymentService:
    return PaymentService()
