# AGENTS.md — myshop

E-commerce storefront: **Astro 5 + React islands** (`apps/web`), **Java 21 / Spring Boot 4**
API (`apps/api`), **PostgreSQL 16**, Stripe Checkout.

Full architecture and roadmap: `docs/PLAN.md`.

## Non-negotiables — violations = reject

1. NEVER use `double`/`float` for money. Money is `long` cents everywhere (DB, API, UI).
2. NEVER return JPA entities from controllers — map to DTOs.
3. NEVER trust client prices/totals — recalculate the entire order server-side at checkout.
4. No unbounded queries — every list endpoint is paginated.
5. Schema changes via Flyway only, forward-only, backward-compatible. `ddl-auto=validate` in
   every environment.
6. Validate input at BOTH boundaries: Zod (web) + Bean Validation (api). Frontend validation
   is UX, not security.
7. Never commit secrets. `.env` is git-ignored; keep `.env.example` current when env vars change.
8. The Playwright E2E money path (browse → cart → coupon → checkout → confirmation) is never
   skipped, weakened, or deleted.

## When working in this repo

- Read `docs/PLAN.md` before any architecture-level decision.
- Endpoints follow `docs/api-spec.yaml` (OpenAPI). Do not invent endpoints — extend the spec first.
- Every public service method in `apps/api` gets a unit test; repositories are tested with
  Testcontainers against real Postgres.
- Conventional Commits: `feat:`, `fix:`, `chore:`. Small PRs, one approval.
- Big decisions get a short ADR in `docs/adr/`.
- App-specific rules apply when working inside that app:
  - `apps/web/AGENTS.md` — Astro / React islands / Tailwind / shadcn
  - `apps/api/AGENTS.md` — Spring Boot / JPA / Flyway / testing

## Project status

Phase 0 — Foundations. Roadmap and phase gates: `docs/PLAN.md` §3.
