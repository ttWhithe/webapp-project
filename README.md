# Genshin Progress Tracker

Web application for tracking character progression in **Genshin Impact**. Fills a gap: existing trackers are either EN-only, paid, or lack the "investment percentage" view.

## What it does

- Track every character: level, ascension, constellation, friendship, talents, weapon, 5 artifacts
- Compute an aggregate **progress percentage (0–100%)** per character
- Sort / filter characters to plan resource spending
- (MVP) OAuth via Google and Telegram, donations via Stripe and YooKassa

## Status

🚧 Active development — MVP in progress. See [`docs/spec.md`](docs/spec.md) for the full SRS.

## Stack

**Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), Alembic, PostgreSQL 16, Redis 7, structlog
**Auth:** JWT in httpOnly cookies, OAuth (Google, Telegram), RBAC
**Payments:** Stripe, YooKassa
**Frontend:** React 18, TypeScript, Vite, TanStack Query, Tailwind, shadcn/ui *(planned)*
**Infra:** Docker Compose, GitHub Actions
**Quality:** ruff, mypy (strict), pytest, pre-commit

## Quick start

Requirements: Docker Desktop, Git.

```bash
git clone <your-repo-url>
cd webapp-project
copy .env.example .env
# generate a secret key and put it into .env as APP_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(64))"
docker compose up --build
```

Then open:

- API docs (Swagger UI): http://localhost:8000/docs
- Liveness: http://localhost:8000/api/v1/health
- Readiness: http://localhost:8000/api/v1/health/ready

## Development

Run linters and tests locally (Windows):

```bash
cd backend
.venv\Scripts\python.exe -m ruff check app
.venv\Scripts\python.exe -m mypy app
.venv\Scripts\python.exe -m pytest
.venv\Scripts\python.exe -m pre_commit run --all-files
```

Or on Linux / macOS:

```bash
cd backend
python -m ruff check app
python -m mypy app
python -m pytest
python -m pre_commit run --all-files
```

## Documentation

- [Software Requirements Specification](docs/spec.md) — full SRS, MVP scope, acceptance criteria

## License

MIT (or TBD — will be decided before public release).

## Disclaimer

Not affiliated with HoYoverse. Uses public game data.
