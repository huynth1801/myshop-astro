# ADR 0011 — Catalog pages render on demand (drop prerender + rebuild-webhook)

Date: 2026-10-15 · Status: accepted

## Context

Since ADR 0001 the storefront ran "Pattern A" (`docs/PLAN.md` §10): catalog pages
(`/`, `/products/[slug]`, `/categories/[slug]`) prerendered at build time, freshness
resting on a webhook that rebuilds the site when the API emits `PRODUCT_UPDATED`.
That webhook was never built — no API code, no `repository_dispatch` workflow, no env.

Symptom: the admin edits a product (name, images), the API saves it, the admin UI
(admin pages are SSR) shows the new data — but the storefront keeps serving HTML
snapshots from the last deploy, so shoppers see the old name/images until someone
pushes a commit and Cloudflare Pages rebuilds. `getStaticPaths` also capped the
catalog at the first 100 products: a new product simply had no page at all.

Meanwhile the same problem was already solved for blog posts: `blog/[slug].astro`
is SSR (`prerender = false`) with a 404 handler, because the admin can edit posts.

Two related defects lived in the prerender path:

- `<Image>` from `astro:assets` requires remote hosts to be whitelisted
  (`image.domains`). Admin-uploaded images (`/api/v1/files/…` → absolute API URL,
  ADR 0005) and images added by URL (Shopee links, future S3/Cloudinary) are
  arbitrary hosts — prerender would fail the build, SSR would 500 the page.
- `@astrojs/sitemap` only sees build-time routes; SSR catalog pages would vanish
  from `sitemap.xml`.

## Decision

1. Catalog pages are **server-rendered on demand** (`prerender = false`): homepage,
   product detail, category listing. Unknown slugs return 404 instead of throwing.
   Product/category/blog data now always comes live from the API per request.
2. Middleware sets `Cache-Control: no-cache` on HTML responses so no browser cache
  re-creates the staleness one layer up.
3. Product images render as plain `<img>` (explicit width/height, lazy loading).
   Sources are opaque strings (ADR 0005): API-served uploads are already
   immutable-cached by the API; external URLs can't be whitelisted per-host, so
   build-time optimization is traded for "any source works".
4. `/sitemap.xml` is a live SSR endpoint fed by the products/categories/posts APIs
   (paginated, capped) replacing `@astrojs/sitemap`.

Pattern A's build-fail guards ("API returned 0 products — failing the build") are
gone with the build itself; an empty/broken catalog is now caught by the E2E money
path (AGENTS.md #8), which is the check that actually gates deploys.

## Consequences

- Admin edits (name, images, price, stock, new products) appear on the storefront
  immediately — no rebuild, no webhook infra to build and maintain.
- Every catalog request hits the Java API; on Cloudflare that's one subrequest to
  the VPS. Acceptable at current scale; the upgrade path is CDN caching with
  HMAC-verified purge on save (old "Pattern B", now the only remaining pattern)
  — do not add it without measuring.
- Catalog HTML is no longer static; LCP relies on the API being fast (same VPS /
  same region today). `.astro` templates still ship ~0 KB JS.
- Deploy-time coupling is inverted: the web no longer needs the API up at build
  time (`astro build` no longer fetches the catalog at all).

Supersedes: ADR 0001's "catalog pages prerendered" clause and `docs/PLAN.md` §10
"start with Pattern A". ADR 0005 unchanged (uploads still live on the API).
