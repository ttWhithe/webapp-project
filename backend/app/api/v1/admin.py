"""Admin endpoints (require Role.ADMIN)."""

import contextlib
import json
import random
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
    AdminArtifactSetCreate,
    AdminArtifactSetRead,
    AdminArtifactSetUpdate,
    AdminCharacterCreate,
    AdminCharacterRead,
    AdminWeaponCreate,
    AdminWeaponRead,
    AdminWeaponUpdate,
    SyncStatsSchema,
)
from app.schemas.user import UserRead
from app.services.cache import CacheService
from app.services.catalog_mappers import to_element, to_slug, to_weapon_type
from app.services.catalog_sync import CatalogSyncService
from app.services.genshin_db_client import GenshinDbClient
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
) -> list[AdminCharacterRead]:
    items, _total = await repo.list_characters(limit=limit, offset=offset)
    return [AdminCharacterRead.model_validate(c) for c in items]


@router.post("/characters/{character_id}/import-parser", response_model=AdminCharacterRead)
async def import_character_from_parser(
    character_id: uuid.UUID,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    file: UploadFile = File(...),
) -> AdminCharacterRead:
    """Загружает JSON от парсера и обновляет данные конкретного персонажа."""
    char = await db.get(Character, character_id)
    if char is None:
        raise HTTPException(404, "Character not found")

    try:
        content = json.loads(await file.read())
    except Exception as err:
        raise HTTPException(400, "Invalid JSON file") from err

    # Ищем персонажа по имени (парсер использует имя как ключ)
    char_data = content.get(char.name)

    # Если вдруг имя чуть другое, ищем без учета регистра
    if not char_data:
        for k, v in content.items():
            if k.lower() == char.name.lower():
                char_data = v
                break

    if not char_data:
        raise HTTPException(404, f"Персонаж {char.name} не найден в загруженном JSON")

    # Мапим поля
    if "title" in char_data:
        char.title = char_data["title"]
    if "release_date" in char_data:
        char.release_date = char_data["release_date"]

    if "images" in char_data:
        img = char_data["images"]
        if img.get("character_icon"):
            char.icon_url = img["character_icon"]
        if img.get("full_wish"):
            char.portrait_url = img["full_wish"]
        if img.get("namecard"):
            char.namecard_url = img["namecard"]
        if img.get("constellation"):
            char.constellation_icon_url = img["constellation"]

    if "talents" in char_data:
        char.talents = char_data["talents"]

    if "constellations" in char_data:
        char.constellations = char_data["constellations"]
        # Извлекаем C3 и C5
        c3 = char_data["constellations"].get("3", {})
        if "increases" in c3:
            char.c3_increases = c3["increases"]

        c5 = char_data["constellations"].get("5", {})
        if "increases" in c5:
            char.c5_increases = c5["increases"]

    if "other_languages" in char_data and "Russian" in char_data["other_languages"]:
        char.name_ru = char_data["other_languages"]["Russian"]

    await db.commit()
    await db.refresh(char)
    await cache.delete_pattern("*")

    return AdminCharacterRead.model_validate(char)


# ---------- weapons ----------


@router.get("/weapons", response_model=list[AdminWeaponRead])
async def admin_list_weapons(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    repo: Annotated[WeaponRepository, Depends(get_weapon_repo)],
    limit: int = Query(500, ge=1, le=2000),
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
    limit: int = Query(500, ge=1, le=2000),
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


@router.post("/weapons/{weapon_id}/import-parser", response_model=AdminWeaponRead)
async def import_weapon_from_parser(
    weapon_id: uuid.UUID,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    file: UploadFile = File(...),
) -> AdminWeaponRead:
    weapon = await db.get(Weapon, weapon_id)
    if weapon is None:
        raise HTTPException(404, "Weapon not found")

    try:
        content = json.loads(await file.read())
    except Exception as err:
        raise HTTPException(400, "Invalid JSON file") from err

    data = content.get(weapon.name)
    if not data:
        for k, v in content.items():
            if k.lower() == weapon.name.lower():
                data = v
                break
    if not data:
        raise HTTPException(404, f"Оружие {weapon.name} не найдено в JSON")

    if "base_atk" in data and isinstance(data["base_atk"], dict) and data["base_atk"].get("lvl_90"):
        try:
            val = str(data["base_atk"]["lvl_90"]).replace(",", "")
            weapon.base_atk = float(val)
        except ValueError:
            pass

    if (
        "secondary_stat" in data
        and isinstance(data["secondary_stat"], dict)
        and data["secondary_stat"].get("name")
    ):
        weapon.main_stat = data["secondary_stat"]["name"]

    if "passive" in data and isinstance(data["passive"], dict):
        weapon.passive_name = data["passive"].get("name")
        weapon.passive_desc = data["passive"].get("description")

    if "images" in data and isinstance(data["images"], dict):
        if data["images"].get("base"):
            weapon.icon_url = data["images"]["base"]
        if data["images"].get("awakened"):
            weapon.icon_awakened_url = data["images"]["awakened"]

    await db.commit()
    await db.refresh(weapon)
    await cache.delete_pattern("*")
    return AdminWeaponRead.model_validate(weapon)


@router.post("/artifact-sets/{set_id}/import-parser", response_model=AdminArtifactSetRead)
async def import_artifact_from_parser(
    set_id: uuid.UUID,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    file: UploadFile = File(...),
) -> AdminArtifactSetRead:
    artifact = await db.get(ArtifactSet, set_id)
    if artifact is None:
        raise HTTPException(404, "ArtifactSet not found")

    try:
        content = json.loads(await file.read())
    except Exception as err:
        raise HTTPException(400, "Invalid JSON file") from err

    data = content.get(artifact.name)
    if not data:
        for k, v in content.items():
            if k.lower() == artifact.name.lower():
                data = v
                break
    if not data:
        raise HTTPException(404, f"Сет {artifact.name} не найден в JSON")

    if "quality" in data and isinstance(data["quality"], list) and data["quality"]:
        artifact.max_rarity = max(data["quality"])
        artifact.min_rarity = min(data["quality"])

    if "bonuses" in data and isinstance(data["bonuses"], dict):
        artifact.bonus_2pc = data["bonuses"].get("2pc")
        artifact.bonus_4pc = data["bonuses"].get("4pc")

    if "images" in data and isinstance(data["images"], dict):
        img = data["images"]
        if img.get("flower"):
            artifact.icon_url = img["flower"]
        if img.get("plume"):
            artifact.icon_plume_url = img["plume"]
        if img.get("sands"):
            artifact.icon_sands_url = img["sands"]
        if img.get("goblet"):
            artifact.icon_goblet_url = img["goblet"]
        if img.get("circlet"):
            artifact.icon_circlet_url = img["circlet"]

    await db.commit()
    await db.refresh(artifact)
    await cache.delete_pattern("*")
    return AdminArtifactSetRead.model_validate(artifact)


@router.post("/characters", response_model=AdminCharacterRead)
async def admin_create_character(
    payload: AdminCharacterCreate,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> AdminCharacterRead:
    slug = payload.slug or to_slug(payload.name)
    # Generate a random negative external_id to avoid API conflicts
    ext_id = -random.randint(100000, 999999)

    char = Character(
        id=uuid.uuid4(),
        external_id=ext_id,
        slug=slug,
        name=payload.name,
        element=payload.element,
        weapon_type=payload.weapon_type,
        rarity=payload.rarity,
    )
    db.add(char)
    await db.commit()
    await db.refresh(char)
    await cache.delete_pattern("*")
    return AdminCharacterRead.model_validate(char)


@router.post("/weapons", response_model=AdminWeaponRead)
async def admin_create_weapon(
    payload: AdminWeaponCreate,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> AdminWeaponRead:
    slug = payload.slug or to_slug(payload.name)
    ext_id = -random.randint(100000, 999999)

    weapon = Weapon(
        id=uuid.uuid4(),
        external_id=ext_id,
        slug=slug,
        name=payload.name,
        weapon_type=payload.weapon_type,
        rarity=payload.rarity,
    )
    db.add(weapon)
    await db.commit()
    await db.refresh(weapon)
    await cache.delete_pattern("*")
    return AdminWeaponRead.model_validate(weapon)


@router.post("/artifact-sets", response_model=AdminArtifactSetRead)
async def admin_create_artifact_set(
    payload: AdminArtifactSetCreate,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> AdminArtifactSetRead:
    slug = payload.slug or to_slug(payload.name)

    artifact = ArtifactSet(
        id=uuid.uuid4(),
        slug=slug,
        name=payload.name,
    )
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)
    await cache.delete_pattern("*")
    return AdminArtifactSetRead.model_validate(artifact)


@router.delete("/characters/{character_id}")
async def admin_delete_character(
    character_id: uuid.UUID,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> dict:
    char = await db.get(Character, character_id)
    if not char:
        raise HTTPException(404, "Character not found")
    try:
        await db.delete(char)
        await db.commit()
        await cache.delete_pattern("*")
        return {"status": "ok"}
    except IntegrityError as err:
        await db.rollback()
        raise HTTPException(
            400, "Нельзя удалить: персонаж уже добавлен в трекер пользователям"
        ) from err


@router.delete("/weapons/{weapon_id}")
async def admin_delete_weapon(
    weapon_id: uuid.UUID,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> dict:
    weapon = await db.get(Weapon, weapon_id)
    if not weapon:
        raise HTTPException(404, "Weapon not found")
    try:
        await db.delete(weapon)
        await db.commit()
        await cache.delete_pattern("*")
        return {"status": "ok"}
    except IntegrityError as err:
        await db.rollback()
        raise HTTPException(400, "Нельзя удалить: оружие уже используется пользователями") from err


@router.delete("/artifact-sets/{set_id}")
async def admin_delete_artifact_set(
    set_id: uuid.UUID,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> dict:
    artifact = await db.get(ArtifactSet, set_id)
    if not artifact:
        raise HTTPException(404, "ArtifactSet not found")
    try:
        await db.delete(artifact)
        await db.commit()
        await cache.delete_pattern("*")
        return {"status": "ok"}
    except IntegrityError as err:
        await db.rollback()
        raise HTTPException(400, "Нельзя удалить: сет используется пользователями") from err


@router.post("/catalog/bulk-import")
async def bulk_import_catalog(
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    db: Annotated[AsyncSession, Depends(get_db)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    force: bool = Form(False),  # <--- ДОБАВИЛИ ЭТО
    heroes_file: UploadFile | None = File(None),
    weapons_file: UploadFile | None = File(None),
    artifacts_file: UploadFile | None = File(None),
) -> dict:
    """Bulk import from JSON parser with smart comparison."""
    from datetime import timedelta

    stats = {
        "characters": {"added": 0, "updated": 0, "skipped": 0},
        "weapons": {"added": 0, "updated": 0, "skipped": 0},
        "artifact_sets": {"added": 0, "updated": 0, "skipped": 0},
    }

    def is_manually_edited(obj) -> bool:
        if not obj.created_at or not obj.updated_at:
            return False
        return (obj.updated_at - obj.created_at) > timedelta(seconds=5)

    # --- Персонажи ---
    if heroes_file:
        content = json.loads(await heroes_file.read())
        existing_chars = {c.name: c for c in (await db.scalars(select(Character))).all()}

        for name, data in content.items():
            obj = existing_chars.get(name)
            if not obj:
                slug = to_slug(name)
                try:
                    el = to_element(str(data.get("element", "")))
                    wt = to_weapon_type(str(data.get("weapon_type", "")))
                except ValueError:
                    stats["characters"]["skipped"] += 1
                    continue

                obj = Character(
                    id=uuid.uuid4(),
                    external_id=-random.randint(1000000, 9999999),
                    slug=slug,
                    name=name,
                    element=el,
                    weapon_type=wt,
                    rarity=data.get("rarity", 5),
                )
                db.add(obj)
                stats["characters"]["added"] += 1
            elif not force and is_manually_edited(obj):
                stats["characters"]["skipped"] += 1
                continue

            if "title" in data:
                obj.title = data["title"]
            if "release_date" in data:
                obj.release_date = data["release_date"]
            if "talents" in data:
                obj.talents = data["talents"]
            if "constellations" in data:
                obj.constellations = data["constellations"]
            if "other_languages" in data and "Russian" in data["other_languages"]:
                obj.name_ru = data["other_languages"]["Russian"]
            if "images" in data:
                img = data["images"]
                if img.get("character_icon"):
                    obj.icon_url = img["character_icon"]
                if img.get("full_wish"):
                    obj.portrait_url = img["full_wish"]
                if img.get("namecard"):
                    obj.namecard_url = img["namecard"]
                if img.get("constellation"):
                    obj.constellation_icon_url = img["constellation"]
            if "constellations" in data:
                c3 = data["constellations"].get("3", {})
                if "increases" in c3:
                    obj.c3_increases = c3["increases"]
                c5 = data["constellations"].get("5", {})
                if "increases" in c5:
                    obj.c5_increases = c5["increases"]

            if obj in existing_chars.values():
                stats["characters"]["updated"] += 1

    # --- Оружие ---
    if weapons_file:
        content = json.loads(await weapons_file.read())
        existing_weapons = {w.name: w for w in (await db.scalars(select(Weapon))).all()}

        for name, data in content.items():
            if name == "_placeholders":
                continue
            obj = existing_weapons.get(name)
            if not obj:
                try:
                    wt = to_weapon_type(str(data.get("weapon_type", "")))
                except ValueError:
                    stats["weapons"]["skipped"] += 1
                    continue

                obj = Weapon(
                    id=uuid.uuid4(),
                    external_id=-random.randint(1000000, 9999999),
                    slug=to_slug(name),
                    name=name,
                    weapon_type=wt,
                    rarity=data.get("quality", 4),
                )
                db.add(obj)
                stats["weapons"]["added"] += 1
            elif not force and is_manually_edited(obj):
                stats["weapons"]["skipped"] += 1
                continue

            if (
                "base_atk" in data
                and isinstance(data["base_atk"], dict)
                and data["base_atk"].get("lvl_90")
            ):
                try:
                    with contextlib.suppress(ValueError):
                        obj.base_atk = float(str(data["base_atk"]["lvl_90"]).replace(",", ""))
                except ValueError:
                    pass
            if "secondary_stat" in data and isinstance(data["secondary_stat"], dict):
                obj.main_stat = data["secondary_stat"].get("name")
            if "passive" in data and isinstance(data["passive"], dict):
                obj.passive_name = data["passive"].get("name")
                obj.passive_desc = data["passive"].get("description")
            if "images" in data and isinstance(data["images"], dict):
                if data["images"].get("base"):
                    obj.icon_url = data["images"]["base"]
                if data["images"].get("awakened"):
                    obj.icon_awakened_url = data["images"]["awakened"]

            if obj in existing_weapons.values():
                stats["weapons"]["updated"] += 1

    # --- Артефакты ---
    if artifacts_file:
        content = json.loads(await artifacts_file.read())
        existing_sets = {a.name: a for a in (await db.scalars(select(ArtifactSet))).all()}

        for name, data in content.items():
            if name.startswith("_"):
                continue
            obj = existing_sets.get(name)
            if not obj:
                obj = ArtifactSet(id=uuid.uuid4(), slug=to_slug(name), name=name)
                db.add(obj)
                stats["artifact_sets"]["added"] += 1
            elif not force and is_manually_edited(obj):
                stats["artifact_sets"]["skipped"] += 1
                continue

            if "quality" in data and isinstance(data["quality"], list) and data["quality"]:
                obj.max_rarity = max(data["quality"])
                obj.min_rarity = min(data["quality"])
            if "bonuses" in data and isinstance(data["bonuses"], dict):
                obj.bonus_2pc = data["bonuses"].get("2pc")
                obj.bonus_4pc = data["bonuses"].get("4pc")
            if "images" in data and isinstance(data["images"], dict):
                img = data["images"]
                if img.get("flower"):
                    obj.icon_url = img["flower"]
                if img.get("plume"):
                    obj.icon_plume_url = img["plume"]
                if img.get("sands"):
                    obj.icon_sands_url = img["sands"]
                if img.get("goblet"):
                    obj.icon_goblet_url = img["goblet"]
                if img.get("circlet"):
                    obj.icon_circlet_url = img["circlet"]

            if obj in existing_sets.values():
                stats["artifact_sets"]["updated"] += 1

    await db.commit()
    await cache.delete_pattern("*")
    return stats
