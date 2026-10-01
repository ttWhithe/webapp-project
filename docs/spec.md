# Software Requirements Specification
## Web Application "Genshin Progress Tracker"

**Version:** 1.0
**Date:** 2026
**Status:** Draft for MVP development

---

## 1. General Provisions

### 1.1. Name

**Full:** Web application for tracking character progression in the game Genshin Impact.
**Short:** Genshin Progress Tracker (GPT-Tracker).

### 1.2. Purpose

The application allows players to:

- track the progression state of their characters (level, talents, weapon, artifacts, constellations, friendship);
- see an integral "investment" percentage for each character (0–100%);
- manage progression priorities by comparing characters by percentage;
- (post-MVP) maintain multiple teams/compositions and share them.

### 1.3. Target Audience

B2C — Genshin Impact players (RU/EN segments). Age 14+, interested in resource optimization.

### 1.4. Development Goals

1. **Functional:** provide a convenient tool for managing progression resources.
2. **Portfolio goal:** demonstrate proficiency in a Python Middle+/Senior- stack (FastAPI async, SQLAlchemy 2.0, Redis, OAuth, RBAC, payments, tests, Docker, CI/CD) and a modern frontend (React + TS).
3. **Educational:** practice OAuth flows, cookies, Redis caching, and payment webhooks.

### 1.5. Terms and Abbreviations

| Term | Definition |
|---|---|
| MVP | Minimum Viable Product |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token |
| OAuth | Open Authorization |
| SPA | Single Page Application |
| CI/CD | Continuous Integration / Continuous Delivery |
---

## 2. Functional Requirements

### 2.1. User Roles

| Role | Description | Permissions |
|---|---|---|
| `guest` | Unauthenticated | View landing, register/sign in, view public character catalog |
| `user` | Authenticated | All above + manage own characters, view percentages |
| `premium` | User with cosmetic subscription | All above + themes, badges, animations (functionality is not restricted) |
| `admin` | Administrator | All above + manage catalog, formula weights, users, view statistics |

### 2.2. User Stories (MVP)

- **US-01.** As a guest, I can sign up / sign in via Google OAuth to start using the app.
- **US-02.** As a guest, I can sign in via Telegram Login Widget.
- **US-03.** As a user, I can log out, and my refresh token is invalidated.
- **US-04.** As a user, I see a list of all available characters with a progress percentage (0–100%).
- **US-05.** As a user, I can open a character card and fill in: level (1–90), ascension (0–6), constellation (0–6), friendship (1–10), talents (1–10/13), weapon (id, level, refinement), 5 artifacts (slot, set, level, stats).
- **US-06.** As a user, I see how the percentage changes after saving data.
- **US-07.** As a user, I can filter characters: "not invested (<50%)", "in progress (50–80%)", "ready (>80%)".
- **US-08.** As a user, I can make a donation of an arbitrary amount via Stripe or YooKassa.
- **US-09.** As a user, I can subscribe to the cosmetic plan `premium_visual`.
- **US-10.** As an admin, I can manually refresh the character catalog from an external source.
- **US-11.** As an admin, I can change the weights of the progress formula (stored in DB / config).

### 2.3. System Modules

1. **Auth module** — registration, sign-in, OAuth (Google, Telegram), refresh tokens, logout, RBAC.
2. **Catalog module** — catalog of characters, weapons, artifacts, sets; parser for external sources; Redis caching.
3. **Tracker module** — CRUD of user character data, percentage calculation, filters, sorting.
4. **Payment module** — Stripe + YooKassa, donations, subscription, webhook handling.
5. **Admin module** — catalog management, weights, users.
6. **Frontend module** — SPA built with React + TS.

### 2.4. Progress Formula (MVP)

Final percentage = sum of weighted components:

    progress = w_level      * (level / max_level)
             + w_talents    * avg(talent_i / max_talent_i for i in {normal, skill, burst})
             + w_weapon     * ((weapon_level / max_level) * 0.7 + (refinement / 5) * 0.3)
             + w_artifacts  * avg(artifact_level / 20 for artifact in 5 slots)
             + w_friendship * (friendship / 10)

**MVP weights (equal, sum = 1.0):**

| Component | Weight |
|---|---|
| `w_level` | 0.20 |
| `w_talents` | 0.20 |
| `w_weapon` | 0.20 |
| `w_artifacts` | 0.20 |
| `w_friendship` | 0.20 |

Constellations **do not** affect the percentage (shown as a separate badge).

Weights are stored in the `progress_weights` table and editable by an admin. The formula is implemented in the isolated module `services/progress.py`.

---

## 3. Data Requirements

### 3.1. Data Model (main entities)

**users**
- `id` (PK, UUID)
- `email` (unique, nullable — if OAuth-only)
- `hashed_password` (nullable)
- `role` (enum: `guest`, `user`, `premium`, `admin`)
- `username` (unique)
- `avatar_url`
- `created_at`, `updated_at`

**oauth_accounts**
- `id` (PK)
- `user_id` (FK → users)
- `provider` (enum: `google`, `telegram`, `vk`, `yandex`, `discord`)
- `provider_user_id` (unique with provider)
- `access_token`, `refresh_token` (encrypted)
- `expires_at`

**refresh_tokens** *(or store in Redis — see section 5.4)*
- `id`, `user_id`, `token_hash`, `expires_at`, `revoked`

**characters**
- `id`, `name`, `element`, `weapon_type`, `rarity`, `icon_url`, `max_level`, `version_added`

**weapons**
- `id`, `name`, `type`, `rarity`, `icon_url`, `max_level`, `secondary_stat`

**artifact_sets**
- `id`, `name`, `icon_url`, `bonus_2pc`, `bonus_4pc`

**artifacts** *(catalog)*
- `id`, `set_id`, `slot`, `main_stat`, `rarity`

**user_characters**
- `id`, `user_id`, `character_id`
- `level`, `ascension`, `constellation`, `friendship`
- `talent_normal`, `talent_skill`, `talent_burst`
- `weapon_id`, `weapon_level`, `weapon_refinement`
- `created_at`, `updated_at`
- UNIQUE (`user_id`, `character_id`)

**user_artifacts**
- `id`, `user_character_id`, `slot`, `set_id`, `level`, `main_stat`, `substats` (JSONB)

**progress_weights**
- `id`, `w_level`, `w_talents`, `w_weapon`, `w_artifacts`, `w_friendship`, `updated_at`

**payments**
- `id`, `user_id`, `provider` (`stripe` / `yookassa`), `external_id`, `amount`, `currency`, `status`, `type` (`donation` / `subscription`), `created_at`

**subscriptions**
- `id`, `user_id`, `plan` (`premium_visual`), `starts_at`, `ends_at`, `status`

### 3.2. Storage Requirements

- Primary DB: **PostgreSQL 16** (async via `asyncpg`).
- Cache & sessions: **Redis 7**.
- Migrations: **Alembic**.
- Indexes: on `user_id` in every user-owned table; unique composites on `oauth_accounts(provider, provider_user_id)`, `user_characters(user_id, character_id)`.

---

## 4. API Requirements

### 4.1. General Rules

- Base URL: `/api/v1`
- Format: JSON
- Auth: JWT in httpOnly cookies — `access_token` (15 min) + `refresh_token` (30 days, rotation).
- Versioning via URL.
- Errors: RFC 7807 (Problem Details) — `{type, title, status, detail, instance}`.
- OpenAPI 3.1 auto-generated by FastAPI; docs at `/docs` and `/redoc`.

### 4.2. Main Endpoints

**Auth**

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register by email |
| POST | `/auth/login` | Sign in by email/password |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Log out, revoke refresh |
| GET | `/auth/oauth/google` | Start Google OAuth |
| GET | `/auth/oauth/google/callback` | Callback |
| POST | `/auth/oauth/telegram` | Verify Telegram signature |
| GET | `/users/me` | Current user |

**Catalog**

| Method | Path | Description |
|---|---|---|
| GET | `/characters` | List of characters (Redis cache) |
| GET | `/characters/{id}` | Details |
| GET | `/weapons` | List of weapons |
| GET | `/artifact-sets` | Artifact sets |

**Tracker**

| Method | Path | Description |
|---|---|---|
| GET | `/me/characters` | My characters + progress % |
| GET | `/me/characters/{id}` | Details + percentage breakdown |
| POST | `/me/characters` | Add character to tracker |
| PATCH | `/me/characters/{id}` | Update data |
| DELETE | `/me/characters/{id}` | Delete |
| GET | `/me/characters?filter=low` | Filters |

**Payments**

| Method | Path | Description |
|---|---|---|
| POST | `/payments/donate` | Create payment session (donation) |
| POST | `/payments/subscribe` | Subscribe to `premium_visual` |
| POST | `/payments/webhook/stripe` | Stripe webhook |
| POST | `/payments/webhook/yookassa` | YooKassa webhook |

**Admin (role=admin)**

| Method | Path | Description |
|---|---|---|
| POST | `/admin/catalog/sync` | Refresh catalog from external source |
| PATCH | `/admin/progress-weights` | Change weights |
| GET | `/admin/users` | User list |
| PATCH | `/admin/users/{id}/role` | Change role |

### 4.3. Pagination, Filters, Sorting

- Pagination: `?limit=&offset=`, response `{items, total, limit, offset}`.
- Sorting: `?sort=progress_desc|name_asc|rarity_desc`.
- Filters: `?element=pyro&rarity=5&min_progress=50`.

---

## 5. Auth, Security, Caching Requirements

### 5.1. OAuth Providers (MVP)

- **Google** — OpenID Connect, `authlib`.
- **Telegram** — Login Widget + HMAC-SHA256 signature verification on the backend.

Architecture: abstract class `OAuthProvider` with methods `get_authorize_url()`, `exchange_code()`, `get_user_info()`. Adding a new provider = new class + registration in the registry (Open/Closed Principle).

### 5.2. JWT and Cookies

- **Access token:** JWT, HS256, 15 min, payload: `sub`, `role`, `exp`.
- **Refresh token:** opaque (random string), 30 days, hash stored in Redis (`refresh:{user_id}:{jti}`).
- **Cookies:** `httpOnly`, `secure`, `samesite=lax`.
- **CSRF protection:** double-submit cookie or `samesite=strict` for mutating requests.
- **Rotation:** on `/auth/refresh` the old `jti` is invalidated, a new one is issued.
- **Logout:** remove `jti` from Redis → instant revocation.

### 5.3. RBAC

Implemented via a FastAPI dependency:

    def require_role(*roles: Role):
        async def checker(user=Depends(get_current_user)):
            if user.role not in roles:
                raise HTTPException(403)
            return user
        return checker

### 5.4. Redis — Usage Scenarios

1. Storage of refresh tokens (blacklist/whitelist, rotation).
2. Rate limiting (e.g., `slowapi` on Redis): login, register, payments.
3. Cache of characters/weapons/artifacts catalog (TTL 24h, invalidation by key `catalog:*`).
4. Cache of aggregated user percentages (TTL 5 min, invalidated on PATCH).
5. Optional: Pub/Sub for real-time notifications (post-MVP).

### 5.5. Misc

- Passwords: **Argon2id** (`passlib` + `argon2-cffi`).
- CORS: strict origins whitelist.
- Rate limiting on all auth endpoints.
- Input validation via Pydantic v2.
- Secrets — via `.env` + `pydantic-settings` (never committed to the repository).
- Logs: `structlog` in JSON, no PII.

---

## 6. Payment Requirements

### 6.1. Providers

- **Stripe** — for international cards.
- **YooKassa** — for RU cards.

Abstraction: `PaymentProvider` (Strategy pattern) with methods:
`create_payment()`, `verify_webhook()`, `handle_event()`.

### 6.2. Scenarios

1. **Donation:** user enters an amount (min. 100 RUB / 1 EUR), chooses a provider, is redirected to the payment page, and after success a record is written to `payments` with status `succeeded`.
2. **Subscription `premium_visual`:** fixed monthly price, gives cosmetics (themes, badges). Functionality is not restricted.

### 6.3. Webhooks

- Signature verification (`Stripe-Signature`, YooKassa IP + secret).
- Idempotency: store `external_id` in `payments` with UNIQUE; repeated processing is ignored.
- All webhooks are logged into a separate `webhook_logs` table (input payload + result).

### 6.4. Security

- No PAN / card secrets on the backend.
- Amounts are re-validated on the backend (never trust the frontend).

---

## 7. UI/UX Requirements

### 7.1. Screens (MVP)

1. **Landing** — what the app is about, CTA "Sign in".
2. **Login** — Google + Telegram + email.
3. **Character list** — cards with icon, name, percentage (progress bar), filters, sorting.
4. **Character card** — fill-in form + percentage breakdown by components (**level / talents / weapon / artifacts / friendship**).
5. **Profile** — user info, role, "Donate" and "Premium" buttons.
6. **Payment** — Stripe Checkout / YooKassa redirect.
7. **Admin panel** — catalog sync, weights, users.
8. **404 / 500** — standard pages.

### 7.2. Design

- Figma mockups created before frontend development.
- Mobile-first responsiveness (Tailwind breakpoints).
- Dark / light theme.
- UI library: shadcn/ui + Tailwind.

### 7.3. UX Requirements

- Snackbar notifications for success/error.
- Optimistic updates on edits (TanStack Query).
- Skeleton loaders.
- Form validation via React Hook Form + Zod with instant feedback.

---

## 8. Integration Requirements

### 8.1. External Catalog Sources

- **genshin.dev API** — primary source (characters, weapons, artifacts).
- **Enka.Network** — optional (post-MVP) for importing player data by UID.
- The parser is implemented as a separate module `services/catalog_sync.py`, triggered:
  - manually via `POST /admin/catalog/sync`;
  - by cron (APScheduler or Celery beat, post-MVP).

### 8.2. Parser Requirements

- Idempotency (upsert by external id).
- Resilience to network errors (retry with exponential backoff).
- Logging of discrepancies.
- Cache is invalidated after the update.

---

## 9. Non-Functional Requirements

### 9.1. Performance

- p95 API response < 300 ms (excluding external calls).
- Catalog served from Redis in < 50 ms.
- Support for 100 concurrent users on a single instance (for MVP).

### 9.2. Security

- OWASP Top 10 coverage.
- Dependencies scanned via `pip-audit` / `npm audit` in CI.
- Secrets — via env / secrets manager only.

### 9.3. Reliability

- Graceful shutdown of FastAPI.
- Health checks: `/health` (liveness) and `/health/ready` (readiness with DB + Redis check).
- DB backups (in prod — Neon automatic).

### 9.4. Code

- Python 3.12, strict typing, `ruff`, `mypy` (strict for core).
- TypeScript strict mode, `eslint` + `prettier`.
- Pre-commit hooks.
- Tests: pytest >= 80% coverage on key modules (auth, progress, payments).

---

## 10. Technology Stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), Alembic, asyncpg |
| Auth | python-jose / pyjwt, passlib[argon2], authlib (Google), httpx (Telegram) |
| Cache | Redis 7, redis-py (async) |
| DB | PostgreSQL 16 |
| Payments | stripe-python, yookassa SDK |
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand, React Router, React Hook Form + Zod, shadcn/ui + Tailwind |
| Infra | Docker, Docker Compose, GitHub Actions, Nginx (prod) |
| Monitoring | structlog, prometheus-fastapi-instrumentator (optional) |
| Tests | pytest, pytest-asyncio, httpx.AsyncClient, testcontainers |
| Quality | ruff, mypy, eslint, prettier, pre-commit |

---

## 11. Architecture

### 11.1. High-Level Diagram

    [Browser SPA] --HTTPS--> [Nginx] --> [FastAPI] --> [PostgreSQL]
                                           |
                                           +--> [Redis]
                                           |
                                           +--> [Stripe API]
                                           |
                                           +--> [YooKassa API]
                                           |
                                           +--> [genshin.dev API] (sync)

### 11.2. Backend Structure

    app/
    |-- api/            # routers
    |   `-- v1/
    |-- core/           # config, security, deps
    |-- db/             # session, base
    |-- models/         # SQLAlchemy
    |-- schemas/        # Pydantic
    |-- services/       # business logic
    |   |-- auth/
    |   |-- oauth/
    |   |-- progress.py
    |   |-- payments/
    |   `-- catalog_sync.py
    |-- repositories/   # data access
    |-- tasks/          # background tasks
    |-- tests/
    `-- main.py

Principles: layered architecture, DI via FastAPI `Depends`, separation of ORM models and Pydantic schemas, business logic in services (not in routers).

### 11.3. Frontend Structure

    src/
    |-- app/            # routing, providers
    |-- features/       # auth, tracker, payments
    |-- entities/       # character, user
    |-- shared/         # ui-kit, api-client, lib
    `-- pages/

---

## 12. Testing

- **Unit:** progress formula, OAuth signatures, parser.
- **Integration:** auth flow (register → login → refresh → logout), character CRUD, payment webhooks.
- **E2E (optional):** Playwright on critical scenarios.
- **Coverage:** >= 80% for `services/`, `api/v1/auth`.

---

## 13. Deployment

### 13.1. Local

`docker compose up` → spins up Postgres, Redis, backend, frontend.

### 13.2. Production (free, for portfolio)

- Backend: Fly.io / Render
- Frontend: Vercel / Netlify
- Postgres: Neon / Supabase
- Redis: Upstash
- Secrets: platform env variables
- CI/CD: GitHub Actions → auto-deploy on push to `main`

### 13.3. Artifacts

- Multi-stage `Dockerfile` for the backend.
- `Dockerfile` + nginx for the frontend.
- `docker-compose.yml` (dev) and `docker-compose.prod.yml`.

---

## 14. Development Roadmap

| Stage | Content | Artifact |
|---|---|---|
| 0 | Spec, ER diagram, Figma mockups, repo structure | `docs/`, Figma |
| 1 | Boilerplate: Docker Compose, FastAPI skeleton, Alembic, CI, pre-commit | working `docker compose up` |
| 2 | Auth: email + OAuth (Google, Telegram), JWT in cookies, Redis, RBAC | end-to-end login flow |
| 3 | Catalog: genshin.dev parser, models, Redis cache | characters in DB |
| 4 | Tracker: CRUD + formula + filters | percentages on backend |
| 5 | Frontend MVP: login, list, card | end-to-end UI |
| 6 | Payments: Stripe + YooKassa, webhooks, subscription | donation works |
| 7 | Tests, deployment, README | public link |
| 8 | (post-MVP) VK / Yandex / Discord OAuth, PWA, Enka import, Celery | — |

---

## 15. Documentation

- **README.md** — description, stack, screenshots, quick start, demo links.
- **docs/** — architecture (Mermaid diagrams), ER, ADR (Architecture Decision Records).
- **CONTRIBUTING.md** — development rules.
- **.env.example** — all variables.
- **API** — OpenAPI at `/docs`.

---

## 16. MVP Acceptance Criteria

1. User can sign in via Google and Telegram.
2. User sees a list of all characters with a percentage 0–100%.
3. User can fill in and save data for a character.
4. Percentage is computed correctly using equal weights **20 / 20 / 20 / 20 / 20** for level, talents, weapon, artifacts, and friendship.
5. Filters and sorting work.
6. Donation works via Stripe and YooKassa (sandbox).
7. RBAC works (admin / user / guest).
8. Refresh tokens are stored in Redis with rotation.
9. Catalog is refreshed from an external source via a button.
10. CI is green; tests >= 80% on key modules.
11. Deployed to free hosting; link in README.

---

## 17. Constraints and Assumptions

- Not affiliated with HoYoverse. Public data is used.
- MVP does not include a mobile app (PWA — post-MVP).
- No payment information is stored — only transaction IDs.
- Catalog may lag behind the current patch until synchronized.
- Legally: donations / subscription are "project support", without in-game advantages.
