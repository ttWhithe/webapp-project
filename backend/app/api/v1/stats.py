from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.models.user_character import UserCharacter
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/global")
async def get_global_stats(db: AsyncSession = Depends(get_db)):
    total_users = await db.scalar(select(func.count()).select_from(User))
    total_premium = await db.scalar(
        select(func.count()).select_from(User).where(User.role == Role.PREMIUM)
    )
    total_characters = await db.scalar(select(func.count()).select_from(UserCharacter))

    return {
        "users": total_users or 0,
        "premiums": total_premium or 0,
        "tracked_characters": total_characters or 0,
    }
