"""Admin endpoints (require Role.ADMIN)."""

from typing import Annotated

from app.api.deps import get_cache_service, require_role
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.schemas.admin import SyncStatsSchema
from app.schemas.user import UserRead
from app.services.cache import CacheService
from app.services.catalog_sync import CatalogSyncService
from app.services.genshin_db_client import GenshinDbClient
from fastapi import APIRouter, Depends
from redis.asyncio import Redis
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
    redis: Annotated[Redis, Depends(get_redis)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> SyncStatsSchema:
    """Fetch the catalog from genshin-db-api, upsert into DB, invalidate cache.

    WARNING: can take 30-60 seconds (hundreds of HTTP requests).
    For MVP, runs synchronously. In prod, move to a background task / Celery.
    """
    async with GenshinDbClient() as client:
        service = CatalogSyncService(db, client)
        stats = await service.sync_all()

    # Invalidate all catalog cache entries after a successful sync.
    invalidated = await cache.delete_pattern("*")

    from app.core.logging import log

    log.info("catalog_sync_completed", cache_invalidated=invalidated)

    return SyncStatsSchema.model_validate(stats)
