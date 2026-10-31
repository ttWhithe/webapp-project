"""Integration tests for payments and Stripe webhooks."""

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import MagicMock, patch

import httpx
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import Role
from app.models.payment import Payment, Subscription
from app.models.user import User

VALID_PASSWORD = "password123"


def _user_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "email": "payer@example.com",
        "username": "payer",
        "password": VALID_PASSWORD,
    }
    base.update(overrides)
    return base


@pytest_asyncio.fixture
async def auth_client(async_client: httpx.AsyncClient) -> AsyncGenerator[httpx.AsyncClient, None]:
    """AsyncClient with a registered user."""
    resp = await async_client.post("/api/v1/auth/register", json=_user_payload())
    assert resp.status_code == 201, resp.text
    yield async_client


class TestPaymentEndpoints:
    @patch("stripe.checkout.Session.create")
    async def test_donate_success(
        self, mock_stripe_create: MagicMock, auth_client: httpx.AsyncClient
    ) -> None:
        # Настраиваем мок Stripe
        mock_stripe_create.return_value = MagicMock(url="https://checkout.stripe.com/test_donate")

        resp = await auth_client.post(
            "/api/v1/payments/donate",
            json={"amount": 500.0, "provider": "stripe"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "payment_id" in data
        assert data["confirmation_url"] == "https://checkout.stripe.com/test_donate"
        mock_stripe_create.assert_called_once()

    @patch("stripe.checkout.Session.create")
    async def test_subscribe_success(
        self, mock_stripe_create: MagicMock, auth_client: httpx.AsyncClient
    ) -> None:
        mock_stripe_create.return_value = MagicMock(url="https://checkout.stripe.com/test_sub")

        resp = await auth_client.post(
            "/api/v1/payments/subscribe",
            json={"plan": "premium_visual", "provider": "stripe"},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["confirmation_url"] == "https://checkout.stripe.com/test_sub"

    async def test_payment_requires_auth(self, async_client: httpx.AsyncClient) -> None:
        resp = await async_client.post(
            "/api/v1/payments/donate",
            json={"amount": 100.0, "provider": "stripe"},
        )
        assert resp.status_code == 401


class TestStripeWebhook:
    @patch("stripe.Webhook.construct_event")
    async def test_webhook_donation_success(
        self,
        mock_construct_event: MagicMock,
        auth_client: httpx.AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        # Получаем ID текущего пользователя
        me_resp = await auth_client.get("/api/v1/users/me")
        user_id = me_resp.json()["id"]

        # Мокаем событие от Stripe (донат)
        mock_construct_event.return_value = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_donate_123",
                    "client_reference_id": user_id,
                    "amount_total": 10000,  # 100.00 RUB
                    "currency": "rub",
                    "metadata": {"type": "donation"},
                }
            },
        }

        resp = await auth_client.post(
            "/api/v1/payments/webhook/stripe",
            content=b'{"fake": "payload"}',
            headers={"stripe-signature": "fake_sig"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"status": "success"}

        # Проверяем БД: должен появиться Payment
        payment = await db_session.scalar(
            select(Payment).where(Payment.external_id == "cs_test_donate_123")
        )
        assert payment is not None
        assert payment.amount == 100.0
        assert payment.type == "donation"

        # Проверяем БД: роль не должна поменяться на premium
        user = await db_session.get(User, uuid.UUID(user_id))
        assert user.role == Role.USER

    @patch("stripe.Webhook.construct_event")
    async def test_webhook_subscription_success(
        self,
        mock_construct_event: MagicMock,
        auth_client: httpx.AsyncClient,
        db_session: AsyncSession,
    ) -> None:
        me_resp = await auth_client.get("/api/v1/users/me")
        user_id = me_resp.json()["id"]

        # Мокаем событие (подписка)
        mock_construct_event.return_value = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_sub_123",
                    "client_reference_id": user_id,
                    "amount_total": 29900,
                    "currency": "rub",
                    "metadata": {"type": "subscription", "plan": "premium_visual"},
                }
            },
        }

        resp = await auth_client.post(
            "/api/v1/payments/webhook/stripe",
            content=b'{"fake": "payload"}',
            headers={"stripe-signature": "fake_sig"},
        )
        assert resp.status_code == 200

        # Проверяем Payment
        payment = await db_session.scalar(
            select(Payment).where(Payment.external_id == "cs_test_sub_123")
        )
        assert payment is not None
        assert payment.type == "subscription"

        # Проверяем Subscription
        sub = await db_session.scalar(
            select(Subscription).where(Subscription.user_id == uuid.UUID(user_id))
        )
        assert sub is not None
        assert sub.plan == "premium_visual"
        assert sub.status == "active"

        # Проверяем, что роль обновилась
        user = await db_session.get(User, uuid.UUID(user_id))
        assert user.role == Role.PREMIUM

    @patch("stripe.Webhook.construct_event")
    async def test_webhook_invalid_signature(
        self, mock_construct_event: MagicMock, async_client: httpx.AsyncClient
    ) -> None:
        # Мокаем ошибку проверки подписи
        mock_construct_event.side_effect = ValueError("Invalid payload")

        resp = await async_client.post(
            "/api/v1/payments/webhook/stripe",
            content=b'{"fake": "payload"}',
            headers={"stripe-signature": "invalid_sig"},
        )
        assert resp.status_code == 400
        assert "Invalid payload" in resp.json()["detail"]
