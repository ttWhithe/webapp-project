"""Admin endpoints (require Role.ADMIN)."""

from typing import Annotated

from app.api.deps import require_role
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.schemas.user import UserRead
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserRead])
async def list_users(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserRead]:
    """List all registered users. Admin-only."""
    result = await db.scalars(select(User).order_by(User.created_at))
    return [UserRead.model_validate(u) for u in result.all()]
