import asyncio
import logging
import os
import shutil

import httpx
from app.core.logging import log
from app.db.session import AsyncSessionLocal
from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.weapon import Weapon
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

error_logger = logging.getLogger("download_errors")
error_logger.setLevel(logging.ERROR)
os.makedirs("/app/logs", exist_ok=True)
file_handler = logging.FileHandler("/app/logs/download_errors.log", mode="a", encoding="utf-8")
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(message)s"))
if not error_logger.handlers:
    error_logger.addHandler(file_handler)

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "images")
)

os.makedirs(os.path.join(BASE_DIR, "weapons"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "artifacts"), exist_ok=True)


async def download_image(client: httpx.AsyncClient, url: str, local_path: str, delay: float = 0.2):
    if not url or not url.startswith("http"):
        # Если это уже локальный путь, но старый формат, просто возвращаем новый
        if url and "/images/" in url:
            # Возвращаем правильный путь, который мы передали в local_path
            return "/" + os.path.relpath(local_path, os.path.join(BASE_DIR, "..")).replace(
                "\\", "/"
            )
        return url

    # Всегда возвращаем локальный путь для БД
    db_path = "/" + os.path.relpath(local_path, os.path.join(BASE_DIR, "..")).replace("\\", "/")

    if os.path.exists(local_path):
        return db_path

    try:
        response = await client.get(url, timeout=10.0)
        response.raise_for_status()
        with open(local_path, "wb") as f:
            f.write(response.content)
        log.info("image_downloaded", url=url, path=local_path)
        await asyncio.sleep(delay)
    except Exception as e:
        error_msg = f"Failed to download {url} -> {e!s}"
        error_logger.error(error_msg)
        print(f"❌ {error_msg}")
        return url

    return db_path


def move_if_exists(old_rel_path: str, new_rel_path: str):
    old_abs = os.path.join(BASE_DIR, old_rel_path)
    new_abs = os.path.join(BASE_DIR, new_rel_path)
    if os.path.exists(old_abs) and not os.path.exists(new_abs):
        os.makedirs(os.path.dirname(new_abs), exist_ok=True)
        shutil.move(old_abs, new_abs)
        log.info("image_moved", old=old_rel_path, new=new_rel_path)


async def main():
    async with AsyncSessionLocal() as db, httpx.AsyncClient() as client:
        print("Обрабатываем персонажей...")
        chars = (await db.scalars(select(Character))).all()

        for char in chars:
            char_dir = os.path.join(BASE_DIR, "characters", char.slug)
            os.makedirs(char_dir, exist_ok=True)
            os.makedirs(os.path.join(char_dir, "talents"), exist_ok=True)
            os.makedirs(os.path.join(char_dir, "constellations"), exist_ok=True)

            # Переносим старые файлы, если они есть
            move_if_exists(f"characters/{char.slug}_icon.png", f"characters/{char.slug}/icon.png")
            move_if_exists(
                f"characters/{char.slug}_portrait.png", f"characters/{char.slug}/portrait.png"
            )
            move_if_exists(
                f"characters/{char.slug}_namecard.png", f"characters/{char.slug}/namecard.png"
            )
            move_if_exists(
                f"characters/{char.slug}_constellation.png",
                f"characters/{char.slug}/constellation_icon.png",
            )

            # ПРИНУДИТЕЛЬНО обновляем пути в БД
            # Даже если в БД была ссылка на вики, мы проверим наличие локального файла.
            # If the file is missing, download_image will fetch it via the DB link
            # and return the local path.

            if char.icon_url:
                char.icon_url = await download_image(
                    client, char.icon_url, os.path.join(char_dir, "icon.png")
                )
            if char.portrait_url:
                char.portrait_url = await download_image(
                    client, char.portrait_url, os.path.join(char_dir, "portrait.png")
                )
            if char.namecard_url:
                char.namecard_url = await download_image(
                    client, char.namecard_url, os.path.join(char_dir, "namecard.png")
                )
            if char.constellation_icon_url:
                char.constellation_icon_url = await download_image(
                    client,
                    char.constellation_icon_url,
                    os.path.join(char_dir, "constellation_icon.png"),
                )

            if char.talents and isinstance(char.talents, dict):
                talents = dict(char.talents)
                for key, val in talents.items():
                    if not isinstance(val, dict) or "icon" not in val:
                        continue
                    safe_key = key.lower().replace(" ", "_").replace("-", "_")
                    path = os.path.join(char_dir, "talents", f"{safe_key}.png")
                    val["icon"] = await download_image(client, val["icon"], path)
                char.talents = talents
                flag_modified(char, "talents")

            if char.constellations and isinstance(char.constellations, dict):
                consts = dict(char.constellations)
                for key, val in consts.items():
                    if not isinstance(val, dict) or "icon" not in val:
                        continue
                    path = os.path.join(char_dir, "constellations", f"c{key}.png")
                    val["icon"] = await download_image(client, val["icon"], path)
                char.constellations = consts
                flag_modified(char, "constellations")

        await db.commit()
        print(f"Готово! Обработано персонажей: {len(chars)}")

        print("Скачиваем оружие...")
        weapons = (await db.scalars(select(Weapon))).all()
        for w in weapons:
            if w.icon_url and w.icon_url.startswith("http"):
                path = os.path.join(BASE_DIR, "weapons", f"{w.slug}_icon.png")
                w.icon_url = await download_image(client, w.icon_url, path)
            if w.icon_awakened_url and w.icon_awakened_url.startswith("http"):
                path = os.path.join(BASE_DIR, "weapons", f"{w.slug}_awakened.png")
                w.icon_awakened_url = await download_image(client, w.icon_awakened_url, path)
        await db.commit()
        print(f"Готово! Обработано оружий: {len(weapons)}")

        print("Скачиваем артефакты...")
        sets = (await db.scalars(select(ArtifactSet))).all()
        for s in sets:
            if s.icon_url and s.icon_url.startswith("http"):
                path = os.path.join(BASE_DIR, "artifacts", f"{s.slug}_flower.png")
                s.icon_url = await download_image(client, s.icon_url, path)
            if s.icon_plume_url and s.icon_plume_url.startswith("http"):
                path = os.path.join(BASE_DIR, "artifacts", f"{s.slug}_plume.png")
                s.icon_plume_url = await download_image(client, s.icon_plume_url, path)
            if s.icon_sands_url and s.icon_sands_url.startswith("http"):
                path = os.path.join(BASE_DIR, "artifacts", f"{s.slug}_sands.png")
                s.icon_sands_url = await download_image(client, s.icon_sands_url, path)
            if s.icon_goblet_url and s.icon_goblet_url.startswith("http"):
                path = os.path.join(BASE_DIR, "artifacts", f"{s.slug}_goblet.png")
                s.icon_goblet_url = await download_image(client, s.icon_goblet_url, path)
            if s.icon_circlet_url and s.icon_circlet_url.startswith("http"):
                path = os.path.join(BASE_DIR, "artifacts", f"{s.slug}_circlet.png")
                s.icon_circlet_url = await download_image(client, s.icon_circlet_url, path)
        await db.commit()
        print(f"Готово! Обработано сетов: {len(sets)}")


if __name__ == "__main__":
    asyncio.run(main())
