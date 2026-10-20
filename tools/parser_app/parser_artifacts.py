#!/usr/bin/env python3
"""
Genshin Impact artifact parser.
Parses artifact sets, their images, and global artifact stats.
Saves to artifacts.json.
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString
from curl_cffi import requests as curl_requests

# Включаем цвета для Windows
if os.name == "nt":
    os.system("")
C_GREEN = "\033[92m"
C_RED   = "\033[91m"
C_RESET = "\033[0m"

BASE_URL = "https://genshin-impact.fandom.com"
API_URL = f"{BASE_URL}/api.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATA_FILE = DATA_DIR / "artifacts.json"
REQUEST_DELAY = 2.5

# Заглушки для слотов артефактов (передаются в JSON для веб-приложения)
PLACEHOLDERS = {
    "flower": "https://static.wikia.nocookie.net/gensin-impact/images/2/2d/Icon_Flower_of_Life.png",
    "plume": "https://static.wikia.nocookie.net/gensin-impact/images/8/8b/Icon_Plume_of_Death.png",
    "sands": "https://static.wikia.nocookie.net/gensin-impact/images/9/9f/Icon_Sands_of_Eon.png",
    "goblet": "https://static.wikia.nocookie.net/gensin-impact/images/3/37/Icon_Goblet_of_Eonothem.png",
    "circlet": "https://static.wikia.nocookie.net/gensin-impact/images/6/64/Icon_Circlet_of_Logos.png"
}
PLACEHOLDERS_KEY = "_placeholders"

# ---------- Utilities ----------

def clean_image_url(url):
    if not url:
        return None
    # Чистим всё после .png/.jpg и т.д., включая /revision/ и ?cb=
    return re.sub(r"\.(png|jpg|jpeg|gif|webp)([/?].*)?$", r".\1", url)

def extract_img_src(img):
    if not img:
        return None
    url = img.get("data-src") or img.get("src")
    if url and url.startswith("data:"):
        return None
    return clean_image_url(url)

def fetch_json(url, params, retries=3, backoff=5):
    for attempt in range(retries):
        try:
            response = curl_requests.get(url, params=params, headers=HEADERS, impersonate="chrome", timeout=20)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            if attempt == retries - 1:
                raise e
            print(f" [{C_RED}Ошибка сети, ретрай {attempt+1}/{retries} через {backoff} сек...{C_RESET}] ", end="", flush=True)
            time.sleep(backoff)

# ---------- Parsers ----------

def parse_artifact_list():
    """Парсит общую таблицу сетов."""
    print("Fetching artifact sets list...")
    params = {"action": "parse", "page": "Artifact/Sets", "prop": "text", "format": "json", "formatversion": "2", "redirects": "1"}
    data = fetch_json(API_URL, params)

    if "parse" not in data:
        print(f"  {C_RED}Ошибка API для списка артефактов{C_RESET}")
        return []

    soup = BeautifulSoup(data["parse"]["text"], "html.parser")
    table = soup.find("table", class_="wikitable")
    if not table:
        print(f"  {C_RED}Таблица сетов не найдена{C_RESET}")
        return []

    sets = []
    rows = table.find_all("tr")[1:]
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 4:
            continue

        # 1. Имя и ссылка
        a_tag = cols[0].find("a")
        if not a_tag: continue
        name = a_tag.get_text(strip=True)
        page_url = a_tag.get("href")

        # 2. Качество (извлекаем числа)
        qual_text = cols[1].get_text(strip=True) # "4-5★" или "1★"
        quality = [int(x) for x in re.findall(r"\d", qual_text)]

        # 3. Бонусы (2pc, 4pc, 1pc)
        bonus_text = cols[3].get_text(" ", strip=True)
        bonuses = {}

        # Ищем паттерны, учитывая, что 1-Piece бывает только у некоторых
        b1 = re.search(r"1-Piece:\s*(.*?)(?=2-Piece:|4-Piece:|$)", bonus_text)
        b2 = re.search(r"2-Piece:\s*(.*?)(?=4-Piece:|$)", bonus_text)
        b4 = re.search(r"4-Piece:\s*(.*?)$", bonus_text)

        if b1: bonuses["1pc"] = b1.group(1).strip()
        if b2: bonuses["2pc"] = b2.group(1).strip()
        if b4: bonuses["4pc"] = b4.group(1).strip()

        sets.append({
            "name": name,
            "page_url": page_url,
            "quality": quality,
            "bonuses": bonuses
        })
    return sets

def parse_artifact_images(page_title):
    """Заходит на страницу сета и достает картинки 5 слотов."""
    page_title = page_title.split("/wiki/")[-1]
    params = {"action": "parse", "page": page_title, "prop": "text", "format": "json", "formatversion": "2", "redirects": "1"}
    try:
        data = fetch_json(API_URL, params)
        if "parse" not in data:
            return {}

        soup = BeautifulSoup(data["parse"]["text"], "html.parser")
        infobox = soup.select_one("aside.portable-infobox")

        images = {"flower": None, "plume": None, "sands": None, "goblet": None, "circlet": None}
        if infobox:
            for slot in images.keys():
                div = infobox.select_one(f'div[data-source="{slot}"]')
                if div:
                    img = div.find("img")
                    images[slot] = extract_img_src(img)
        return images
    except Exception as e:
        return {"flower": None, "plume": None, "sands": None, "goblet": None, "circlet": None}

def parse_artifact_stats():
    """Парсит страницу Artifact/Stats для получения статов."""
    print("Fetching artifact stats...")
    params = {"action": "parse", "page": "Artifact/Stats", "prop": "text", "format": "json", "formatversion": "2", "redirects": "1"}
    data = fetch_json(API_URL, params)

    if "parse" not in data:
        return {}

    soup = BeautifulSoup(data["parse"]["text"], "html.parser")
    stats_data = {"main_stats": {}, "sub_stats": {}}

    # Парсим Main Stats
    for table in soup.select("table.wikitable.mw-collapsible"):
        header_td = table.find("th", colspan="4")
        if not header_td: continue

        slot_span = header_td.find("span", class_="item-text")
        if not slot_span: continue
        slot_name = slot_span.get_text(strip=True) # Flower of Life, Plume of Death и т.д.

        stats_data["main_stats"][slot_name] = {}
        rows = table.find_all("tr")[2:] # Пропускаем заголовки
        for row in rows:
            th = row.find("th")
            tds = row.find_all("td")
            if len(tds) == 3:
                stat_name = th.get_text(" ", strip=True)
                stats_data["main_stats"][slot_name][stat_name] = {
                    "3_star": tds[0].get_text(strip=True),
                    "4_star": tds[1].get_text(strip=True),
                    "5_star": tds[2].get_text(strip=True),
                }

    # Парсим Sub Stats
    for table in soup.select("table.wikitable.align-center"):
        caption = table.find("caption")
        if caption and "Possible sub-stat values" in caption.get_text():
            rows = table.find_all("tr")[1:]
            for row in rows:
                th = row.find("th")
                tds = row.find_all("td")
                if len(tds) == 5:
                    stat_name = th.get_text(" ", strip=True)
                    stats_data["sub_stats"][stat_name] = {
                        "1_star": tds[0].get_text(strip=True),
                        "2_star": tds[1].get_text(strip=True),
                        "3_star": tds[2].get_text(strip=True),
                        "4_star": tds[3].get_text(strip=True),
                        "5_star": tds[4].get_text(strip=True),
                    }
    return stats_data

# ---------- Storage ----------

def load_existing(path):
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ---------- Main ----------

def main():
    parser = argparse.ArgumentParser(description="Genshin Impact artifact parser")
    parser.add_argument("--force", "-f", action="store_true", help="Force re-parse artifacts that already exist")
    args = parser.parse_args()

    existing = load_existing(DATA_FILE)

    # 1. Принудительно ставим плейсхолдеры в самое начало файла
    new_data = {PLACEHOLDERS_KEY: PLACEHOLDERS}
    for k, v in existing.items():
        if k != PLACEHOLDERS_KEY:
            new_data[k] = v
    existing = new_data
    save_json(DATA_FILE, existing)

    # 2. Парсим статы (они всегда обновляются)
    stats = parse_artifact_stats()
    if stats:
        existing["_stats"] = stats
        save_json(DATA_FILE, existing)
        print(f"  {C_GREEN}Artifact stats updated.{C_RESET}")

    # 3. Парсим сеты
    artifact_sets = parse_artifact_list()
    print(f"Found {len(artifact_sets)} artifact sets.")

    for i, artifact in enumerate(artifact_sets, 1):
        name = artifact["name"]

        # Скипаем, если уже есть, но пропускаем системные ключи (начинаются с _)
        if name in existing and not args.force and not name.startswith("_"):
            print(f"[{i}/{len(artifact_sets)}] {C_GREEN}Skipping {name} (already parsed){C_RESET}")
            continue

        print(f"[{i}/{len(artifact_sets)}] Parsing {name}... ", end="", flush=True)
        time.sleep(REQUEST_DELAY)

        # Получаем картинки
        images = parse_artifact_images(artifact["page_url"])
        artifact["images"] = images
        del artifact["page_url"]

        existing[name] = artifact
        save_json(DATA_FILE, existing)
        print(f"{C_GREEN}OK{C_RESET}")

    # Считаем только реальные сеты (игнорируем ключи с _)
    total_sets = len([k for k in existing if not k.startswith('_')])
    print(f"\nDone. Total sets in file: {total_sets}")

if __name__ == "__main__":
    # Лог пишется в общий log.txt в режиме дозаписи ("a")
    log_path = Path(__file__).parent / "log.txt"
    log_file = open(log_path, "a", encoding="utf-8", buffering=1)

    class Tee:
        _ansi = re.compile(r"\033\[[0-9;]*m")
        def __init__(self, console, fileobj): self.console, self.fileobj = console, fileobj
        def write(self, data):
            self.console.write(data)
            self.fileobj.write(self._ansi.sub("", data))
        def flush(self):
            try: self.console.flush()
            except: pass
            try: self.fileobj.flush()
            except: pass
        def isatty(self): return self.console.isatty() if hasattr(self.console, "isatty") else False

    orig_stdout, orig_stderr = sys.stdout, sys.stderr
    sys.stdout = Tee(orig_stdout, log_file)
    sys.stderr = Tee(orig_stderr, log_file)

    try:
        main()
    finally:
        sys.stdout = orig_stdout
        sys.stderr = orig_stderr
        log_file.close()
