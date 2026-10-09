# Repository guidance for coding agents

## Before changing code
1. Read `README.md`, `architecture.md`, `requirements.md`, and `plan.md`.
2. Identify the affected app/package and its existing conventions.
3. State assumptions when requirements are ambiguous; do not invent integrations or credentials.

## Architecture rules
- `apps/web` is the Next.js UI; `apps/api` is the FastAPI API.
- Keep business rules and authorization in FastAPI, never only in the frontend.
- Use PostgreSQL for durable relational data; media binaries belong in object storage.
- Keep the API under `/api/v1`; make breaking changes explicit.
- Use migrations for schema changes. Do not create production tables implicitly at app startup.
- Use cursor pagination for growing feed-like collections.

## Security rules
- Never commit secrets or real `.env` files.
- Never log passwords, access tokens, refresh tokens, or private content.
- Validate and authorize every resource access server-side.
- Add tests for ownership and private-profile visibility whenever touching social features.
- Do not trust client-supplied filenames, MIME types, IDs, or role flags.

## Quality gates
- Add or update tests for every behavior change.
- Run the relevant formatter, linter, type checker, and test suite.
- Keep components accessible: semantic HTML, labels, keyboard support, visible focus.
- Document new environment variables in `.env.example`.
- Keep PRs scoped to one vertical slice and update `plan.md` checkboxes only when done.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
