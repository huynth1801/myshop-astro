# apps/api — Spring Boot rules

Java 21, Spring Boot 3, PostgreSQL 16, Flyway. These rules apply when working anywhere
under `apps/api/`.

## Structure

- Package-by-feature: `catalog`, `cart`, `order`, `checkout`, `auth`, `common` — each owns its
  controller/service/repository/dto/mapper. No giant shared service package.
- Layering: Controller → Service → Repository. No business logic in controllers; none in
  repositories.
- NEVER return JPA entities from controllers — DTOs only (MapStruct or explicit mappers).

## Hard rules

- Money is `long` cents (or the `Money` value object in `common`). `double`/`float` for money
  in new code = reject.
- Bean Validation on every request DTO (`@NotBlank`, `@Positive`, `@Size`).
- No N+1 queries — use `JOIN FETCH` or `@EntityGraph` for lists with images/variants.
- Global error handling via `@RestControllerAdvice` → Problem Details
  (`application/problem+json`) with `code`, `message`, `traceId`.
- Flyway only for schema changes; `ddl-auto=validate` in every environment. Migrations are
  forward-only and backward-compatible (add columns; no immediate rename/drop).
- Checkout endpoints accept an `Idempotency-Key` header; duplicate submissions must never
  create duplicate orders.
- Stateless API (JWT): access token 15 min; refresh token in httpOnly, Secure, SameSite=Lax
  cookie. Argon2/bcrypt password hashing.
- Order status transitions are driven by signature-verified Stripe webhooks, never by the
  browser redirect.
- Order totals are recalculated server-side from the DB at checkout — client numbers are
  display-only.

## API design

- REST, versioned: `/api/v1/...`, plural nouns, kebab-case JSON fields.
- Status codes: 200/201/204 · 400 validation · 401 · 403 · 404 · 409 conflict (out of stock) ·
  422 business rule · 500 with traceId.
- Pagination: `?page=0&size=20&sort=price,asc` → `{ "content": [...], "page": 0, "totalElements": 342 }`.
- Contract-first: implement `docs/api-spec.yaml`; do not invent endpoints.
- CORS locked to the storefront origin. Rate-limit `/auth/*` and `/checkout` (Bucket4j).

## Testing

- Every public service method has a unit test.
- Repositories and JPA queries are tested with Testcontainers against real Postgres
  (requires Docker locally).
- CI: Spotless + tests must pass; the build must succeed.
