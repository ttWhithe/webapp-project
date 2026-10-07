"""Export/import the manually-edited catalog fields as JSON.

Usage (inside the backend container):

    python -m scripts.catalog_backup export > catalog_data.json
    python -m scripts.catalog_backup import catalog_data.json

Only fields that admins can edit via /admin/catalog are exported:

    - Character: name_ru, title, icon_url, portrait_url, rarity, region,
      birthday, version_added, element, weapon_type
    - Weapon: name_ru, icon_url, rarity, base_atk, main_stat, version_added
    - ArtifactSet: name_ru, icon_url

Records are matched by `slug` (which never changes), so exports/imports are safe
even if external_id changes on a resync.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Adjust import path so we can run as `python -m scripts.catalog_backup`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.weapon import Weapon

# Editable field sets — must mirror the admin Pydantic schemas.
CHARACTER_FIELDS = [
    "slug",
    "name_ru",
    "title",
    "icon_url",
    "portrait_url",
    "rarity",
    "region",
    "birthday",
    "version_added",
]
WEAPON_FIELDS = [
    "slug",
    "name_ru",
    "icon_url",
    "rarity",
    "base_atk",
    "main_stat",
    "version_added",
]
ARTIFACT_SET_FIELDS = ["slug", "name_ru", "icon_url"]


def _serialize(row: object, fields: list[str]) -> dict[str, object]:
    result: dict[str, object] = {}
    for f in fields:
        value = getattr(row, f)
        # Enums → their string values
        if hasattr(value, "value"):
            value = value.value  # type: ignore[attr-defined]
        # Decimals → float for readability
        if hasattr(value, "as_tuple"):
            value = float(value)  # type: ignore[arg-type]
        result[f] = value
    return result


async def _export(path: Path | None) -> None:
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with session_factory() as session:
            chars = (await session.scalars(select(Character).order_by(Character.slug))).all()
            weapons = (await session.scalars(select(Weapon).order_by(Weapon.slug))).all()
            sets = (await session.scalars(select(ArtifactSet).order_by(ArtifactSet.slug))).all()

            payload = {
                "characters": [_serialize(c, CHARACTER_FIELDS) for c in chars],
                "weapons": [_serialize(w, WEAPON_FIELDS) for w in weapons],
                "artifact_sets": [_serialize(s, ARTIFACT_SET_FIELDS) for s in sets],
            }

            text = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
            if path is None:
                print(text)
            else:
                path.write_text(text, encoding="utf-8")
                print(f"Exported to {path}", file=sys.stderr)
    finally:
        await engine.dispose()


async def _import(path: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    updated = {"characters": 0, "weapons": 0, "artifact_sets": 0}
    try:
        async with session_factory() as session:
            for row in data.get("characters", []):
                obj = await session.scalar(select(Character).where(Character.slug == row["slug"]))
                if obj is None:
                    continue
                for f in CHARACTER_FIELDS:
                    if f == "slug":
                        continue
                    setattr(obj, f, row.get(f))
                updated["characters"] += 1

            for row in data.get("weapons", []):
                obj = await session.scalar(select(Weapon).where(Weapon.slug == row["slug"]))
                if obj is None:
                    continue
                for f in WEAPON_FIELDS:
                    if f == "slug":
                        continue
                    setattr(obj, f, row.get(f))
                updated["weapons"] += 1

            for row in data.get("artifact_sets", []):
                obj = await session.scalar(
                    select(ArtifactSet).where(ArtifactSet.slug == row["slug"])
                )
                if obj is None:
                    continue
                for f in ARTIFACT_SET_FIELDS:
                    if f == "slug":
                        continue
                    setattr(obj, f, row.get(f))
                updated["artifact_sets"] += 1

            await session.commit()
    finally:
        await engine.dispose()

    print(
        f"Imported: characters={updated['characters']}, "
        f"weapons={updated['weapons']}, "
        f"artifact_sets={updated['artifact_sets']}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Catalog backup/restore")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_export = sub.add_parser("export", help="Print/save JSON snapshot")
    p_export.add_argument("--out", type=Path, default=None)

    p_import = sub.add_parser("import", help="Apply JSON snapshot to DB")
    p_import.add_argument("file", type=Path)

    args = parser.parse_args()

    if args.cmd == "export":
        asyncio.run(_export(args.out))
    elif args.cmd == "import":
        asyncio.run(_import(args.file))


if __name__ == "__main__":
    main()
