#!/usr/bin/env python3
"""
Genshin Impact character parser.
Parses character pages from genshin-impact.fandom.com and saves to JSON.

Usage:
    python parser_heroes.py --list
    python parser_heroes.py --character "Hu Tao"
    python parser_heroes.py --all
    python parser_heroes.py --all --force
"""

import argparse
import json
import re
import sys
import time
import urllib.parse
from pathlib import Path

import os
if os.name == "nt":
    os.system("")  # включает поддержку ANSI-цветов в Windows cmd/PowerShell

# ANSI-коды цветов
C_GREEN = "\033[92m"
C_RED   = "\033[91m"
C_RESET = "\033[0m"

class Tee:
    """Пишет в консоль И в файл. В файл — БЕЗ ANSI-кодов (чистый текст)."""
    _ansi = re.compile(r"\033\[[0-9;]*m")

    def __init__(self, console, fileobj):
        self.console = console
        self.fileobj = fileobj

    def write(self, data):
        self.console.write(data)
        self.fileobj.write(self._ansi.sub("", data))

    def flush(self):
        try:
            self.console.flush()
        except Exception:
            pass
        try:
            self.fileobj.flush()
        except Exception:
            pass

    def isatty(self):
        return self.console.isatty() if hasattr(self.console, "isatty") else False

from bs4 import BeautifulSoup, NavigableString
from curl_cffi import requests as curl_requests

BASE_URL = "https://genshin-impact.fandom.com"
API_URL = f"{BASE_URL}/api.php"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)  # Создаст папку data, если её нет

DATA_FILE = DATA_DIR / "heroes.json"
NAMES_FILE = DATA_DIR / "heroes_list.json"

# Увеличили задержку, чтобы не злить Cloudflare
REQUEST_DELAY = 2.5


# ---------- Utilities ----------

def clean_image_url(url):
    """Strip everything after the image extension."""
    if not url:
        return None
    return re.sub(r"\.(png|jpg|jpeg|gif|webp)(/.*)?$", r".\1", url)


def extract_img_src(img):
    """Extract real image URL, bypassing base64 lazy-load placeholders."""
    if not img:
        return None
    url = img.get("data-src") or img.get("src")
    if url and url.startswith("data:"):
        return None
    return clean_image_url(url)


def fetch_json(url, params, retries=3, backoff=5):
    """Fetch JSON using curl_cffi with built-in retry logic."""
    for attempt in range(retries):
        try:
            response = curl_requests.get(
                url,
                params=params,
                headers=HEADERS,
                impersonate="chrome",
                timeout=20
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            if attempt == retries - 1:
                raise e
            print(f" [Ошибка сети, ретрай {attempt+1}/{retries} через {backoff} сек...] ", end="", flush=True)
            time.sleep(backoff)


def text_before_br(element):
    """Normalized text before the first <br>, or full text if no <br>."""
    if element is None:
        return None
    parts = []
    for child in element.children:
        if getattr(child, "name", None) == "br":
            break
        if isinstance(child, NavigableString):
            parts.append(str(child))
        else:
            parts.append(child.get_text())
    text = re.sub(r"\s+", " ", "".join(parts)).strip()
    return text or None


def _last_link_text(td):
    """Text of last non-empty <a> inside td, fallback to td text."""
    if not td:
        return None
    for link in reversed(td.find_all("a")):
        text = link.get_text(strip=True)
        if text:
            return text
    return td.get_text(strip=True) or None


# ---------- Field parsers ----------

def parse_name(soup):
    tag = soup.select_one('h2[data-source="name"]')
    return tag.get_text(strip=True) if tag else None


def parse_title(soup):
    tag = soup.select_one('h2[data-item-name="secondary_title"]')
    return tag.get_text(strip=True) if tag else None


def parse_rarity(soup):
    td = soup.select_one('td[data-source="quality"]')
    if not td:
        return None
    img = td.find("img")
    if img:
        m = re.search(r"(\d)\s*Star", img.get("alt", ""), re.IGNORECASE)
        if m:
            return int(m.group(1))
    return None


def parse_weapon(soup):
    return _last_link_text(soup.select_one('td[data-source="weapon"]'))


def parse_element(soup):
    return _last_link_text(soup.select_one('td[data-source="element"]'))


def parse_simple_field(soup, data_source):
    div = soup.select_one(f'div[data-source="{data_source}"] .pi-data-value')
    return text_before_br(div)


def parse_release_date(soup):
    div = soup.select_one('div[data-source="releaseDate"] .pi-data-value')
    return text_before_br(div)


def parse_talents(soup):
    """Parse talent table. Returns (talents_dict, talent_mapping)."""
    talents = {}
    talent_mapping = {}
    table = soup.select_one(".talent-table")
    if not table:
        return talents, talent_mapping

    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) != 3 or any(c.get("colspan") for c in cells):
            continue

        img = cells[0].find("img")
        icon = extract_img_src(img)
        if not icon:
            continue

        name_link = cells[1].find("a")
        talent_name = name_link.get_text(strip=True) if name_link else cells[1].get_text(strip=True)
        type_link = cells[2].find("a")
        talent_type = type_link.get_text(strip=True) if type_link else cells[2].get_text(strip=True)

        if not talent_name or not talent_type:
            continue

        talents[talent_type] = {"name": talent_name, "icon": icon}
        talent_mapping[talent_name] = talent_type

    return talents, talent_mapping


def parse_constellations(soup, talent_mapping):
    """Parse constellation table."""
    constellations = {}
    table = soup.select_one(".constellation-table")
    if not table:
        return constellations

    rows = table.find_all("tr")
    i = 0
    while i < len(rows):
        cells = rows[i].find_all("td")
        if len(cells) == 3 and not any(c.get("colspan") for c in cells):
            img = cells[0].find("img")
            icon = extract_img_src(img)

            name_link = cells[1].find("a")
            cname = name_link.get_text(strip=True) if name_link else cells[1].get_text(strip=True)
            m = re.search(r"\d+", cells[2].get_text(strip=True))
            level = int(m.group()) if m else None

            description = ""
            if i + 1 < len(rows):
                next_cells = rows[i + 1].find_all("td")
                if len(next_cells) == 1 and next_cells[0].get("colspan"):
                    description = re.sub(
                        r"\s+", " ",
                        next_cells[0].get_text(" ", strip=True)
                    ).strip()
                    # Убираем пробелы перед точками и запятыми
                    description = re.sub(r'\s+([.,])', r'\1', description)
                    i += 1

            # Ищем, какой талант увеличивает это созвездие
            increases = None
            for tname, ttype in talent_mapping.items():
                if f"Increases the Level of {tname}" in description:
                    increases = ttype
                    break

            if level is not None:
                c_data = {
                    "name": cname,
                    "icon": icon,
                    "description": description,
                }
                if increases:
                    c_data["increases"] = increases

                constellations[str(level)] = c_data
        i += 1

    return constellations


def parse_other_languages(soup, lang="Russian"):
    """Extract a specific language name from Other Languages table."""
    heading = None
    for h in soup.find_all(["h2", "h3", "h4"]):
        text = h.get_text(strip=True).lower()
        if "other language" in text:
            heading = h
            break
    if not heading:
        return {}

    table = heading.find_next("table", class_="article-table") or heading.find_next("table")
    if not table:
        return {}

    target = lang.lower()
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        raw_lang = cells[0].get_text(" ", strip=True).lower()
        raw_lang = re.sub(r"\(.*?\)", "", raw_lang).strip()
        if raw_lang == target:
            value = text_before_br(cells[1])
            if value:
                return {lang: value}
    return {}


# ---------- Images (via Fandom API) ----------

def get_file_urls(filenames):
    """Batch resolve image URLs via Fandom API."""
    if not filenames:
        return {}
    params = {
        "action": "query",
        "titles": "|".join(f"File:{f}" for f in filenames),
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }
    try:
        data = fetch_json(API_URL, params)
    except Exception as e:
        print(f"  ! API error (images): {e}")
        return {}

    pages = data.get("query", {}).get("pages", {})
    result = {}
    for page in pages.values():
        title = page.get("title", "").replace("File:", "")
        for fname in filenames:
            a = urllib.parse.unquote(fname).replace("_", " ").lower()
            b = urllib.parse.unquote(title).replace("_", " ").lower()
            if a == b:
                info = page.get("imageinfo")
                result[fname] = clean_image_url(info[0]["url"]) if info else None
                break
    return result


def build_image_candidates(name, namecard, constellation):
    n = name.replace(" ", "_")
    candidates = {
        "character_icon": [f"{n}_Icon.png"],
        "full_wish": [f"{n}_Wish.png", f"Character_{n}_Full_Wish.png"],
        "namecard": [],
        "constellation": [],
    }
    if namecard:
        nc = namecard.replace(":", "").replace(" ", "_")
        candidates["namecard"].append(f"Namecard_Background_{nc}.png")
    if constellation:
        c = constellation.replace(" ", "_")
        candidates["constellation"].append(f"{c}_Shape.png")
    return candidates


def resolve_images(candidates):
    all_fnames = []
    for cands in candidates.values():
        all_fnames.extend(cands)
    urls = get_file_urls(all_fnames)
    result = {}
    for key, cands in candidates.items():
        result[key] = None
        for fname in cands:
            if urls.get(fname):
                result[key] = urls[fname]
                break
    return result


# ---------- Character parser ----------

def parse_character(character_title):
    print(f"Parsing: {character_title}")

    params = {
        "action": "parse",
        "page": character_title,
        "prop": "text",
        "format": "json",
        "formatversion": "2"
    }

    try:
        data = fetch_json(API_URL, params)
        if "error" in data:
            raise ValueError(f"API Error: {data['error'].get('info')}")
        html_content = data["parse"]["text"]
        soup = BeautifulSoup(html_content, "html.parser")
    except Exception as e:
        raise ValueError(f"Failed to fetch/parse API data for {character_title}: {e}")

    name = parse_name(soup)
    if not name:
        raise ValueError(f"Could not parse character name from API response for {character_title}")

    data_dict = {
        "name": name,
        "title": parse_title(soup),
        "rarity": parse_rarity(soup),
        "element": parse_element(soup),
        "weapon_type": parse_weapon(soup),
        "birthday": parse_simple_field(soup, "birthday"),
        "region": parse_simple_field(soup, "region"),
        "release_date": parse_release_date(soup),
    }

    talents, talent_mapping = parse_talents(soup)
    data_dict["talents"] = talents
    data_dict["constellations"] = parse_constellations(soup, talent_mapping)
    data_dict["other_languages"] = parse_other_languages(soup, "Russian")

    const_div = soup.select_one('div[data-source="constellation"] .pi-data-value')
    constellation_name = None
    if const_div:
        first_a = const_div.find("a")
        if first_a:
            constellation_name = first_a.get_text(strip=True)

    namecard_full = None
    nc_div = soup.select_one('div[data-source="namecard"] .pi-data-value')
    if nc_div:
        item_text = nc_div.select_one(".item-text")
        if item_text:
            namecard_full = item_text.get_text(" ", strip=True)

    candidates = build_image_candidates(name, namecard_full, constellation_name)
    data_dict["images"] = resolve_images(candidates)

    return data_dict


# ---------- Character list ----------

def get_character_list():
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": "Category:Playable Characters",
        "cmlimit": "500",
        "cmtype": "page",
        "format": "json",
    }
    data = fetch_json(API_URL, params)
    members = data.get("query", {}).get("categorymembers", [])

    # Базовые страницы, которые не парсятся (редиректы и под-страницы)
    SKIP_PAGES = {"Aether", "Lumine", "Manekin", "Manekina", "Traveler"}

    titles = []
    for m in members:
        title = m.get("title", "")
        if not title or ":" in title:
            continue
        if title in ("Playable Characters", "Characters") or title in SKIP_PAGES:
            continue
        titles.append(title)
    return titles


# ---------- Storage ----------

def load_existing(path):
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: could not load existing JSON ({e}), starting fresh")
    return {}


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_names_file(path, names_list):
    """Saves a sorted JSON array of character names."""
    names = sorted(set(names_list))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(names, f, ensure_ascii=False, indent=2)


# ---------- Main ----------

def main():
    parser = argparse.ArgumentParser(
        description="Genshin Impact character parser",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            'Examples:\n'
            '  python parser_heroes.py --list\n'
            '  python parser_heroes.py --character "Hu Tao"\n'
            '  python parser_heroes.py --all'
        ),
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--character", "-c", help="Parse a single character by name")
    group.add_argument("--all", action="store_true", help="Parse all characters (skips existing unless --force)")
    group.add_argument("--list", "-l", action="store_true", help="Fetch only the full list of character names")

    parser.add_argument("--force", "-f", action="store_true", help="Force re-parse characters that already exist")

    args = parser.parse_args()

    if args.list:
        print("Fetching full character list via API...")
        try:
            titles = get_character_list()
            save_names_file(NAMES_FILE, titles)
            print(f"Saved {len(titles)} names to {NAMES_FILE.name}")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
        return

    existing = load_existing(DATA_FILE)
    print(f"Loaded {len(existing)} existing characters from {DATA_FILE.name}")

    if args.character:
        try:
            data = parse_character(args.character)
            existing[data["name"]] = data
            save_json(DATA_FILE, existing)
            print(f"{C_GREEN}Saved: {data['name']}{C_RESET}")
        except Exception as e:
            print(f"{C_RED}Error: {e}{C_RESET}", file=sys.stderr)
            sys.exit(1)

    elif args.all:
        try:
            titles = get_character_list()
        except Exception as e:
            print(f"Error fetching character list: {e}", file=sys.stderr)
            sys.exit(1)

        print(f"Found {len(titles)} characters. Delay: {REQUEST_DELAY}s.")
        ok, fail, skip = 0, 0, 0

        for i, title in enumerate(titles, 1):
            # Пропускаем, если уже спарсен и не передан флаг --force
            # Обрабатываем Тревеллера: в JSON он "Traveler(Anemo)", а в списке "Traveler (Anemo)"
            skip_targets = [title, title.replace(" ", "")]
            if any(t in existing for t in skip_targets) and not args.force:
                print(f"[{i}/{len(titles)}] {C_GREEN}Skipping {title} (already parsed){C_RESET}")
                skip += 1
                continue

            print(f"[{i}/{len(titles)}] ", end="", flush=True)
            try:
                data = parse_character(title)
                existing[data["name"]] = data
                save_json(DATA_FILE, existing)
                print(f"  {C_GREEN}OK -> {data['name']}{C_RESET}")
                ok += 1
            except Exception as e:
                print(f"  {C_RED}FAIL: {e}{C_RESET}")
                fail += 1

            # Пауза ТОЛЬКО если мы действительно делали запрос (а не скипнули)
            time.sleep(REQUEST_DELAY)

        print(f"\nDone. {C_GREEN}OK: {ok}{C_RESET}, {C_RED}Failed: {fail}{C_RESET}, {C_GREEN}Skipped: {skip}{C_RESET}, Total in file: {len(existing)}")


if __name__ == "__main__":
    # Лог всегда перезаписывается при каждом запуске
    log_path = Path(__file__).parent / "log.txt"
    log_file = open(log_path, "w", encoding="utf-8", buffering=1)  # buffering=1 = построчно

    orig_stdout, orig_stderr = sys.stdout, sys.stderr
    sys.stdout = Tee(orig_stdout, log_file)
    sys.stderr = Tee(orig_stderr, log_file)

    try:
        main()
    finally:
        sys.stdout = orig_stdout
        sys.stderr = orig_stderr
        log_file.close()
