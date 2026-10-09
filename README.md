# Socially

A photo-first social app. Turborepo monorepo with a Next.js web client and a FastAPI API on PostgreSQL (Supabase).

**Current scope:** account creation (register / log in / log out), photo post uploading, the home feed,
likes and comments. Follows, saves, search, notifications and moderation are planned — see `plan.md`.

Visual design follows `DESIGN.md` (90s xerox/zine): tokens live in `apps/web/src/app/globals.css`.

```text
apps/web    Next.js 16 (App Router, Tailwind v4) — UI, served on :3000
apps/api    FastAPI + SQLAlchemy 2 + Alembic — API on :8000
packages/   shared eslint / typescript config, ui stub
```

## Prerequisites

- Node 24+, pnpm 11
- Python 3.12 and [uv](https://docs.astral.sh/uv/)
- PostgreSQL: a Supabase project (default) or local Postgres / `docker compose up db`
- Local Postgres for the test suites (tests never touch the dev database)

## Setup

```sh
pnpm install
cd apps/api && uv sync && cp .env.example .env   # then fill in DATABASE_URL, SECRET_KEY
cd ../web && cp .env.example .env.local
cd ../.. && pnpm migrate                          # alembic upgrade head
pnpm dev                                          # web :3000 + api :8000 in the turbo TUI
```

`pnpm dev` opens Turborepo's terminal UI with one pane per app: use ↑/↓ to switch between `web#dev` and
`api#dev`, `i` to interact with the selected task, and `Ctrl+C` to stop both. In terminals without a
TTY (CI, some IDE consoles) use `pnpm dev:stream` for interleaved, prefixed logs.

Open http://localhost:3000. API docs (OpenAPI): http://localhost:8000/docs.

### Using Supabase

Use the **transaction pooler** (port 6543) for `DATABASE_URL` and the **session pooler** (port 5432) for
`MIGRATION_DATABASE_URL`. URL-encode special characters in the password (`@` → `%40`).
The migration enables Row Level Security on every table with no policies, so Supabase's Data API
(anon/authenticated roles) can't read them; the API connects as the table owner, which bypasses RLS.

## Environment variables

| Where | Variable | Purpose |
| --- | --- | --- |
| api | `DATABASE_URL` | Runtime Postgres URL (`postgresql+psycopg://…`) |
| api | `MIGRATION_DATABASE_URL` | Optional URL for Alembic (session-mode connection) |
| api | `SECRET_KEY` | ≥32 chars; signs CSRF tokens |
| api | `FRONTEND_ORIGINS` | JSON list of allowed browser origins (CORS + Origin check) |
| api | `COOKIE_SECURE` | `true` in production (HTTPS-only cookies) |
| api | `SESSION_TTL_DAYS`, `MEDIA_ROOT`, `MAX_UPLOAD_BYTES` | Session lifetime, image directory, per-image cap |
| api | `REGISTER_LIMIT_PER_HOUR` | Sign-ups per IP per hour (default 5) |
| web | `API_ORIGIN` | Server-only. Where Next forwards `/api/v1/*` and server-side fetches |
| tests | `TEST_DATABASE_URL`, `E2E_DATABASE_URL` | Disposable local DBs (default `localhost/socially_test`, `socially_e2e`) |

The browser only ever calls same-origin `/api/v1/*`, so no `NEXT_PUBLIC_*` variable is needed.

## Commands

```sh
pnpm lint          # eslint (web) + ruff (api)
pnpm typecheck     # tsc (web) + mypy (api)
pnpm test          # vitest (web) + pytest (api, creates/migrates socially_test)
pnpm e2e           # Playwright: boots an isolated API (:8100, socially_e2e) + production web build (:3100)
pnpm build         # next build
pnpm migrate       # alembic upgrade head
cd apps/api && uv run alembic revision -m "describe change"   # new migration
```

First E2E run: `pnpm --filter web exec playwright install chromium`.

## Deployment

- **API:** `apps/api/Dockerfile`. Run `alembic upgrade head` as a release step, then start uvicorn.
  Set `COOKIE_SECURE=true`, a strong `SECRET_KEY`, and `FRONTEND_ORIGINS` to the real site origin.
  Mount persistent storage at `MEDIA_ROOT`. Run a **single worker** until rate limiting moves to Redis.
- **Web:** `pnpm --filter web build && pnpm --filter web start` (or any Next host) with `API_ORIGIN` set.
- **Proxy/IP:** put the web app behind a load balancer that *overwrites* `X-Forwarded-For`; Next only
  sets it when absent, so client-supplied values would otherwise reach the API's IP-based rate limits.
- `docker compose up` gives a self-contained Postgres + API for local use.

## Known limitations

- Media is stored on the API's local disk (`MEDIA_ROOT`), not S3-compatible storage yet.
- The feed shows all posts newest-first; follow-based filtering arrives with the follow graph.
- Rate limits are in-process memory (reset on restart, per-worker).
- No email verification / password reset yet (required before public launch).
- `docker compose` / Dockerfile were config-validated but not built here (Docker daemon was off).
