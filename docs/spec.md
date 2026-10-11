# Software Requirements Specification
## Web Application "Genshin Progress Tracker"

**Version:** 1.2
**Date:** 2026
**Status:** MVP backend + partial frontend delivered; UI refinements in progress

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
4. **Interactive UI goal:** demonstrate advanced React techniques — custom scroll-based navigation, radial progress components, debounced autosave, optimistic updates.

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

- **US-01.** As a guest, I can register and sign in with email + password.
- **US-02.** *(post-MVP)* As a guest, I can sign in via Google OAuth or Telegram Login Widget.
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

Final percentage = sum of weighted components (weights sum = 1.0):

| Component | Weight | Cap rule |
|---|---|---|
| `w_level` | 0.20 | Level 90 = 100%. Levels 91-100 (Masterless Stella Fortuna) do **not** increase the percentage. |
| `w_talents` | 0.20 | Talent level 9 = 100%. Talent 10+ requires Crown of Insight — displayed as a crown badge, does **not** increase the percentage. |
| `w_weapon` | 0.20 | Weapon level 90 + refinement 5 = 100% (70% level + 30% refinement). |
| `w_artifacts` | 0.20 | 5 slots × artifact level / max-by-rarity. Max level: 1★→4, 2★→4, 3★→12, 4★→16, 5★→20. |
| `w_friendship` | 0.20 | Friendship 10 = 100%. |

**Crown counter (display only):** number of talents at level ≥ 10 (0-3). Shown on cards and in zone 2.

**Masterless Stella Fortuna (display only):** count of 0-3 items used to extend level cap beyond 90. Not part of the percentage.

Weights stored in `progress_weights` table; the formula lives in `services/progress.py` (backend) and `shared/lib/progress.ts` (frontend, mirrored for live UI feedback).

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
- `id` (PK, UUID)
- `user_id` (FK → users)
- `character_id` (FK → characters)
- `level` (int, 1-100)
- `level_cap` (int, 90 | 95 | 100 — default 90)
- `constellation` (int, 0-6)
- `friendship` (int, 1-10)
- `talent_normal`, `talent_skill`, `talent_burst` (int, 1-13)
- `masterless_stella_fortuna` (int, 0-3)
- `weapon_id` (FK → weapons, nullable)
- `weapon_level` (int, nullable)
- `weapon_refinement` (int, nullable)
- `custom_icon_url`, `custom_portrait_url`, `custom_background_url` (nullable)
- `custom_hp`, `custom_atk`, `custom_def`, `custom_em` (int, nullable)
- `custom_crit_rate`, `custom_crit_dmg`, `custom_energy_recharge`, `custom_elemental_dmg_bonus` (numeric(5,2), nullable)
- `created_at`, `updated_at`
- UNIQUE (`user_id`, `character_id`)

**user_artifacts**
- `id` (PK, UUID)
- `user_character_id` (FK → user_characters, CASCADE)
- `slot` (enum: flower/plume/sands/goblet/circlet)
- `set_id` (FK → artifact_sets, RESTRICT)
- `rarity` (int, 1-5, CHECK)
- `level` (int, 0-20, CHECK ≤ max-by-rarity: 1★→4, 2★→4, 3★→12, 4★→16, 5★→20)
- `main_stat` (str, nullable)
- `substats` (JSONB, nullable — list of {stat, value})
- UNIQUE (`user_character_id`, `slot`)

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

### 5.1. OAuth Providers

**MVP:** email + password only (Argon2id hashed).

**Post-MVP:** abstract `OAuthProvider` interface (`get_authorize_url()`, `exchange_code()`, `get_user_info()`) with implementations for Google (OpenID Connect, `authlib`), Telegram (Login Widget + HMAC-SHA256), VK, Yandex, Discord. Adding a new provider = new class + registry entry (Open/Closed Principle).

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

- **genshin-db-api** (`https://genshin-db-api.vercel.app/api/v5`) — primary source. Maintained by the genshin-db community, updates within 1-2 days of new patches, returns localized data for characters, weapons, artifacts.
- **genshin.jmp.blue** — legacy fallback (English-only, lags behind patches).
- **Enka.Network** — optional (post-MVP) for importing player data by UID.
- **Fandom Wiki** — planned post-MVP parser for RU localization (name_ru fields already in schema).

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

| Stage | Content | Status |
|---|---|---|
| 0 | Spec, ER diagram, repo structure | ✅ Done |
| 1 | Boilerplate: Docker Compose, FastAPI, Alembic, CI, pre-commit | ✅ Done |
| 2 | Auth: email/password, JWT in cookies, Redis refresh tokens, RBAC | ✅ Done |
| 3 | Catalog: genshin-db-api sync, models, Redis cache, public API | ✅ Done |
| 4 | Tracker backend: CRUD, progress formula, /me/characters | ✅ Done |
| 5 | Frontend scaffold: Vite, React, Tailwind, auth pages | ✅ Done |
| 6 | Frontend catalog: character cards, filters, detail page | ✅ Done |
| 7 | Frontend zone 1 (hero, radial progress) | ✅ Done |
| 8 | Frontend zone 2 (stats, sliders, debounced autosave) | ✅ Done |
| 9 | Frontend zones 3-4 (weapon+artifacts, constellations) | 🚧 In progress |
| 10 | Payments: Stripe + YooKassa, webhook handling | ⏳ Planned |
| 11 | Deployment (Fly.io / Render / Neon / Upstash) | ⏳ Planned |
| 12 | Post-MVP: OAuth, PWA, Enka import, Fandom parser, animations | 📋 Backlog |

---

## 15. Documentation

- **README.md** — description, stack, screenshots, quick start, demo links.
- **docs/** — architecture (Mermaid diagrams), ER, ADR (Architecture Decision Records).
- **CONTRIBUTING.md** — development rules.
- **.env.example** — all variables.
- **API** — OpenAPI at `/docs`.

---

## 16. MVP Acceptance Criteria

1. User can register and sign in with email + password.
2. User sees a list of all characters with a percentage 0–100%.
3. User can fill in and save data for a character.
4. Percentage uses cap-based formula: level 90 = 100%, talent 9 = 100%, crown/Stella counted separately.
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

---

## 18. Changelog

### v1.2 (current)
- Progress formula: level 90 cap, talent 9 cap, crown counter, Masterless Stella Fortuna (0-3)
- Tracker: added custom stats (HP/ATK/DEF/EM/CR/CD/ER/ElemDMG), custom image URLs, level_cap field
- Catalog source switched to genshin-db-api (better freshness + localization)
- Auth: OAuth postponed to post-MVP, email/password only for MVP
- Frontend: full auth flow, catalog with filters/pagination, character detail page with 4 zones (zones 1-2 done)
- Admin: PATCH endpoints for manual editing of catalog entries (name_ru, icons, etc.)
- Artifacts: rarity 1-5 supported with per-rarity level caps
- Crown badge now always shown for owned characters (including 0)

### v1.0
- Initial spec

---

## 19. Post-MVP Backlog

### Auth & Users
- OAuth providers: Google, Telegram, VK, Yandex, Discord (abstract provider pattern)
- Email verification
- Password reset flow
- Rate limiting on auth endpoints (slowapi + Redis)

### Catalog & Data
- Local image storage (S3-compatible) instead of hotlinking Wikia/HoYo URLs
- Fandom parser for Russian localization (auto-fill name_ru, descriptions)
- Fandom parser as fallback for new characters not yet in genshin-db-api
- Enka.Network import: paste UID → auto-fill character progression
- Artifact set bonus calculation (2pc / 2+2 / 4pc) from equipped artifacts

### Tracker
- Full constellation data per character (stat bonuses, talent +3 which boosts cap from 10 to 13)
- Unlocked constellation-colored digits (#38ffff for active, #ffff00 for crowned)
- Character recommendations ("this character has 12% HP leftover to 100%")
- Team compositions, share builds
- Artifact recommendations

### UI/UX
- Shared element transitions between zones (Framer Motion layoutId)
- Dark / light theme toggle
- Mobile-first responsive polish
- PWA installation
- Icon library (SVG) replacing emoji placeholders
- Skeleton loaders everywhere
- Optimistic UI on all mutations

### Payments
- Stripe + YooKassa providers (Strategy pattern)
- Donation flow + cosmetic `premium_visual` subscription
- Webhook handlers with idempotency
- `webhook_logs` table

### Infra & Quality
- Deployment to free hosting (Fly.io / Render + Neon + Upstash)
- E2E tests (Playwright)
- Prometheus metrics + Grafana dashboards
- Background tasks (Celery / APScheduler) for scheduled catalog sync
