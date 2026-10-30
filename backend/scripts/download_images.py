import asyncio
import os

import httpx
from app.core.logging import log
from app.db.session import AsyncSessionLocal
from app.models.artifact_set import ArtifactSet
from app.models.character import Character
from app.models.weapon import Weapon
from sqlalchemy import select

# Path to frontend images folder
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "images")
)
os.makedirs(os.path.join(BASE_DIR, "characters"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "weapons"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "artifacts"), exist_ok=True)


async def download_image(client: httpx.AsyncClient, url: str, local_path: str, delay: float = 1.0):
    if not url or not url.startswith("http"):
        return url

    if os.path.exists(local_path):
        return "/" + os.path.relpath(local_path, os.path.join(BASE_DIR, "..")).replace("\\", "/")

    try:
        response = await client.get(url, timeout=10.0)
        response.raise_for_status()
        with open(local_path, "wb") as f:
            f.write(response.content)
        log.info("image_downloaded", url=url, path=local_path)
        await asyncio.sleep(delay)
    except Exception as e:
        log.error("image_download_failed", url=url, error=str(e))
        return url

    return "/" + os.path.relpath(local_path, os.path.join(BASE_DIR, "..")).replace("\\", "/")


async def main():
    async with AsyncSessionLocal() as db, httpx.AsyncClient() as client:
        print("Скачиваем персонажей...")
        chars = (await db.scalars(select(Character))).all()
        for char in chars:
            if char.icon_url and char.icon_url.startswith("http"):
                path = os.path.join(BASE_DIR, "characters", f"{char.slug}_icon.png")
                char.icon_url = await download_image(client, char.icon_url, path)
            if char.portrait_url and char.portrait_url.startswith("http"):
                path = os.path.join(BASE_DIR, "characters", f"{char.slug}_portrait.png")
                char.portrait_url = await download_image(client, char.portrait_url, path)
            if char.namecard_url and char.namecard_url.startswith("http"):
                path = os.path.join(BASE_DIR, "characters", f"{char.slug}_namecard.png")
                char.namecard_url = await download_image(client, char.namecard_url, path)
            if char.constellation_icon_url and char.constellation_icon_url.startswith("http"):
                path = os.path.join(BASE_DIR, "characters", f"{char.slug}_constellation.png")
                char.constellation_icon_url = await download_image(
                    client, char.constellation_icon_url, path
                )
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
