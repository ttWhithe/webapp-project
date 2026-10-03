"""Admin endpoints (require Role.ADMIN)."""

from typing import Annotated

from app.api.deps import require_role
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.schemas.admin import SyncStatsSchema
from app.schemas.user import UserRead
from app.services.catalog_sync import CatalogSyncService
from app.services.genshin_db_client import GenshinDbClient
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


@router.post("/catalog/sync", response_model=SyncStatsSchema)
async def sync_catalog(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SyncStatsSchema:
    """Fetch the catalog from genshin-db-api and upsert into our DB.

    WARNING: this can take 30-60 seconds (hundreds of HTTP requests).
    For MVP, we run it synchronously. In prod, move to a background task / Celery.
    """
    async with GenshinDbClient() as client:
        service = CatalogSyncService(db, client)
        stats = await service.sync_all()
    return SyncStatsSchema.model_validate(stats)
