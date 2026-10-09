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
