"""Tracker endpoints: /me/characters CRUD + progress."""

import uuid
from typing import Annotated

from app.api.deps import (
    CurrentUser,
    get_artifact_set_repo,
    get_character_repo,
    get_user_character_repo,
    get_weapon_repo,
)
from app.db.session import get_db
from app.models.progress_weights import ProgressWeights
from app.models.user_artifact import UserArtifact
from app.models.user_character import UserCharacter
from app.repositories.catalog import (
    ArtifactSetRepository,
    CharacterRepository,
    WeaponRepository,
)
from app.repositories.user_character import UserCharacterRepository
from app.schemas.tracker import (
    CharacterBrief,
    ProgressBreakdownSchema,
    UserArtifactIn,
    UserArtifactRead,
    UserCharacterCreate,
    UserCharacterDetail,
    UserCharacterListItem,
    UserCharacterUpdate,
    WeaponBrief,
)
from app.services.progress import ProgressBreakdown, calculate_progress
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/me/characters", tags=["tracker"])


# --- Helpers ---------------------------------------------------------------


async def _get_weights_dict(db: AsyncSession) -> dict[str, float] | None:
    """Достает веса из БД. Если их нет, возвращает None (сработают дефолтные)."""
    weights_db = await db.scalar(select(ProgressWeights).limit(1))
    if not weights_db:
        return None
    return {
        "level": weights_db.w_level,
        "talents": weights_db.w_talents,
        "weapon": weights_db.w_weapon,
        "artifacts": weights_db.w_artifacts,
        "friendship": weights_db.w_friendship,
    }


def _progress_for(uc: UserCharacter, weights: dict[str, float] | None) -> ProgressBreakdown:
    artifacts = [(a.level, a.rarity) for a in uc.artifacts]
    return calculate_progress(
        level=uc.level,
        level_cap=uc.level_cap,
        friendship=uc.friendship,
        talent_normal=uc.talent_normal,
        talent_skill=uc.talent_skill,
        talent_burst=uc.talent_burst,
        weapon_level=uc.weapon_level,
        weapon_refinement=uc.weapon_refinement,
        artifacts=artifacts,
        weights=weights,
    )


def _to_list_item(uc: UserCharacter, weights: dict[str, float] | None) -> UserCharacterListItem:
    return UserCharacterListItem(
        id=uc.id,
        character=CharacterBrief.model_validate(uc.character),
        level=uc.level,
        level_cap=uc.level_cap,
        constellation=uc.constellation,
        friendship=uc.friendship,
        crowns_used=uc.crowns_used,
        progress=_progress_for(uc, weights).total,
        updated_at=uc.updated_at,
    )


def _to_artifact_read(a: UserArtifact) -> UserArtifactRead:
    return UserArtifactRead(
        id=a.id,
        slot=a.slot,
        set_id=a.set_id,
        set_slug=a.artifact_set.slug,
        set_name=a.artifact_set.name,
        rarity=a.rarity,
        level=a.level,
        main_stat=a.main_stat,
        substats=a.substats,
    )


def _to_detail(uc: UserCharacter, weights: dict[str, float] | None) -> UserCharacterDetail:
    breakdown = _progress_for(uc, weights)
    return UserCharacterDetail(
        id=uc.id,
        character=CharacterBrief.model_validate(uc.character),
        level=uc.level,
        level_cap=uc.level_cap,
        friendship=uc.friendship,
        constellation=uc.constellation,
        crowns_used=uc.crowns_used,
        masterless_stella_fortuna=uc.masterless_stella_fortuna,
        talent_normal=uc.talent_normal,
        talent_skill=uc.talent_skill,
        talent_burst=uc.talent_burst,
        weapon=WeaponBrief.model_validate(uc.weapon) if uc.weapon else None,
        weapon_id=uc.weapon_id,
        weapon_level=uc.weapon_level,
        weapon_refinement=uc.weapon_refinement,
        artifacts=[_to_artifact_read(a) for a in uc.artifacts],
        custom_icon_url=uc.custom_icon_url,
        custom_portrait_url=uc.custom_portrait_url,
        custom_background_url=uc.custom_background_url,
        custom_hp=uc.custom_hp,
        custom_atk=uc.custom_atk,
        custom_def=uc.custom_def,
        custom_em=uc.custom_em,
        custom_crit_rate=float(uc.custom_crit_rate) if uc.custom_crit_rate else None,
        custom_crit_dmg=float(uc.custom_crit_dmg) if uc.custom_crit_dmg else None,
        custom_energy_recharge=float(uc.custom_energy_recharge)
        if uc.custom_energy_recharge
        else None,
        custom_elemental_dmg_bonus=float(uc.custom_elemental_dmg_bonus)
        if uc.custom_elemental_dmg_bonus
        else None,
        progress=ProgressBreakdownSchema(**breakdown.to_dict()),
        created_at=uc.created_at,
        updated_at=uc.updated_at,
    )


async def _validate_refs(
    *,
    character_id: uuid.UUID | None,
    weapon_id: uuid.UUID | None,
    artifact_payloads: list[UserArtifactIn] | None,
    characters: CharacterRepository,
    weapons: WeaponRepository,
    artifact_sets: ArtifactSetRepository,
) -> None:
    """Raise 404 if any referenced catalog entity doesn't exist."""
    if character_id is not None and await characters.get_by_id(character_id) is None:
        raise HTTPException(404, f"Character {character_id} not found")
    if weapon_id is not None and await weapons.get_by_id(weapon_id) is None:
        raise HTTPException(404, f"Weapon {weapon_id} not found")
    if artifact_payloads:
        for a in artifact_payloads:
            if await artifact_sets.get_by_id(a.set_id) is None:
                raise HTTPException(404, f"ArtifactSet {a.set_id} not found")


async def _apply_artifacts(
    uc: UserCharacter, payloads: list[UserArtifactIn], db: AsyncSession
) -> None:
    """Replace uc.artifacts with the given payloads."""
    await db.execute(delete(UserArtifact).where(UserArtifact.user_character_id == uc.id))

    for p in payloads:
        db.add(
            UserArtifact(
                user_character_id=uc.id,
                slot=p.slot,
                set_id=p.set_id,
                rarity=p.rarity,
                level=p.level,
                main_stat=p.main_stat,
                substats=p.substats,
            )
        )


# --- Endpoints -------------------------------------------------------------


@router.get("", response_model=list[UserCharacterListItem])
async def list_my_characters(
    current_user: CurrentUser,
    repo: Annotated[UserCharacterRepository, Depends(get_user_character_repo)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UserCharacterListItem]:
    """List the current user's tracked characters with progress."""
    items = await repo.list_for_user(current_user.id)
    weights = await _get_weights_dict(db)
    return [_to_list_item(uc, weights) for uc in items]


@router.post("", response_model=UserCharacterDetail, status_code=status.HTTP_201_CREATED)
async def create_my_character(
    payload: UserCharacterCreate,
    current_user: CurrentUser,
    repo: Annotated[UserCharacterRepository, Depends(get_user_character_repo)],
    characters: Annotated[CharacterRepository, Depends(get_character_repo)],
    weapons: Annotated[WeaponRepository, Depends(get_weapon_repo)],
    artifact_sets: Annotated[ArtifactSetRepository, Depends(get_artifact_set_repo)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserCharacterDetail:
    """Track a new character for the current user."""
    if await repo.get_by_character_id(current_user.id, payload.character_id) is not None:
        raise HTTPException(409, "This character is already in your tracker")

    await _validate_refs(
        character_id=payload.character_id,
        weapon_id=payload.weapon_id,
        artifact_payloads=payload.artifacts,
        characters=characters,
        weapons=weapons,
        artifact_sets=artifact_sets,
    )

    data = payload.model_dump(exclude={"artifacts"})
    uc = UserCharacter(user_id=current_user.id, **data)
    repo.add(uc)

    if payload.artifacts:
        await _apply_artifacts(uc, payload.artifacts, db)

    await repo.commit()

    fresh = await repo.get_by_id_for_user(uc.id, current_user.id)
    assert fresh is not None
    weights = await _get_weights_dict(db)
    return _to_detail(fresh, weights)


@router.get("/{user_character_id}", response_model=UserCharacterDetail)
async def get_my_character(
    user_character_id: uuid.UUID,
    current_user: CurrentUser,
    repo: Annotated[UserCharacterRepository, Depends(get_user_character_repo)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserCharacterDetail:
    uc = await repo.get_by_id_for_user(user_character_id, current_user.id)
    if uc is None:
        raise HTTPException(404, "Tracked character not found")
    weights = await _get_weights_dict(db)
    return _to_detail(uc, weights)


@router.patch("/{user_character_id}", response_model=UserCharacterDetail)
async def update_my_character(
    user_character_id: uuid.UUID,
    payload: UserCharacterUpdate,
    current_user: CurrentUser,
    repo: Annotated[UserCharacterRepository, Depends(get_user_character_repo)],
    characters: Annotated[CharacterRepository, Depends(get_character_repo)],
    weapons: Annotated[WeaponRepository, Depends(get_weapon_repo)],
    artifact_sets: Annotated[ArtifactSetRepository, Depends(get_artifact_set_repo)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserCharacterDetail:
    uc = await repo.get_by_id_for_user(user_character_id, current_user.id)
    if uc is None:
        raise HTTPException(404, "Tracked character not found")

    update_data = payload.model_dump(exclude_unset=True, exclude={"artifacts"})
    for field, value in update_data.items():
        setattr(uc, field, value)

    if "artifacts" in payload.model_fields_set and payload.artifacts is not None:
        await _validate_refs(
            character_id=None,
            weapon_id=None,
            artifact_payloads=payload.artifacts,
            characters=characters,
            weapons=weapons,
            artifact_sets=artifact_sets,
        )
        await _apply_artifacts(uc, payload.artifacts, db)

    await repo.commit()

    fresh = await repo.get_by_id_for_user(uc.id, current_user.id)
    assert fresh is not None
    weights = await _get_weights_dict(db)
    return _to_detail(fresh, weights)


@router.delete("/{user_character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_character(
    user_character_id: uuid.UUID,
    current_user: CurrentUser,
    repo: Annotated[UserCharacterRepository, Depends(get_user_character_repo)],
) -> None:
    uc = await repo.get_by_id_for_user(user_character_id, current_user.id)
    if uc is None:
        raise HTTPException(404, "Tracked character not found")
    await repo.delete(uc)
    await repo.commit()
