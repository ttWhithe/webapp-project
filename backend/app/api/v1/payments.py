from typing import Annotated, Any

from app.api.deps import CurrentUser
from app.db.session import get_db
from app.schemas.payment import DonationCreate, PaymentResponse, SubscribeCreate
from app.services.payment import PaymentService, get_payment_service
from fastapi import APIRouter, Body, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/donate", response_model=PaymentResponse)
async def donate(
    payload: DonationCreate,
    current_user: CurrentUser,
    service: Annotated[PaymentService, Depends(get_payment_service)],
) -> PaymentResponse:
    return await service.create_donation(current_user.id, payload)


@router.post("/subscribe", response_model=PaymentResponse)
async def subscribe(
    payload: SubscribeCreate,
    current_user: CurrentUser,
    service: Annotated[PaymentService, Depends(get_payment_service)],
) -> PaymentResponse:
    return await service.create_subscription(current_user.id, payload)


# --- NEW WEBHOOK ROUTE ---
@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
) -> dict[str, str]:
    print("\n" + "=" * 50)
    print("🚨 WEBHOOK RECEIVED FROM STRIPE")
    print(f"Подпись (Header): {stripe_signature}")
    print("=" * 50 + "\n")

    payload = await request.body()
    try:
        await service.handle_stripe_webhook(db, payload, stripe_signature)
        return {"status": "success"}
    except Exception as e:
        print(f"❌ ОШИБКА ПРИ ОБРАБОТКЕ ВЕБХУКА: {e}")
        raise


@router.post("/webhook/yookassa")
async def yookassa_webhook(
    payload: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
) -> dict[str, str]:
    try:
        await service.handle_yookassa_webhook(db, payload)
        return {"status": "success"}
    except Exception as e:
        print(f"❌ ОШИБКА ПРИ ОБРАБОТКЕ ВЕБХУКА ЮKASSA: {e}")
        raise
