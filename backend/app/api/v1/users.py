"""User endpoints."""

from app.api.deps import CurrentUser
from app.schemas.user import UserRead
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def read_me(current_user: CurrentUser) -> UserRead:
    """Return the currently authenticated user."""
    return UserRead.model_validate(current_user)
