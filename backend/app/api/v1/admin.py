"""Admin endpoints (require Role.ADMIN)."""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated

from app.api.deps import (
    get_artifact_set_repo,
    get_cache_service,
    get_character_repo,
    get_weapon_repo,
    require_role,
)
from app.db.redis import get_redis
from app.db.session import get_db
from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.enums import Role
from app.models.user import User
from app.models.weapon import Weapon
from app.repositories.catalog import (
    ArtifactSetRepository,
    CharacterRepository,
    WeaponRepository,
)
from app.schemas.admin import (
    AdminArtifactSetRead,
    AdminArtifactSetUpdate,
    AdminCharacterRead,
    AdminCharacterUpdate,
    AdminWeaponRead,
    AdminWeaponUpdate,
    SyncStatsSchema,
)
from app.schemas.user import UserRead
from app.services.cache import CacheService
from app.services.catalog_sync import CatalogSyncService
from app.services.genshin_db_client import GenshinDbClient
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

BACKUP_PATH = Path(__file__).resolve().parent.parent.parent / "catalog_backup.json"


async def _dump_catalog(db: AsyncSession) -> dict:
    """Собрать JSON-дамп редактируемых полей каталога."""
    chars = (await db.scalars(select(Character))).all()
    weapons = (await db.scalars(select(Weapon))).all()
    sets = (await db.scalars(select(ArtifactSet))).all()

    return {
        "created_at": datetime.utcnow().isoformat(),
        "characters": [
            {
                "external_id": c.external_id,
                "slug": c.slug,
                "name": c.name,
                "name_ru": c.name_ru,
                "title": c.title,
                "icon_url": c.icon_url,
                "portrait_url": c.portrait_url,
                "rarity": c.rarity,
                "region": c.region,
                "birthday": c.birthday,
                "version_added": c.version_added,
            }
            for c in chars
        ],
        "weapons": [
            {
                "external_id": w.external_id,
                "slug": w.slug,
                "name": w.name,
                "name_ru": w.name_ru,
                "icon_url": w.icon_url,
                "rarity": w.rarity,
                "base_atk": float(w.base_atk) if w.base_atk is not None else None,
                "main_stat": w.main_stat,
                "version_added": w.version_added,
            }
            for w in weapons
        ],
        "artifact_sets": [
            {
                "slug": s.slug,
                "name": s.name,
                "name_ru": s.name_ru,
                "icon_url": s.icon_url,
            }
            for s in sets
        ],
    }


router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- users ----------


@router.get("/users", response_model=list[UserRead])
async def list_users(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserRead]:
    result = await db.scalars(select(User).order_by(User.created_at))
    return [UserRead.model_validate(u) for u in result.all()]


# ---------- catalog sync ----------


@router.post("/catalog/sync", response_model=SyncStatsSchema)
async def sync_catalog(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: Annotated[Redis, Depends(get_redis)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> SyncStatsSchema:
    """Fetch the catalog from genshin-db-api, upsert into DB, invalidate cache."""
    # 1. Сначала сохраняем дамп текущего состояния в файл.
    backup = await _dump_catalog(db)
    BACKUP_PATH.write_text(
        json.dumps(backup, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )

    # 2. Только потом запускаем sync.
    async with GenshinDbClient() as client:
        service = CatalogSyncService(db, client)
        stats = await service.sync_all()

    invalidated = await cache.delete_pattern("*")

    from app.core.logging import log

    log.info("catalog_sync_completed", cache_invalidated=invalidated)

    return SyncStatsSchema.model_validate(stats)


# ---------- catalog backup ----------


@router.get("/catalog/backup")
async def download_backup(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    """Скачать свежий дамп каталога."""
    data = await _dump_catalog(db)
    BACKUP_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    return FileResponse(
        BACKUP_PATH,
        media_type="application/json",
        filename="catalog_backup.json",
    )


@router.post("/catalog/backup")
async def upload_backup(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    file: UploadFile = File(...),
) -> dict:
    """Загрузить JSON и залатать пустые поля. Непустые — не трогаем."""
    payload = json.loads(await file.read())
    stats = {"characters": 0, "weapons": 0, "artifact_sets": 0}

    for item in payload.get("characters", []):
        obj = await db.scalar(
            select(Character).where(Character.external_id == item.get("external_id"))
        )
        if obj is None:
            obj = await db.scalar(select(Character).where(Character.slug == item.get("slug")))
        if obj is None:
            continue
        touched = False
        for f in (
            "name_ru",
            "title",
            "icon_url",
            "portrait_url",
            "region",
            "birthday",
            "version_added",
        ):
            if getattr(obj, f, None) in (None, "") and item.get(f):
                setattr(obj, f, item[f])
                touched = True
        if touched:
            stats["characters"] += 1

    for item in payload.get("weapons", []):
        obj = await db.scalar(select(Weapon).where(Weapon.external_id == item.get("external_id")))
        if obj is None:
            obj = await db.scalar(select(Weapon).where(Weapon.slug == item.get("slug")))
        if obj is None:
            continue
        touched = False
        for f in ("name_ru", "icon_url", "base_atk", "main_stat", "version_added"):
            if getattr(obj, f, None) in (None, "") and item.get(f):
                setattr(obj, f, item[f])
                touched = True
        if touched:
            stats["weapons"] += 1

    for item in payload.get("artifact_sets", []):
        obj = await db.scalar(select(ArtifactSet).where(ArtifactSet.slug == item.get("slug")))
        if obj is None:
            continue
        touched = False
        for f in ("name_ru", "icon_url"):
            if getattr(obj, f, None) in (None, "") and item.get(f):
                setattr(obj, f, item[f])
                touched = True
        if touched:
            stats["artifact_sets"] += 1

    await db.commit()
    await cache.delete_pattern("*")
    return stats


# ---------- characters ----------


@router.get("/characters", response_model=list[AdminCharacterRead])
async def admin_list_characters(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    repo: Annotated[CharacterRepository, Depends(get_character_repo)],
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[AdminCharacterRead]:
    items, _total = await repo.list_characters(limit=limit, offset=offset)
    return [AdminCharacterRead.model_validate(c) for c in items]


@router.patch("/characters/{character_id}", response_model=AdminCharacterRead)
async def admin_update_character(
    character_id: uuid.UUID,
    payload: AdminCharacterUpdate,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    repo: Annotated[CharacterRepository, Depends(get_character_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> AdminCharacterRead:
    """Update editable fields on a character. Invalidates public catalog cache."""
    character = await repo.get_by_id(character_id)
    if character is None:
        raise HTTPException(404, "Character not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(character, field, value)

    await repo.commit()
    await repo.refresh(character)

    # Invalidate public catalog cache — the change may affect list/detail responses.
    await cache.delete_pattern("*")

    return AdminCharacterRead.model_validate(character)


# ---------- weapons ----------


@router.get("/weapons", response_model=list[AdminWeaponRead])
async def admin_list_weapons(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    repo: Annotated[WeaponRepository, Depends(get_weapon_repo)],
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[AdminWeaponRead]:
    items, _total = await repo.list_weapons(limit=limit, offset=offset)
    return [AdminWeaponRead.model_validate(w) for w in items]


@router.patch("/weapons/{weapon_id}", response_model=AdminWeaponRead)
async def admin_update_weapon(
    weapon_id: uuid.UUID,
    payload: AdminWeaponUpdate,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    repo: Annotated[WeaponRepository, Depends(get_weapon_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> AdminWeaponRead:
    weapon = await repo.get_by_id(weapon_id)
    if weapon is None:
        raise HTTPException(404, "Weapon not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(weapon, field, value)

    await repo.commit()
    await repo.refresh(weapon)
    await cache.delete_pattern("*")

    return AdminWeaponRead.model_validate(weapon)


# ---------- artifact sets ----------


@router.get("/artifact-sets", response_model=list[AdminArtifactSetRead])
async def admin_list_artifact_sets(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    repo: Annotated[ArtifactSetRepository, Depends(get_artifact_set_repo)],
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[AdminArtifactSetRead]:
    items, _total = await repo.list_sets(limit=limit, offset=offset)
    return [AdminArtifactSetRead.model_validate(s) for s in items]


@router.patch("/artifact-sets/{set_id}", response_model=AdminArtifactSetRead)
async def admin_update_artifact_set(
    set_id: uuid.UUID,
    payload: AdminArtifactSetUpdate,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    repo: Annotated[ArtifactSetRepository, Depends(get_artifact_set_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> AdminArtifactSetRead:
    artifact_set = await repo.get_by_id(set_id)
    if artifact_set is None:
        raise HTTPException(404, "ArtifactSet not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(artifact_set, field, value)

    await repo.commit()
    await repo.refresh(artifact_set)
    await cache.delete_pattern("*")

    return AdminArtifactSetRead.model_validate(artifact_set)
