# Implementation Plan

> **Current slice (done):** register / login / logout with server-side sessions + CSRF, photo post upload
> (multi-image, validated + re-encoded), home feed with cursor pagination, post delete. Backend: 19 pytest
> tests; web: 11 vitest tests + 6 Playwright E2E. Items below are checked only when fully done.
>
> **Next steps:** S3-compatible storage + upload intents → profile pages/editing → follow graph (feed
> filtering) → likes/comments/saves → search/notifications → block/report → email verification/reset.

Build in vertical slices. Each phase should end with a runnable application and tests. Do not start stories, reels, or DMs before the core feed and privacy model are reliable.

## Phase 0 — Repository foundation
- [x] Create pnpm workspace and Turborepo tasks.
- [x] Add Next.js TypeScript app and FastAPI app.
- [ ] Add environment examples, formatting/linting, editor settings, and contribution instructions.
- [ ] Add local PostgreSQL (and optional Redis/MinIO) via Docker Compose.
- [ ] Add CI for frontend checks, API lint/tests, and migration validation.

**Done when:** a developer can clone, install, run both apps, and access health endpoints.

## Phase 1 — Data and API foundation
- [x] Configure Pydantic settings and database sessions.
- [x] Add SQLAlchemy models and Alembic migrations.
- [x] Add consistent error handling, request IDs, logging, and `/health/live`, `/health/ready`.
- [x] Establish `/api/v1` router and OpenAPI contract.
- [x] Add pytest fixtures and a test database.

**Done when:** migrations run cleanly and API tests execute in CI.

## Phase 2 — Authentication and profiles
- [ ] Register/login/logout, password hashing, secure session strategy.
- [ ] Add current-user endpoint and profile edit.
- [ ] Add username validation, email verification and reset flow.
- [ ] Add public/private profile rules and tests.
- [ ] Build login, registration, profile, and settings screens.

**Done when:** account flows work end-to-end and auth/privacy tests pass.

## Phase 3 — Posts and media
- [ ] Add upload intent and object-storage adapter.
- [ ] Add post and post-media creation/list/detail/update/delete endpoints.
- [ ] Add image preview, upload progress, validation and retry UX.
- [ ] Add profile post grid and post detail page.
- [ ] Add tests for file limits, ownership, and invalid media.

**Done when:** a user can publish, view, and delete their own photo post.

## Phase 4 — Social graph and feed
- [ ] Add follow/unfollow and private follow-request lifecycle.
- [ ] Add feed query with cursor pagination and indexes.
- [ ] Add like/unlike, comments, and saved posts.
- [ ] Build feed cards, comments UI, follow controls, and saved collection.
- [ ] Add concurrency tests for duplicate likes/follows.

**Done when:** following another account changes the feed and interactions are persisted.

## Phase 5 — Discovery and notifications
- [ ] Add user/hashtag search and Explore.
- [ ] Create notification records for relevant actions.
- [ ] Add unread count and mark-read behavior.
- [ ] Add report/block flows and basic moderation actions.
- [ ] Add pagination, empty states, and error states.

**Done when:** users can discover accounts, receive notifications, and block/report abuse.

## Phase 6 — Hardening and launch readiness
- [ ] Add rate limiting, security headers, CORS allowlist, CSRF protection if cookie auth.
- [ ] Add account deletion/export and retention rules.
- [ ] Add image metadata stripping, thumbnails, and object lifecycle rules.
- [ ] Add end-to-end Playwright tests for registration → follow → post → like/comment.
- [ ] Add monitoring, alerts, backup/restore drill, load test, and deployment runbook.
- [ ] Review accessibility and mobile responsiveness.

**Done when:** critical flows are tested, operational ownership is documented, and privacy/security checks pass.

## Recommended order of work
1. Make API health + database migrations work.
2. Implement authentication and profile APIs.
3. Build the matching frontend routes.
4. Add posts and media storage.
5. Add follow graph and feed.
6. Add engagement and discovery.
7. Add safety, notifications, and production hardening.

## Engineering rules
- Every feature includes API tests and UI loading/empty/error states.
- Every database change includes an Alembic migration.
- Never merge a feature that bypasses API authorization.
- Prefer simple, explicit code over premature microservices.
- Update `architecture.md` when a design decision changes.
