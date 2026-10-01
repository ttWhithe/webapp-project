from app.db.redis import get_redis
from app.db.session import get_db
from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe — процесс жив."""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> dict[str, str]:
    """Readiness probe — БД и Redis доступны."""
    await db.execute(text("SELECT 1"))
    await redis.ping()
    return {"status": "ready", "db": "ok", "redis": "ok"}
