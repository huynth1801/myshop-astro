# Review Queue

Commits pending review. Auto-managed:
- post-commit hook → adds new commits
- `/review` after audit → removes reviewed commits
- `/review mark-reviewed` → removes in bulk

- 9143aaa (2026-10-08) chore: project plan, agent rules, ADR 0001
- 5cfb718 (2026-10-08) feat(api): Spring Boot 4 scaffold, Flyway baseline, catalog endpoints
- 8af170f (2026-10-08) feat(web): Astro storefront with prerendered catalog and typed API client
- 9be0f6d (2026-10-08) feat: catalog API (Spring Boot 4) + Astro storefront + OpenAPI spec
- da2bd00 (2026-10-08) ci: GitHub Actions for api (verify + Postgres service) and web (build against live API)
- 03dc3f2 (2026-10-08) feat(api): guest cart API with cookie token, stock checks and CORS
- fe2d4fd (2026-10-08) feat(web): cart islands - variant picker, add-to-cart, drawer with free-shipping bar
- d7d77df (2026-10-08) docs: mark cart endpoints as implemented in OpenAPI spec
- 9d3979e (2026-10-08) feat(api): JWT auth - register, login, refresh cookie, guest cart adoption
- b941978 (2026-10-08) feat(web): auth island with session restore; docs: mark auth endpoints implemented
- 6b36bb8 (2026-10-08) fix(ci): provide API env vars to web build (repo .env is git-ignored)
- 5b924a0 (2026-10-08) docs: adopt branch-per-feature PR workflow; defer Stripe integration
- 74456eb (2026-10-08) feat(api): VND demo prices (ADR 0003), category endpoints, richer product summaries
- c3eb09e (2026-10-08) feat(web): Modern DTC redesign - glass header, hero, hover-swap cards, quick-add, VND
- 695e84c (2026-10-08) docs: spec marks categories + summary fields; ADR 0003 VND
- ebba012 (2026-10-09) feat(api): coupons - apply/remove on cart, min-order check, PERCENT floor + FIXED clamp
- 7408264 (2026-10-09) feat(web): coupon UI in cart drawer; docs: spec marks coupon endpoints; env split build/browser URLs
