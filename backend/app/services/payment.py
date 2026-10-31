import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import stripe
from aioyookassa import YooKassa
from aioyookassa.types.enum import ConfirmationType, Currency
from aioyookassa.types.params import CreatePaymentParams
from aioyookassa.types.payment import Confirmation, Money
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import Role
from app.models.payment import Payment, Subscription
from app.models.user import User
from app.schemas.payment import DonationCreate, PaymentResponse, SubscribeCreate

stripe.api_key = settings.stripe_secret_key
FRONTEND_URL = "http://localhost:5173"


class PaymentService:
    async def create_donation(self, user_id: uuid.UUID, payload: DonationCreate) -> PaymentResponse:
        if payload.provider == "yookassa":
            return await self._create_yookassa_payment(
                user_id=user_id,
                amount=payload.amount,
                description="Донат Genshin Tracker",
                payment_type="donation",
                plan=None,
            )

        # Stripe (по умолчанию)
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
        if payload.provider == "yookassa":
            return await self._create_yookassa_payment(
                user_id=user_id,
                amount=299.00,
                description="Genshin Tracker Premium",
                payment_type="subscription",
                plan=payload.plan,
            )

        # Stripe
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

    async def _create_yookassa_payment(
        self,
        user_id: uuid.UUID,
        amount: float,
        description: str,
        payment_type: str,
        plan: str | None,
    ) -> PaymentResponse:
        try:
            client = YooKassa(
                api_key=settings.yookassa_secret_key,
                shop_id=settings.yookassa_shop_id,
            )
            params = CreatePaymentParams(
                amount=Money(value=amount, currency=Currency.RUB),
                confirmation=Confirmation(
                    type=ConfirmationType.REDIRECT,
                    return_url=f"{FRONTEND_URL}/profile?success=true",
                ),
                capture=True,
                description=description,
                metadata={
                    "user_id": str(user_id),
                    "type": payment_type,
                    "plan": plan or "",
                },
            )
            payment = await client.payments.create_payment(params)
            await client.close()
            return PaymentResponse(
                payment_id=uuid.UUID(int=0),
                confirmation_url=payment.confirmation.confirmation_url,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    async def handle_stripe_webhook(
        self, db: AsyncSession, payload: bytes, sig_header: str
    ) -> None:
        print("🔐 Проверка подписи...")
        try:
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

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            client_ref = session.get("client_reference_id")
            if not client_ref:
                print("⚠️ Вебхук получен, но нет client_reference_id (тестовый триггер)")
                return

            user_id = uuid.UUID(client_ref)
            metadata = session["metadata"]
            payment_type = metadata.get("type")

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

            if payment_type == "subscription":
                sub = Subscription(
                    user_id=user_id,
                    plan=metadata.get("plan", "premium_visual"),
                    ends_at=datetime.now(UTC) + timedelta(days=30),
                    status="active",
                )
                db.add(sub)

                user = await db.get(User, user_id)
                if user and user.role != Role.ADMIN:
                    user.role = Role.PREMIUM

            await db.commit()
            print(f"✅ Успешно обработан платеж {session['id']} для юзера {user_id}")

    async def handle_yookassa_webhook(self, db: AsyncSession, payload: dict[str, Any]) -> None:
        event = payload.get("event")
        if event != "payment.succeeded":
            return

        obj = payload.get("object", {})
        metadata = obj.get("metadata", {})
        user_id_str = metadata.get("user_id")
        if not user_id_str:
            return

        user_id = uuid.UUID(user_id_str)
        payment_type = metadata.get("type")
        external_id = obj.get("id")
        amount = float(obj.get("amount", {}).get("value", 0))

        # Идемпотентность
        existing = await db.scalar(select(Payment).where(Payment.external_id == external_id))
        if existing:
            return

        new_payment = Payment(
            user_id=user_id,
            provider="yookassa",
            external_id=external_id,
            amount=amount,
            currency="RUB",
            status="succeeded",
            type=payment_type,
        )
        db.add(new_payment)

        if payment_type == "subscription":
            sub = Subscription(
                user_id=user_id,
                plan=metadata.get("plan", "premium_visual"),
                ends_at=datetime.now(UTC) + timedelta(days=30),
                status="active",
            )
            db.add(sub)

            user = await db.get(User, user_id)
            if user and user.role != Role.ADMIN:
                user.role = Role.PREMIUM

        await db.commit()


def get_payment_service() -> PaymentService:
    return PaymentService()
