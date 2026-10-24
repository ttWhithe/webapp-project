# Software Requirements Specification
## Web Application "Genshin Progress Tracker"

**Version:** 2.0
**Date:** 2026
**Status:** MVP backend + frontend mostly delivered; Zone 4 and CI fixes in progress

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

Constellations **do not** affect the percentage (shown as a separate badge).

---

## 3. Data Requirements

### 3.1. Data Model (main entities)

**users**
- `id` (PK, UUID), `email` (unique, nullable), `hashed_password` (nullable), `role`, `username`, `avatar_url`, `created_at`, `updated_at`

**oauth_accounts**
- `id` (PK), `user_id` (FK → users), `provider`, `provider_user_id`, `access_token`, `refresh_token`, `expires_at`

**refresh_tokens**
- `id`, `user_id`, `token_hash`, `expires_at`, `revoked`

**characters**
- `id`, `name`, `element`, `weapon_type`, `rarity`, `icon_url`, `max_level`, `version_added`
- *(v2.0)* `release_date`, `namecard_url`, `constellation_icon_url`, `talents` (JSON), `constellations` (JSON), `c3_increases`, `c5_increases`

**weapons**
- `id`, `name`, `type`, `rarity`, `icon_url`, `max_level`, `secondary_stat`
- *(v2.0)* `passive_name`, `passive_desc`

**artifact_sets**
- `id`, `name`, `icon_url`, `bonus_2pc`, `bonus_4pc`
- *(v2.0)* `max_rarity`, `min_rarity`

**artifacts (catalog)**
- `id`, `set_id`, `slot`, `main_stat`, `rarity`

**user_characters**
- `id` (PK, UUID), `user_id` (FK), `character_id` (FK)
- `level`, `level_cap`, `constellation`, `friendship`
- `talent_normal`, `talent_skill`, `talent_burst`, `masterless_stella_fortuna`
- `weapon_id` (FK), `weapon_level`, `weapon_refinement`
- `custom_icon_url`, `custom_portrait_url`, `custom_background_url`
- `custom_hp`, `custom_atk`, `custom_def`, `custom_em`
- `custom_crit_rate`, `custom_crit_dmg`, `custom_energy_recharge`, `custom_elemental_dmg_bonus`
- `created_at`, `updated_at`
- UNIQUE (`user_id`, `character_id`)

**user_artifacts**
- `id` (PK, UUID), `user_character_id` (FK, CASCADE), `slot`, `set_id` (FK), `rarity`, `level`, `main_stat`, `substats` (JSONB)
- UNIQUE (`user_character_id`, `slot`)

**progress_weights**
- `id`, `w_level`, `w_talents`, `w_weapon`, `w_artifacts`, `w_friendship`, `updated_at`

**payments**
- `id`, `user_id`, `provider`, `external_id`, `amount`, `currency`, `status`, `type`, `created_at`

**subscriptions**
- `id`, `user_id`, `plan`, `starts_at`, `ends_at`, `status`

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
| POST | `/admin/catalog/sync` | Refresh catalog from external source (auto-backup before sync) |
| GET | `/admin/catalog/backup` | Download catalog JSON |
| POST | `/admin/catalog/backup` | Upload catalog JSON (merge only empty fields) |
| POST | `/admin/catalog/bulk-import` | Bulk import from parser |
| POST | `/admin/characters/{id}/import-parser` | Import character from parser |
| POST | `/admin/weapons/{id}/import-parser` | Import weapon from parser |
| POST | `/admin/artifact-sets/{id}/import-parser`| Import artifact set from parser |
| PATCH | `/admin/characters/{id}` | Update character |
| PATCH | `/admin/weapons/{id}` | Update weapon |
| PATCH | `/admin/artifact-sets/{id}` | Update artifact set |
| DELETE | `/admin/characters/{id}` | Delete character |
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
**Post-MVP:** abstract `OAuthProvider` interface.

### 5.2. JWT and Cookies
- **Access token:** JWT, HS256, 15 min.
- **Refresh token:** opaque (random string), 30 days, hash stored in Redis.
- **Cookies:** `httpOnly`, `secure`, `samesite=lax`.
- **Rotation:** on `/auth/refresh` the old `jti` is invalidated.

### 5.3. RBAC
Implemented via a FastAPI dependency `require_role(*roles: Role)`.

### 5.4. Redis — Usage Scenarios
1. Storage of refresh tokens.
2. Rate limiting.
3. Cache of characters/weapons/artifacts catalog.
4. Cache of aggregated user percentages.

### 5.5. Misc
- Passwords: **Argon2id**.
- CORS: strict origins whitelist.
- Logs: `structlog` in JSON, no PII.

---

## 6. Payment Requirements

### 6.1. Providers
- **Stripe** — for international cards.
- **YooKassa** — for RU cards.

Abstraction: `PaymentProvider` (Strategy pattern).

### 6.2. Scenarios
1. **Donation:** user enters an amount.
2. **Subscription `premium_visual`:** fixed monthly price.

### 6.3. Webhooks
- Signature verification.
- Idempotency: store `external_id` in `payments` with UNIQUE.

### 6.4. Security
- No PAN / card secrets on the backend.
- Amounts are re-validated on the backend.

---

## 7. UI/UX Requirements

### 7.1. Screens (MVP)
1. **Landing** — what the app is about, CTA "Sign in".
2. **Login** — Google + Telegram + email.
3. **Character list** — cards with icon, name, percentage (progress bar), filters, sorting.
4. **Character card** — fill-in form + percentage breakdown:
   - **Zone 1 (Hero):** Radial progress, clickable slots.
   - **Zone 2 (Stats):** Sliders, custom stat inputs.
   - **Zone 3 (Equipment):** Weapon, 5 artifact slots, set bonuses.
   - **Zone 4 (Constellations):** In progress.
5. **Profile** — user info, role, "Donate" and "Premium" buttons.
6. **Payment** — Stripe Checkout / YooKassa redirect.
7. **Admin panel** — catalog sync, weights, users, manual CRUD, backups.
8. **404 / 500** — standard pages.

### 7.2. Design
- Figma mockups.
- Mobile-first responsiveness (Tailwind breakpoints).
- Dark / light theme.
- UI library: shadcn/ui + Tailwind.

### 7.3. UX Requirements
- Snackbar notifications.
- Optimistic updates on edits (TanStack Query).
- Skeleton loaders.
- Form validation via React Hook Form + Zod.

---

## 8. Integration Requirements

### 8.1. External Catalog Sources
- **genshin-db-api** — primary source.
- **genshin.jmp.blue** — legacy fallback.
- **Enka.Network** — optional (post-MVP).
- **Fandom Wiki** — planned post-MVP parser for RU localization.

### 8.2. Parser Requirements
- Idempotency (upsert by external id).
- Resilience to network errors (retry with exponential backoff).
- Cache is invalidated after the update.

---

## 9. Non-Functional Requirements

### 9.1. Performance
- p95 API response < 300 ms.
- Catalog served from Redis in < 50 ms.

### 9.2. Security
- OWASP Top 10 coverage.
- Dependencies scanned via `pip-audit` / `npm audit`.

### 9.3. Reliability
- Graceful shutdown of FastAPI.
- Health checks: `/health` and `/health/ready`.

### 9.4. Code
- Python 3.12, strict typing, `ruff`, `mypy`.
- TypeScript strict mode.
- Tests: pytest >= 80% coverage.

---

## 10. Technology Stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), Alembic, asyncpg |
| Auth | python-jose, passlib[argon2] |
| Cache | Redis 7, redis-py (async) |
| DB | PostgreSQL 16 |
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand, React Router |
| Infra | Docker, Docker Compose, GitHub Actions |

---

## 11. Architecture

### 11.1. High-Level Diagram
    [Browser SPA] --> [FastAPI] --> [PostgreSQL]
                           |
                           +--> [Redis]
                           +--> [genshin-db-api] (sync)

### 11.2. Backend Structure
    app/
    |-- api/v1/       # admin.py, auth.py, catalog.py, tracker.py
    |-- core/         # config, security
    |-- db/           # session, base
    |-- models/       # SQLAlchemy
    |-- schemas/      # Pydantic
    |-- services/     # business logic

### 11.3. Frontend Structure (Refactored)
    src/
    |-- app/          # routing, providers
    |-- features/
        |-- character-detail/
            |-- components/  # HeroActionArc, RarityArc, RefinementArc, SimpleSlider
            |-- zones/       # ZoneHero, ZoneStats, ZoneWeaponArtifacts, ZoneConstellations
            |-- constants.ts, utils.ts
    |-- pages/        # CharacterDetailPage.tsx
    |-- shared/       # ui-kit, api-client, lib

---

## 12. Testing
- **Unit:** progress formula, parser.
- **Integration:** auth flow, character CRUD.
- **Coverage:** >= 80% for key modules.

---

## 13. Deployment

### 13.1. Local
`docker compose up`

### 13.2. Production
- Backend: Fly.io / Render
- Frontend: Vercel / Netlify
- Postgres: Neon / Supabase
- Redis: Upstash

---

## 14. Development Roadmap

| Stage | Content | Status |
|---|---|---|
| 0 | Spec, ER diagram | ✅ Done |
| 1 | Boilerplate: Docker, FastAPI, Alembic, CI | ✅ Done |
| 2 | Auth: email/password, JWT, RBAC | ✅ Done |
| 3 | Catalog: sync, models, Redis cache | ✅ Done |
| 4 | Tracker backend: CRUD, progress formula | ✅ Done |
| 5 | Frontend scaffold: Vite, React, Tailwind | ✅ Done |
| 6 | Frontend catalog: character cards, filters | ✅ Done |
| 7 | Frontend zone 1 (hero, radial progress) | ✅ Done |
| 8 | Frontend zone 2 (stats, sliders) | ✅ Done |
| 9 | Frontend zone 3 (weapon + artifacts) | ✅ Done |
| 10 | Frontend zone 4 (constellations) | 🚧 In progress |
| 11 | Payments: Stripe + YooKassa | ⏳ Planned |
| 12 | Deployment | ⏳ Planned |
| 13 | Fix CI tests and linters | 🚧 In progress |

---

## 15. Documentation
- **README.md**
- **docs/**
- **CONTRIBUTING.md**
- **.env.example**

---

## 16. MVP Acceptance Criteria
1. User can register and sign in.
2. User sees a list of all characters with a percentage.
3. User can fill in and save data for a character.
4. Percentage uses cap-based formula.
5. Filters and sorting work.
6. Donation works via Stripe and YooKassa (sandbox).
7. RBAC works (admin / user / guest).
8. Refresh tokens are stored in Redis.
9. Catalog is refreshed from an external source.
10. CI is green; tests >= 80%.
11. Deployed to free hosting; link in README.

---

## 17. Constraints and Assumptions
- Not affiliated with HoYoverse. Public data is used.
- MVP does not include a mobile app (PWA — post-MVP).
- No payment information is stored — only transaction IDs.
- Catalog may lag behind the current patch until synchronized.

---

## 18. Changelog

### v2.0 (current)
- **Admin panel:** added bulk import from JSON, manual CRUD, auto-backup system, and sync protection (preventing overwriting manual edits).
- **DB models updated:** added `release_date`, `talents`, `constellations`, `passive_name`, `min_rarity`, etc. for characters, weapons, and artifact sets.
- **Frontend refactoring:** split `CharacterDetailPage` into modular features (`components`, `zones`).
- **Zone 3 (Weapon + Artifacts):** full UI with stat validation (Main/Sub stats), set bonuses (2pc/4pc), and rarity backgrounds.
- **Zone 1:** Added clickable slots and default 1-star weapon placeholders.
- **Fixed:** infinite loop in React Query, SQLAlchemy `MissingGreenlet` error when updating artifacts.
- **CI:** in progress (fixing pytest fixtures and mypy types).

### v1.2
- Progress formula: level 90 cap, talent 9 cap, crown counter.
- Tracker: added custom stats.
- Catalog source switched to genshin-db-api.
- Admin: PATCH endpoints for manual editing.

### v1.0
- Initial spec.

---

## 19. Post-MVP Backlog

### Auth & Users
- OAuth providers: Google, Telegram, VK, Yandex, Discord.
- Email verification.
- Password reset flow.

### Catalog & Data
- Local image storage (S3).
- Fandom parser for RU localization.
- Enka.Network import.

### Tracker
- Full constellation data.
- Team compositions, share builds.
- Artifact recommendations.

### UI/UX
- Shared element transitions (Framer Motion).
- Dark / light theme toggle.
- PWA installation.

### Payments
- Stripe + YooKassa providers.
- Webhook handlers with idempotency.

### Infra & Quality
- Deployment to free hosting.
- E2E tests (Playwright).
- Prometheus metrics.
