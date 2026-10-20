#!/usr/bin/env python3
"""
Genshin Impact weapon parser.
Parses weapon list tables and individual weapon pages for images.
Saves to weapons.json.

Placeholders are NOT substituted during parsing — missing images stay as null.
A separate "_placeholders" section is written into the JSON with hardcoded
fallback URLs; the web app is expected to use it for display fallbacks.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
from pathlib import Path

from bs4 import BeautifulSoup
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

DATA_FILE = DATA_DIR / "weapons.json"
REQUEST_DELAY = 2.5

# Страницы для парсинга (без заглушек — они теперь отдельно, в JSON)
WEAPON_TYPES = {
    "Sword":    {"page": "Sword"},
    "Claymore": {"page": "Claymore"},
    "Polearm":  {"page": "Polearm"},
    "Catalyst": {"page": "Catalyst"},
    "Bow":      {"page": "Bow"},
}

# Заглушки — пишутся в JSON напрямую, без парсинга.
# Веб-приложение само решает, когда их подставлять.
PLACEHOLDERS = {
    "weapon":   "https://static.wikia.nocookie.net/gensinimpact/images/7/7b/Icon_Inventory_Weapons.png",
    "Sword":    "https://static.wikia.nocookie.net/gensin-impact/images/8/81/Icon_Sword.png",
    "Claymore": "https://static.wikia.nocookie.net/gensin-impact/images/6/66/Icon_Claymore.png",
    "Polearm":  "https://static.wikia.nocookie.net/gensin-impact/images/6/6a/Icon_Polearm.png",
    "Catalyst": "https://static.wikia.nocookie.net/gensin-impact/images/2/27/Icon_Catalyst.png",
    "Bow":      "https://static.wikia.nocookie.net/gensin-impact/images/8/81/Icon_Bow.png",
}

# Ключ-раздел для заглушек в JSON. Начинается с "_", чтобы веб-приложение
# могло легко отличить его от записей об оружии.
PLACEHOLDERS_KEY = "_placeholders"


# ---------- Utilities ----------

def clean_image_url(url):
    if not url:
        return None
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

def parse_list_page(weapon_type, page_title):
    """Парсит таблицу со списком оружий определенного типа."""
    print(f"Fetching list for {weapon_type}...")
    params = {"action": "parse", "page": page_title, "prop": "text", "format": "json", "formatversion": "2", "redirects": "1"}
    data = fetch_json(API_URL, params)

    if "parse" not in data:
        print(f"  {C_RED}Ошибка API для {weapon_type}{C_RESET}")
        return []

    soup = BeautifulSoup(data["parse"]["text"], "html.parser")

    table = None
    for t in soup.find_all("table"):
        ths = t.find_all("th")
        if any("Base ATK" in th.get_text(strip=True) for th in ths):
            table = t
            break

    if not table:
        print(f"  {C_RED}Не найдена таблица оружия для {weapon_type}{C_RESET}")
        return []

    weapons = []
    rows = table.find_all("tr")
    for row in rows[1:]:
        cols = row.find_all("td")
        if len(cols) < 6:
            continue

        img = cols[0].find("img")
        icon_url = extract_img_src(img)
        a_tag = cols[1].find("a")
        if not a_tag:
            continue
        name = a_tag.get_text(strip=True)
        page_url = a_tag.get("href")

        quality_img = cols[2].find("img")
        quality = 1
        if quality_img:
            m = re.search(r"(\d)\s*Star", quality_img.get("alt", ""), re.IGNORECASE)
            if m:
                quality = int(m.group(1))

        atk_text = cols[3].get_text(separator=" ", strip=True)
        atk_nums = re.findall(r"\d+", atk_text)
        base_atk_90 = atk_nums[0] if len(atk_nums) > 0 else None
        base_atk_1 = atk_nums[1] if len(atk_nums) > 1 else None

        stat_text = cols[4].get_text(separator=" ", strip=True)
        stat_name = re.sub(r'[\d.%()]+', '', stat_text).strip() or None
        stat_nums = re.findall(r"[\d.]+%?", stat_text)
        sub_stat_90 = stat_nums[0] if len(stat_nums) > 0 else None
        sub_stat_1 = stat_nums[1] if len(stat_nums) > 1 else None

        passive_name = None
        passive_desc = None
        b_tag = cols[5].find("b")
        if b_tag:
            passive_name = b_tag.get_text(strip=True)
            full_text = cols[5].get_text(separator=" ", strip=True)
            passive_desc = full_text.replace(passive_name, "", 1).strip()

        weapons.append({
            "name": name,
            "page_url": page_url,
            "weapon_type": weapon_type,
            "quality": quality,
            "icon": icon_url,
            "base_atk": {"lvl_1": base_atk_1, "lvl_90": base_atk_90},
            "secondary_stat": {
                "name": stat_name if stat_name != "None" else None,
                "lvl_1": sub_stat_1,
                "lvl_90": sub_stat_90
            },
            "passive": {
                "name": passive_name,
                "description": passive_desc
            }
        })
    return weapons


def parse_weapon_images(page_title):
    """Заходит на страницу оружия и достает картинки Base и 2nd Ascension.

    Возвращает None для полей, которые не удалось найти — БЕЗ подстановки заглушек.
    """
    page_title = urllib.parse.unquote(page_title).split("?")[0]

    params = {"action": "parse", "page": page_title, "prop": "text", "format": "json", "formatversion": "2", "redirects": "1"}
    try:
        data = fetch_json(API_URL, params)
        if "parse" not in data:
            return {"base": None, "awakened": None}

        soup = BeautifulSoup(data["parse"]["text"], "html.parser")

        base_img = None
        awaken_img = None

        tabs = soup.select(".wds-tab__content")
        if len(tabs) >= 2:
            img_base = tabs[0].find("img")
            base_img = extract_img_src(img_base)

            img_awaken = tabs[1].find("img")
            awaken_img = extract_img_src(img_awaken)
        elif len(tabs) == 1:
            img_base = tabs[0].find("img")
            base_img = extract_img_src(img_base)
            awaken_img = base_img

        return {"base": base_img, "awakened": awaken_img}
    except Exception:
        return {"base": None, "awakened": None}


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


def count_weapons(data):
    return sum(1 for k in data if k != PLACEHOLDERS_KEY)


# ---------- Main ----------

def main():
    parser = argparse.ArgumentParser(description="Genshin Impact weapon parser")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--type", "-t", choices=list(WEAPON_TYPES.keys()), help="Parse a specific weapon type")
    group.add_argument("--all", action="store_true", help="Parse all weapon types (skips existing unless --force)")
    parser.add_argument("--force", "-f", action="store_true", help="Force re-parse weapons that already exist")
    args = parser.parse_args()

    existing = load_existing(DATA_FILE)

    # Заглушки кладем в JSON напрямую, без парсинга.
    # Веб-приложение читает их отсюда и само решает, когда подставлять.
    existing[PLACEHOLDERS_KEY] = PLACEHOLDERS

    print(f"Loaded {count_weapons(existing)} existing weapons from {DATA_FILE.name}")

    types_to_parse = [args.type] if args.type else list(WEAPON_TYPES.keys())

    for w_type in types_to_parse:
        info = WEAPON_TYPES[w_type]
        weapons_list = parse_list_page(w_type, info["page"])
        print(f"Found {len(weapons_list)} {w_type}s.")

        for w in weapons_list:
            name = w["name"]
            if name in existing and name != PLACEHOLDERS_KEY and not args.force:
                print(f"  {C_GREEN}Skipping {name} (already parsed){C_RESET}")
                continue

            print(f"  Parsing {name}... ", end="", flush=True)
            time.sleep(REQUEST_DELAY)

            page_title = w["page_url"].split("/wiki/")[-1]
            images = parse_weapon_images(page_title)

            # Никаких заглушек — сохраняем то, что реально спарсили (или null).
            w["images"] = {
                "base": images["base"],
                "awakened": images["awakened"],
            }

            del w["page_url"]

            existing[name] = w
            save_json(DATA_FILE, existing)
            print(f"{C_GREEN}OK{C_RESET}")

    save_json(DATA_FILE, existing)
    print(f"\nDone. Total weapons in file: {count_weapons(existing)}")


if __name__ == "__main__":
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
