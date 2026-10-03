"""Public catalog endpoints: characters, weapons, artifact sets.

Read-heavy, rarely changing data. All list/detail responses are cached in
Redis for settings.catalog_cache_ttl seconds. Cache is invalidated on catalog
sync (see admin.sync_catalog).
"""

from typing import Annotated

from app.api.deps import (
    get_artifact_set_repo,
    get_cache_service,
    get_character_repo,
    get_weapon_repo,
)
from app.core.config import settings
from app.models.enums import Element, WeaponType
from app.repositories.catalog import (
    ArtifactSetRepository,
    CharacterRepository,
    WeaponRepository,
)
from app.schemas.catalog import (
    ArtifactSetRead,
    CharacterRead,
    Page,
    WeaponRead,
)
from app.services.cache import CacheService
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter(tags=["catalog"])


# ---------- characters ----------


@router.get("/characters", response_model=Page[CharacterRead])
async def list_characters(
    repo: Annotated[CharacterRepository, Depends(get_character_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    element: Element | None = None,
    weapon_type: WeaponType | None = None,
    rarity: int | None = Query(None, ge=1, le=5),
    sort: str = Query("name_asc", pattern="^(name_asc|rarity_desc|version_desc)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[CharacterRead]:
    """List characters with optional filters, sorting, and pagination."""
    params = {
        "element": element.value if element else None,
        "weapon_type": weapon_type.value if weapon_type else None,
        "rarity": rarity,
        "sort": sort,
        "limit": limit,
        "offset": offset,
    }
    cache_key = f"characters:list:{CacheService.hash_query(params)}"

    cached = await cache.get_json(cache_key)
    if cached is not None:
        return Page[CharacterRead].model_validate(cached)

    items, total = await repo.list_characters(
        element=element,
        weapon_type=weapon_type,
        rarity=rarity,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    page = Page[CharacterRead](
        items=[CharacterRead.model_validate(c) for c in items],
        total=total,
        limit=limit,
        offset=offset,
    )
    await cache.set_json(cache_key, page.model_dump(mode="json"), settings.catalog_cache_ttl)
    return page


@router.get("/characters/{slug}", response_model=CharacterRead)
async def get_character(
    slug: str,
    repo: Annotated[CharacterRepository, Depends(get_character_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> CharacterRead:
    """Return one character by slug (e.g. 'hu-tao')."""
    cache_key = f"characters:slug:{slug}"
    cached = await cache.get_json(cache_key)
    if cached is not None:
        return CharacterRead.model_validate(cached)

    character = await repo.get_by_slug(slug)
    if character is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Character '{slug}' not found",
        )
    result = CharacterRead.model_validate(character)
    await cache.set_json(cache_key, result.model_dump(mode="json"), settings.catalog_cache_ttl)
    return result


# ---------- weapons ----------


@router.get("/weapons", response_model=Page[WeaponRead])
async def list_weapons(
    repo: Annotated[WeaponRepository, Depends(get_weapon_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    weapon_type: WeaponType | None = None,
    rarity: int | None = Query(None, ge=1, le=5),
    sort: str = Query("name_asc", pattern="^(name_asc|rarity_desc|version_desc)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[WeaponRead]:
    """List weapons with optional filters, sorting, and pagination."""
    params = {
        "weapon_type": weapon_type.value if weapon_type else None,
        "rarity": rarity,
        "sort": sort,
        "limit": limit,
        "offset": offset,
    }
    cache_key = f"weapons:list:{CacheService.hash_query(params)}"

    cached = await cache.get_json(cache_key)
    if cached is not None:
        return Page[WeaponRead].model_validate(cached)

    items, total = await repo.list_weapons(
        weapon_type=weapon_type,
        rarity=rarity,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    page = Page[WeaponRead](
        items=[WeaponRead.model_validate(w) for w in items],
        total=total,
        limit=limit,
        offset=offset,
    )
    await cache.set_json(cache_key, page.model_dump(mode="json"), settings.catalog_cache_ttl)
    return page


@router.get("/weapons/{slug}", response_model=WeaponRead)
async def get_weapon(
    slug: str,
    repo: Annotated[WeaponRepository, Depends(get_weapon_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
) -> WeaponRead:
    """Return one weapon by slug (e.g. 'staff-of-homa')."""
    cache_key = f"weapons:slug:{slug}"
    cached = await cache.get_json(cache_key)
    if cached is not None:
        return WeaponRead.model_validate(cached)

    weapon = await repo.get_by_slug(slug)
    if weapon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Weapon '{slug}' not found",
        )
    result = WeaponRead.model_validate(weapon)
    await cache.set_json(cache_key, result.model_dump(mode="json"), settings.catalog_cache_ttl)
    return result


# ---------- artifact sets ----------


@router.get("/artifact-sets", response_model=Page[ArtifactSetRead])
async def list_artifact_sets(
    repo: Annotated[ArtifactSetRepository, Depends(get_artifact_set_repo)],
    cache: Annotated[CacheService, Depends(get_cache_service)],
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[ArtifactSetRead]:
    """List artifact sets, paginated."""
    params = {"limit": limit, "offset": offset}
    cache_key = f"artifact-sets:list:{CacheService.hash_query(params)}"

    cached = await cache.get_json(cache_key)
    if cached is not None:
        return Page[ArtifactSetRead].model_validate(cached)

    items, total = await repo.list_sets(limit=limit, offset=offset)
    page = Page[ArtifactSetRead](
        items=[ArtifactSetRead.model_validate(s) for s in items],
        total=total,
        limit=limit,
        offset=offset,
    )
    await cache.set_json(cache_key, page.model_dump(mode="json"), settings.catalog_cache_ttl)
    return page
