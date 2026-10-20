# Genshin Impact Character Parser

Парсер персонажей с [Genshin Impact Wiki (Fandom)](https://genshin-impact.fandom.com/wiki/Character/List).
Собирает данные о персонаже (характеристики, таланты, созвездия, картинки, локализации)
и сохраняет в JSON.

## Требования

- Python 3.9+
- Git (для клонирования)
- Windows / Linux / macOS

## Установка (с нуля)

```bash
git clone <repo-url>
cd <repo>/parser_app

python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
```

## Запуск

Все команды выполняются **из папки `parser_app`**.

1. Персонажи
```bash
# Получить полный список имён всех персонажей с вики
python parser_heroes.py --list

# Спарсить / обновить одного персонажа (пишет в heroes.json)
python parser_heroes.py --character "Hu Tao"

# Спарсить / обновить всех персонажей (пишет в heroes.json)
python parser_heroes.py --all
```

2. Оружие
```bash
# Спарсить всё оружие (пишет в weapons.json)
python parser_weapons.py --all

# Спарсить только определенный тип оружия
python parser_weapons.py --type Sword
# Доступные типы: Sword, Claymore, Polearm, Catalyst, Bow

# Перепарсить оружие с флагом --force (игнорирует то, что уже есть в JSON)
python parser_weapons.py --all --force
```

3. Артефакты
```bash
# Спарсить сеты артефактов, картинки и таблицы статов (пишет в artifacts.json)
python parser_artifacts.py

# Перепарсить всё, игнорируя существующие записи
python parser_artifacts.py --force
```

4. Всё сразу (Windows)
Для удобства можно использовать `start.bat`. Двойной клик по нему активирует venv и запустит всех парсеров по очереди.


### Что делает каждая команда

| Команда | Что дёргает | Куда пишет |
|---|---|---|
| `--list` | API вики (Category:Playable Characters) | `heroes_list.json` (только имена) |
| `--character "X"` | Страницу персонажа X | `heroes.json` (полные данные) |
| `--all` | Страницы всех персонажей | `heroes.json` (полные данные) |

**Важно:** `--character` и `--all` **не трогают** `heroes_list.json`. Список имён всегда обновляется только командой `--list`. Так `heroes_list.json` остаётся полным (все персонажи с вики), даже если ты спарсил лишь нескольких.

### Результат

В папке появятся два файла:

1. **`heroes.json`** — полные данные о спарсенных персонажах (словарь, ключ — имя).
2. **`heroes_list.json`** — отсортированный массив **всех** имён с вики (даже тех, что ещё не спарсены). Удобно для выпадающих списков в веб-приложении.

Типичный сценарий:
```bash
python parser_heroes.py --list     # 1 раз: получить полный список имён
python parser_heroes.py --all      # 1 раз: спарсить всех
python parser_heroes.py --character "Hu Tao"  # потом: точечно обновить одного
```

### Запуск через .bat (Windows)

Для удобства можно создать `run.bat` в этой же папке:

```bat
@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
python parser_heroes.py --all
pause
```

Двойной клик по `run.bat` — парсер запустится, результаты упадут в `heroes.json` и `heroes_list.json`.

## Структура проекта

```
parser_app/
├── data/                   # Папка для JSON-файлов (создаётся автоматически)
│   ├── heroes.json         # персонажи
│   ├── heroes_list.json    # список имён персонажей
│   ├── weapons.json        # оружие
│   └── artifacts.json      # артефакты
├── parser_heroes.py        # парсер персонажей
├── parser_weapons.py       # парсер оружия
├── parser_artifacts.py     # парсер артефактов
├── requirements.txt        # зависимости
├── README.md               # этот файл
├── start.bat               # запуск всех парсеров (Windows)
├── log.txt                 # общий лог работы парсеров
└── venv/                   # виртуальное окружение (не в git)
```

В будущем в этой папке появятся другие парсеры (оружие, артефакты и т.п.).

## Формат JSON

### `heroes.json`

Словарь, где ключ — имя персонажа на английском. Пример для Hu Tao:

```json
{
  "Hu Tao": {
    "name": "Hu Tao",
    "title": "Fragrance in Thaw",
    "rarity": 5,
    "element": "Pyro",
    "weapon_type": "Polearm",
    "birthday": "July 15th",
    "region": "LiYue",
    "release_date": "March 02, 2021",
    "talents": { "...": "..." },
    "constellations": { "...": "..." },
    "images": { "...": "..." },
    "other_languages": { "Russian": "Ху Тао" }
  }
}
```

### `heroes_list.json`

Простой массив строк (по алфавиту):

```json
[
  "Hu Tao"
]
```

### `weapons.json`

Словарь с оружием. Ключ — название. В начале файла лежит служебный ключ `_placeholders` с дефолтными картинками для каждого типа оружия.

```json
{
  "_placeholders": {
    "weapon": "https://static.wikia.nocookie.net/...",
    "Sword": "https://static.wikia.nocookie.net/...",
    "Bow": "https://static.wikia.nocookie.net/..."
  },
  "Staff of Homa": {
    "name": "Staff of Homa",
    "weapon_type": "Polearm",
    "quality": 5,
    "icon": "https://static.wikia.nocookie.net/...",
    "base_atk": { "lvl_1": "46", "lvl_90": "608" },
    "secondary_stat": {
      "name": "CRIT DMG",
      "lvl_1": "14.4%",
      "lvl_90": "66.2%"
    },
    "passive": {
      "name": "Reckless Cinnabar",
      "description": "HP increased by 20%..."
    },
    "images": {
      "base": "https://static.wikia.nocookie.net/...",
      "awakened": "https://static.wikia.nocookie.net/..."
    }
  }
}
```

### `artifacts.json`

Словарь, содержащий сеты артефактов, их бонусы, ссылки на картинки слотов, а также глобальные таблицы статов.
Начинается со служебных ключей (начинаются с `_`), которые веб-приложение должно обрабатывать отдельно от самих сетов.

```json
{
  "_placeholders": {
    "flower": "https://static.wikia.nocookie.net/.../Icon_Flower_of_Life.png",
    "plume": "https://...",
    "sands": "https://...",
    "goblet": "https://...",
    "circlet": "https://..."
  },
  "_stats": {
    "main_stats": {
      "Flower of Life": {
        "HP": { "3_star": "430 - 1,893", "4_star": "645 - 3,571", "5_star": "717 - 4,780" }
      }
    },
    "sub_stats": {
      "CRIT Rate (%)": { "1_star": "0.78 / 0.97", "5_star": "2.72 / 3.11 / 3.50 / 3.89" }
    }
  },
  "Gladiator's Finale": {
    "name": "Gladiator's Finale",
    "quality": [4, 5],
    "bonuses": {
      "2pc": "ATK +18%.",
      "4pc": "If the wielder of this artifact set uses a Sword..."
    },
    "images": {
      "flower": "https://static.wikia.nocookie.net/.../Item_Gladiator's_Nostalgia.png",
      "plume": "...",
      "sands": "...",
      "goblet": "...",
      "circlet": "..."
    }
  }
}

```

## Примечания

- Ссылки на картинки очищаются от `?cb=...` и `/revision/latest/...` — остаётся только путь до расширения (`.png`, `.jpg` и т.д.).
- Если созвездие увеличивает уровень таланта (например, 3-е и 5-е), в его объекте появляется поле `"increases": "Elemental Skill"` (или `"Elemental Burst"`).
- Между запросами к вики делается пауза (rate limit) — не спамим сайт.
- В `weapons.json` и `artifacts.json` картинки-заглушки вынесены в служебные ключи (`_placeholders`). Парсер **не подставляет** их автоматически в сами предметы — это задача веб-приложения (если у сета/оружия картинка не спарсилась и равна `null`, веб-приложение берет заглушку для нужного слота/типа).
