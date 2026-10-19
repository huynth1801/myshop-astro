# myshop — E-commerce Build Plan & Engineering Standards

**Stack:** Astro 5 storefront · Java 21 / Spring Boot 3 API · PostgreSQL 16 · Stripe Checkout
**Status:** Phase 0 — Foundations (not started)

This document is the source of truth for architecture, roadmap, and standards.
Day-to-day coding rules live in `AGENTS.md` (root + per app). Read this file before any
architecture-level decision.

---

## 1. Architecture Overview

```
Browser ──► Astro (SSR catalog, React islands, Node adapter behind CDN)
                │
                ├── Catalog pages (SSR on demand, ~0 KB JS) ──► Java REST API ──► PostgreSQL
                └── Islands: cart, checkout, auth ──► Java REST API
                              │
                              ├── Redis (cache, rate limits) — Phase 2+
                              ├── Stripe (payments + webhooks)
                              └── S3 / Cloudinary (product images)
```

Core principles:

- Catalog pages render on demand (ADR 0011) so admin edits are live instantly;
  interactivity is added as isolated React islands.
- The Java API is the single source of truth for prices, stock, and orders — never trust the frontend.
- Money is stored as integer cents (`BIGINT`), never floats.
- Stripe Checkout (hosted page) so raw card data never touches our servers — PCI SAQ-A, the lightest compliance level.

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Astro 5 (SSR, ADR 0011) | `output: 'server'`; catalog/blog/admin all on demand |
| Islands / UI | React + shadcn/ui, Tailwind CSS v4 | shadcn CLI officially supports Astro |
| Client state | nanostores (cart UI mirror only) | Cart data lives server-side, keyed by cookie |
| Forms | react-hook-form + Zod | Zod validates every API response at the boundary |
| Backend | Java 21, Spring Boot 4.x (see ADR 0002) | Spring WebMVC, Data JPA, Security, Validation, Flyway |
| Database | PostgreSQL 16 | Flyway migrations; `ddl-auto=validate` in every env |
| Auth | JWT access token + httpOnly refresh cookie | Argon2/bcrypt password hashing |
| Payments | Stripe Checkout + Webhooks | order state driven by webhooks, not redirects |
| Testing | JUnit 5 + Testcontainers (API); Playwright (E2E) | E2E money-path suite is sacred |
| Infra | Docker (Astro Node adapter + Spring API) on Railway/Fly.io/AWS | GitHub Actions CI/CD |
| Monitoring | Sentry (both apps), Plausible/PostHog | |

## 3. Roadmap (~9 weeks, 1–2 devs)

| Phase | Weeks | Deliverables |
|---|---|---|
| 0 — Foundations | 1 | Repo + git, CI (lint/typecheck/test gates), design tokens, API contract (OpenAPI), Flyway baseline, envs (dev/staging/prod) |
| 1 — MVP Commerce | 2–4 | Catalog (list/detail/category/search), cart (guest + logged-in via cookie token), checkout + Stripe, order confirmation email, auth |
| 2 — Upsell Engine | 5–6 | Free-shipping bar, cross-sells, bundles, coupons, related products, admin CRUD |
| 3 — SEO & Performance | 7 | Structured data, sitemap, metadata, CWV audit, Lighthouse ≥ 90 |
| 4 — Harden & Launch | 8–9 | E2E tests, security checklist, load test checkout, monitoring, go-live |

**Gate rule:** do not start Phase 2 until checkout works end-to-end in staging with real
Stripe test-mode keys.

**Status notes:**
- 2026-10-08 — **Stripe integration deferred** by owner decision. The Phase 1→2 gate
  ("checkout E2E in Stripe test mode") is postponed until Stripe resumes; until then
  Phase 2 work (coupons, related products, admin CRUD) may proceed — none of it depends
  on payments. Revisit before launch: the Launch Checklist §15 still requires it.
- 2026-10-08 — **Git workflow adopted:** feature branch → PR → CI green (`api / verify`,
  `web / build`) → squash-merge. See `AGENTS.md`.
- 2026-10-10 — **Google sign-in added** (ADR 0004): OAuth authorization-code on top
  of the existing JWT session; `users.password_hash` now nullable (V13
  `user_identities` — renumbered from the branch's V7 during merge; V7 was taken
  by blog posts). Requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` — the
  app boots with them unset (Google button then reports not-configured).
- 2026-10-11 — **Admin CRUD API** (Phase 2): `/api/v1/admin/**` behind `hasRole(ADMIN)` —
  paged any-status product list, product create/update (slug immutable), variant
  add + price/stock update, category create. Spec in `docs/api-spec.yaml` (Admin tag).
  Admin UI (web) is the follow-up PR. Promote an admin locally with
  `update users set role='ADMIN' where email='…';`.
- 2026-10-13 — **Checkout with COD & VietQR + Admin Orders:** ADR 0008 implemented with
  dynamic VietQR generation, human-friendly order codes (`MS-XXXX`), full server-side
  recalculation, and admin order lifecycle management (`/admin/orders`).
- 2026-10-14 — **Automated Bank Transfer Webhook planned (SePay.vn / Casso.vn):** While manual
  bank transfer verification via Admin Orders (`/admin/orders`) is currently operational,
  an automated webhook handler (`POST /api/v1/webhooks/sepay`) is planned for future implementation
  to listen for real-time bank notifications, match order codes in transfer descriptions
  (`THANH TOAN MS-XXXX`), and transition orders to `CONFIRMED` without manual admin intervention.
- 2026-10-14 — **Revenue Analytics & Reporting planned (Daily & Monthly):** Currently, the admin
  dashboard displays lifetime aggregate revenue (`SUM(total_cents - shipping_cents)` for non-cancelled
  orders). Planned for future release: daily and monthly aggregated revenue reports, date-range
  filtering, and visual charts for the admin dashboard.
- 2026-10-14 — **Product View Tracking (Hướng 1 - First-Party Counter) planned:**
  Track product clicks / detail views to measure customer interest and show metrics directly on Admin:
  - **Database:** Flyway migration adding `views_count BIGINT NOT NULL DEFAULT 0` column to `products` table and an index on `products(views_count DESC)`.
  - **API Backend:** Lightweight endpoint `POST /api/v1/products/{slug}/view` (unauthenticated, atomic `UPDATE products SET views_count = views_count + 1 WHERE slug = :slug`).
  - **Storefront (PDP):** Non-blocking beacon request via `navigator.sendBeacon('/api/v1/products/' + slug + '/view')` (or `fetch(..., { keepalive: true })`) on product page load, with client-side 30-minute debounce (`localStorage` key `viewed_${slug}`) to avoid counting repeated F5 refreshes as duplicate views.
  - **Admin UI:** Add "Lượt xem" (Views) column in the Admin Products table (`/admin/products`) with ability to sort by popularity.
- 2026-10-14 — **Telegram-Powered Customer Live Chat (ADR 0009):** In-house storefront chat widget
  interfaced with Telegram Bot API. Customers chat on web; inquiries forward to shop owner's Telegram
  with customer info and PDP link; shop owner replies directly in Telegram; replies sync back to web widget.
- 2026-10-15 — **Custom Domain SEO & Google Indexing Checklist planned (Post-Domain Purchase):**
  Quy trình cấu hình kỹ thuật và khai báo Google Search Console để website và sản phẩm hiển thị trên Google Search:
  1. **Domain & Biến môi trường:** Sau khi gắn Custom Domain (vd: `thuyshop.vn`) trên Cloudflare, cập nhật biến `SITE_URL=https://thuyshop.vn` trong `wrangler.jsonc` & Cloudflare Dashboard để `<link rel="canonical">`, Open Graph và `sitemap.xml` tự động sinh đúng URL chính thức (tránh bị Google de-index do trỏ về domain ảo/placeholder).
  2. **robots.txt:** Bổ sung `Sitemap: https://thuyshop.vn/sitemap.xml` vào `apps/web/public/robots.txt` để crawler tự tìm thấy danh mục và sản phẩm.
  3. **Google Search Console (GSC):** Xác minh quyền sở hữu domain (bằng bản ghi DNS TXT trong Cloudflare DNS).
  4. **Khai báo Sitemap:** Submit `sitemap.xml` trong GSC để Googlebot lập lịch cào toàn bộ catalog.
  5. **URL Inspection (Index cấp tốc):** Dùng tính năng Kiểm tra URL để gửi yêu cầu lập chỉ mục ("Request Indexing") cho các sản phẩm chủ lực (index trong 24h - 48h).
  6. **Tối ưu Content/Title:** Tránh sao chép 100% tiêu đề sàn TMĐT (Shopee/TikTok); bổ sung nhận diện thương hiệu `| Thuy Shop` và mô tả độc nhất.

## 4. Data Model (core tables)

```sql
users(id, email, password_hash, name, role, created_at)
addresses(id, user_id, ...)

categories(id, name, slug, parent_id)
products(id, name, slug, description, status, category_id, created_at)
product_variants(id, product_id, sku, price_cents, compare_at_price_cents, stock, attributes jsonb)
product_images(id, product_id, url, alt, position)

carts(id, cart_token, user_id?, expires_at)
cart_items(id, cart_id, variant_id, qty, price_at_add_cents)

orders(id, user_id?, status, subtotal_cents, discount_cents, shipping_cents, total_cents,
       payment_intent_id, shipping_address jsonb, created_at)   -- snapshot prices, never join to live price
order_items(id, order_id, product_name, sku, unit_price_cents, qty)

coupons(id, code, type, value, min_order_cents, expires_at, active)
related_products(product_id, related_product_id, type)  -- type: CROSS_SELL | UPSELL | BUNDLE
```

Data rules:

- UUID primary keys (v7 preferred — sortable).
- `orders` / `order_items` snapshot name, sku, and price at purchase time.
- Indexes: `products(slug)`, `products(status, category_id)`, `order_items(order_id)`, `carts(cart_token)`.
- Every query is paginated — no unbounded queries, ever.
- Migrations are forward-only and backward-compatible (add columns; don't rename/drop immediately).

## 5. Repository Layout (monorepo)

```
shop/
├── apps/
│   ├── web/                          # Astro storefront
│   │   ├── astro.config.mjs
│   │   ├── public/
│   │   │   └── robots.txt
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro
│   │   │   │   ├── products/[slug].astro
│   │   │   │   ├── categories/[slug].astro
│   │   │   │   ├── cart.astro                # prerender = false
│   │   │   │   ├── checkout.astro            # prerender = false
│   │   │   │   └── api/
│   │   │   │       └── webhooks/revalidate.ts # webhook from Java API (Pattern A/B)
│   │   │   ├── layouts/
│   │   │   │   ├── Base.astro
│   │   │   │   └── BaseHead.astro             # title/description/canonical/OG
│   │   │   ├── components/
│   │   │   │   ├── astro/                     # static components, 0 KB JS
│   │   │   │   │   ├── ProductCard.astro
│   │   │   │   │   ├── ProductGallery.astro
│   │   │   │   │   ├── Breadcrumbs.astro
│   │   │   │   │   └── JsonLd.astro
│   │   │   │   ├── react/                     # islands — ONLY interactive parts
│   │   │   │   │   ├── AddToCartButton.tsx
│   │   │   │   │   ├── CartDrawer.tsx
│   │   │   │   │   ├── CartBadge.tsx
│   │   │   │   │   └── FreeShippingBar.tsx
│   │   │   │   └── ui/                        # shadcn-generated, never hand-edited
│   │   │   ├── lib/
│   │   │   │   ├── api/                       # typed client for the Java API
│   │   │   │   ├── stores/cart.ts             # nanostores
│   │   │   │   ├── cache.ts                   # purge logic (Pattern B)
│   │   │   │   └── seo.ts                     # JSON-LD builders
│   │   │   ├── styles/global.css              # Tailwind v4 + shadcn tokens
│   │   │   └── middleware.ts                  # cart cookie + security headers
│   │   └── tsconfig.json                      # strict: true, alias "@/"
│   └── api/                                  # Spring Boot — see apps/api/AGENTS.md
│       └── src/main/java/com/shop/
│           ├── catalog/   (controller, service, repository, dto, mapper)
│           ├── cart/
│           ├── order/
│           ├── checkout/  # Stripe integration
│           ├── auth/
│           ├── common/    # error handling, config, money type
│           └── ShopApplication.java
├── .github/workflows/                       # CI per app
└── docs/                                    # PLAN.md, api-spec.yaml, adr/
```

Base configuration:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://yourbrand.com',          // required for sitemap + canonical
  output: 'server',                       // SSR default, per-page opt-out via prerender
  adapter: node({ mode: 'standalone' }),  // Docker, same infra as the Java API
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },     // Tailwind v4 via Vite plugin
  redirects: {                            // old slug → new slug, keep SEO equity
    '/old-product-slug': '/products/new-slug',
  },
});
```

```json
// tsconfig.json — no forgiveness
{ "compilerOptions": { "strict": true, "paths": { "@/*": ["./src/*"] } } }
```

Rendering model: **SSR (ADR 0011).** Catalog/product/category/blog pages render on
demand (`prerender = false`) — admin edits show up immediately, no rebuild webhook.
Cart/checkout/account are SSR too. `.astro` templates still ship ~0 KB JS.

## 6. Frontend Rules (Astro / shadcn / Tailwind)

1. **Static first.** `.astro` components emit zero JS by default. Every `<script>` tag and
   `client:` directive must justify itself — the reviewer asks "which island needs this?".
2. **React/shadcn only as islands**, each with the cheapest directive that works:

   | Directive | Hydrates when | Use for |
   |---|---|---|
   | `client:load` | immediately | AddToCartButton, CartBadge (above fold) |
   | `client:idle` | when browser is idle | CartDrawer trigger, search box |
   | `client:visible` | scrolled into view | FreeShippingBar, cross-sell carousel |
   | `client:media` | matches media query | mobile menu |
   | `client:only="react"` | skips SSR | window-dependent components (rare) |

3. Category filters are server-rendered links (`<a href="?color=red&sort=price">`), not React
   filters — crawlable, same intent as the Next.js plan.
4. `components/ui/*` is never edited directly — wrap in `components/react/` or `components/astro/`.
5. TypeScript strict; no `any`, no `!` non-null assertions, no `@ts-ignore`. Every Java API
   response is Zod-parsed before use.
6. Data fetching in page frontmatter (top-level `await`, runs on the server). Never fetch in
   an island what the page can fetch and pass as props.
7. Cart state = nanostores in `src/lib/stores/cart.ts` — shared between `.astro` scripts and
   React islands; no Zustand, no cross-island React Context. The store mirrors server state
   and syncs through the Java API.

   ```ts
   // src/lib/stores/cart.ts
   import { atom, computed } from 'nanostores';
   import type { Cart } from '../types';

   export const cart = atom<Cart | null>(null);
   export const cartCount = computed(cart, (c) => c?.itemCount ?? 0);

   export async function addItem(variantId: string, qty: number) {
     const res = await fetch('/api/cart/items', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ variantId, qty }),
     });
     cart.set(await res.json());
   }
   ```

8. Images: `astro:assets` `<Image>` with explicit dimensions and alt text. Only the LCP image
   gets `loading="eager" fetchpriority="high"`; everything else lazy-loads by default.
9. Fonts via npm (`@fontsource-variable/inter`), imported once in `Base.astro` — no `<link>`
   to Google Fonts.
10. Env: only `PUBLIC_*` variables reach the client bundle. Secrets stay server-side.
11. Money/prices come from the API and are display-only in components — the client never
    computes totals.
12. Every component handles loading, empty, and error states — "works with mock data only" is not done.
13. Page example (the canonical pattern):

    ```astro
    ---
    // src/pages/products/[slug].astro
    import { getProduct, getRecommendations } from '../../lib/api';
    import Base from '../../layouts/Base.astro';
    import ProductGallery from '../../components/astro/ProductGallery.astro';
    import AddToCartButton from '../../components/react/AddToCartButton';
    import CrossSellCarousel from '../../components/react/CrossSellCarousel';

    export const prerender = false;               // ADR 0011 — live data, no rebuild webhook

    const { slug } = Astro.params;
    let product;
    try {
      product = await getProduct(slug);           // calls the Java API per request
    } catch {
      return new Response('Sản phẩm không tồn tại', { status: 404 });
    }
    const crossSells = await getRecommendations(product.slug, 'CROSS_SELL');
    ---
    <Base title={product.name} description={product.shortDescription}>
      <ProductGallery images={product.images} />
      <AddToCartButton client:load variantId={product.defaultVariantId} />
      {crossSells.length > 0 && <CrossSellCarousel client:visible items={crossSells} />}
    </Base>
    ```

14. Optional: `<ClientRouter />` in `Base.astro` for view transitions between catalog pages.

## 7. Backend Rules (Java / Spring)

1. Package-by-feature (`catalog`, `order`, `checkout`, …) with controller/service/repository/dto
   inside each — not one giant service package.
2. Layering: Controller → Service → Repository. Controllers contain no business logic;
   repositories contain no business logic.
3. Never return JPA entities from controllers. Always map to DTOs (MapStruct or explicit
   mappers) — prevents lazy-loading leaks and accidental data exposure.
4. Bean Validation on every request DTO (`@NotBlank`, `@Positive`, `@Size`). The frontend's
   Zod validation is a UX layer, not a security layer.
5. Money is `long` cents (or a `Money` value object in `common`). `double`/`float` for money
   is an automatic PR rejection.
6. No N+1 queries: use `JOIN FETCH` or `@EntityGraph` for product lists with images/variants.
   Verify with Testcontainers + query logging in tests.
7. Global exception handling via `@RestControllerAdvice` returning Problem Details
   (`application/problem+json`):

   ```json
   {
     "code": "PRODUCT_NOT_FOUND",
     "message": "No product with slug 'xyz'",
     "traceId": "b7e4…"
   }
   ```

8. Flyway only for schema changes; `ddl-auto=validate` in every environment.
9. Idempotency: checkout endpoints accept an `Idempotency-Key` header; duplicate submissions
   must not create duplicate orders.
10. Stateless API (JWT) so it can scale horizontally behind a load balancer.
11. Every public method on a service has a unit test; repositories tested with Testcontainers
    against real Postgres.

## 8. API Design Rules

- REST, versioned: `/api/v1/products`, plural nouns, camelCase JSON fields (matching the pagination envelope below).
- Status codes: 200/201/204 success · 400 validation · 401 unauthenticated · 403 forbidden ·
  404 missing · 409 conflict (e.g., out of stock) · 422 business rule · 500 with traceId.
- Pagination: `?page=0&size=20&sort=price,asc` → `{ "content": [...], "page": 0, "totalElements": 342 }`.
- CORS locked to the storefront origin. Rate limit `/auth/*` and `/checkout` (Bucket4j).
- Contract-first: the OpenAPI spec lives in `docs/api-spec.yaml`; the backend implements it and
  the frontend's typed client is generated from it. No drift.

## 9. Upselling Features (the revenue layer)

Ranked by ROI-to-effort:

1. **Free-shipping progress bar** in cart — "Add $12 more for free shipping." Highest
   conversion lift, one day of work.
2. **Cross-sell in cart / cart drawer** — "Frequently bought together," 2–3 items, one-click add.
3. **Post-add-to-cart mini-modal** — curated cross-sells after adding an item.
4. **Related products on product page** — curated first (`related_products` table), later
   auto-generated from co-purchases in `order_items`.
5. **Upsell variants** — "Premium version" link on cheaper products (`type = UPSELL`).
6. **Bundles** — small discount for buying 2+ complementary products.
7. **Order confirmation page + post-purchase email** — one-click add-on offer before shipping.

**Rule:** every recommendation surface reads from the API
(`GET /api/v1/products/{slug}/recommendations?type=CROSS_SELL`), so strategy can change without
touching the UI.

## 10. SEO Rules (Astro)

**Metadata** — plain meta tags, no framework magic:

```astro
---
// src/layouts/BaseHead.astro
interface Props { title: string; description: string; canonical: string; ogImage?: string; }
const { title, description, canonical, ogImage } = Astro.props;
---
<title>{title} | YourBrand</title>
<meta name="description" content={description} />
<link rel="canonical" href={new URL(canonical, Astro.site)} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImage} />
<meta name="robots" content="index, follow" />
```

**JSON-LD** via `components/astro/JsonLd.astro` (`<script type="application/ld+json"
set:html={JSON.stringify(schema)} />`) with builders in `lib/seo.ts`: Product + Offer
(name, image, price, priceCurrency, availability) on product pages, BreadcrumbList on all
pages, Organization on the homepage.

**Sitemap & robots:** Dynamic SSR sitemap served at `/sitemap.xml` (ADR 0011, `src/pages/sitemap.xml.ts`)
so on-demand catalog/blog additions appear immediately. `public/robots.txt` blocks non-public routes
(`/cart`, `/checkout`, `/account`, `/admin`, `/api/`) and points crawlers to `Sitemap: https://<domain>/sitemap.xml`.

**Title pattern:** `%s | YourBrand`. Unique meta description per product (from
`shortDescription`, 150–160 chars). One `<h1>` per page; semantic HTML (`<nav>`, `<main>`,
`<article>`); descriptive alt on every product image.

**Out-of-stock pages stay live** (good for SEO) — set `availability: OutOfStock` in the
schema instead of 404ing.

### Render & revalidation — the big difference from Next.js

Astro has no built-in tag revalidation (`revalidateTag`). Two patterns, both achieving
"static speed + fresh data":

**Pattern A — Prerender + rebuild hook (DROPPED, ADR 0011):**
The catalog prerendered at build time and a `PRODUCT_UPDATED` webhook would trigger a
rebuild. The webhook was never built, so admin edits never reached shoppers — catalog
pages are now plain SSR. Kept here for history:
1. The whole catalog prerenders at build time.
2. Java API emits `PRODUCT_UPDATED` → triggers a GitHub Actions `repository_dispatch` →
   rebuild + redeploy (2–3 min).

   ```yaml
   # .github/workflows/rebuild-web.yml
   on:
     repository_dispatch:
       types: [product-updated]
   jobs:
     rebuild:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - run: npm ci && npm run build   # re-fetches the whole catalog from the Java API
   ```

✅ Dead simple, no cache to maintain. ❌ A few minutes of staleness — acceptable for a small
store with infrequent price changes.

**Pattern B — SSR + CDN cache + purge (ISR-equivalent, upgrade path):**
1. Pages SSR with `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
2. Java webhook → Astro endpoint verifies an HMAC signature → purges cache by URL:

   ```ts
   // src/pages/api/webhooks/revalidate.ts
   import type { APIRoute } from 'astro';
   import { createHmac } from 'node:crypto';
   import { purgeCache } from '../../lib/cache';

   export const POST: APIRoute = async ({ request }) => {
     const raw = await request.text();
     const expected = createHmac('sha256', import.meta.env.REVALIDATE_SECRET)
       .update(raw).digest('hex');
     if (request.headers.get('x-signature') !== expected)
       return new Response('Unauthorized', { status: 401 });

     const { type, slug } = JSON.parse(raw);
     if (type === 'PRODUCT_UPDATED' || type === 'PRODUCT_DELETED') {
       await purgeCache([`/products/${slug}`, '/']);
     }
     return new Response(null, { status: 204 });
   };
   ```

`purgeCache` depends on the host (Cloudflare Purge API if Cloudflare fronts the Node adapter;
PURGE request for Nginx/Varnish). Choose the host before writing it.

**Bonus — Server Islands (experimental):** fully static page, price/stock in a
`<Price server:defer>` island → cached HTML, always-fresh price per request.

**Current rule (ADR 0011): catalog is SSR, HTML sent with `Cache-Control: no-cache`.**
Only add Pattern B (CDN cache + purge) when traffic measurements demand it — not before.

**Core Web Vitals targets:** LCP < 2.5s · CLS < 0.1 · INP < 200ms · Lighthouse ≥ 90 on
product pages — with Astro these are usually free because catalog pages ship ~0 KB JS.

### Next.js → Astro translation table

| Concept | Next.js | Astro |
|---|---|---|
| Server data fetch | RSC async component | top-level `await` in frontmatter |
| Static page | `revalidate = 3600` (ISR) | `prerender = false` (SSR, ADR 0011) |
| On-demand revalidate | `revalidateTag()` | webhook → rebuild or CDN purge |
| Client state | Zustand | nanostores |
| Metadata | `generateMetadata()` | `BaseHead.astro` (direct meta tags) |
| Sitemap | `app/sitemap.ts` | `@astrojs/sitemap` |
| Redirects | `next.config.ts` | `astro.config.mjs` → `redirects` |
| Middleware | `middleware.ts` | `src/middleware.ts` |
| Image | `next/image` | `astro:assets` `<Image>` |
| LCP priority | `priority` prop | `loading="eager" fetchpriority="high"` |
| Interactivity | whole tree RSC/Client | selective `client:*` islands |

## 11. Performance & Scaling

Frontend: static catalog + CDN absorbs most traffic by design. Optimize images, defer
below-fold islands (they're already `client:visible`), audit bundles.

Backend, in order:

1. DB indexes + pagination + no N+1 (handles a surprising amount of traffic alone).
2. HikariCP connection pooling (tune `maximumPoolSize` to DB limits).
3. Redis cache for hot reads (product detail, category trees) with TTL — add when Postgres
   CPU passes ~50%.
4. Stateless horizontal scaling behind a load balancer.
5. Read replicas when reporting/analytics queries appear.

**Rule:** don't add Redis, microservices, or Kubernetes before metrics demand it. A
well-indexed monolith scales a small store for years.

## 12. Security & Payments

- Recalculate the entire order server-side at checkout (prices, discounts, shipping). The
  client's numbers are display-only.
- Stripe webhook signature verification; order status transitions driven by webhooks, not the
  browser redirect.
- **VietQR Automated Bank Reconciliation (Planned — SePay.vn / Casso.vn):**
  - Webhook endpoint `POST /api/v1/webhooks/sepay` secured with API token header validation.
  - Regex pattern matching for order code in transfer content: `THANH TOAN (MS-\d{6}-[A-Z0-9]+)`.
  - Amount validation: verify received payment matches order `total_cents / 100`.
  - Idempotency & state progression: transition matching order from `PENDING` to `CONFIRMED` / `PAID`.
  - Customer feedback: Server-Sent Events (SSE) or polling on `/order-success` to update UI immediately upon receipt.
- Argon2/bcrypt passwords; JWT access 15 min + refresh token in httpOnly, Secure,
  SameSite=Lax cookie.
- Security headers via middleware: HSTS, X-Content-Type-Options, CSP, X-Frame-Options: DENY.
- Rate limiting on auth and checkout; input validation on both sides of every boundary.
- Dependabot/renovate enabled; no secrets in git (`.env.example` committed, real `.env` ignored).
- Cookie consent banner if analytics are added (GDPR).

## 13. Workflow & Quality Gates

- Conventional Commits (`feat:`, `fix:`, `chore:`), branches `feat/cart-upsells`, small PRs,
  one approval required.
- CI must pass on every PR: ESLint + Prettier + `tsc --noEmit` (web); Spotless + tests (API);
  both apps must build.
- Husky pre-commit runs lint-staged (web).
- Playwright E2E covering the money path: browse → add to cart → apply coupon → checkout →
  order confirmation. This suite is sacred; it never gets skipped.
- Big decisions recorded as short ADRs in `docs/adr/`.

## 14. Local Development Setup (macOS — this machine)

Checked 2026-10-08: Homebrew ✅ · Node v25 ✅ · git ✅ · **Java ❌ · PostgreSQL ❌ · Docker ❌**

```bash
# 1. Java 21 (Temurin)
brew install --cask temurin@21
java -version          # should print openjdk "21.x"

# 2. PostgreSQL 16 (native Homebrew service)
brew install postgresql@16
brew services start postgresql@16
createdb myshop

# 3. Docker Desktop — needed for Testcontainers (install when Phase 1 integration tests start)
brew install --cask docker   # launch Docker.app once to finish setup
```

Verify Postgres: `psql -d myshop -c 'select version();'`

**Seed demo data (chạy thủ công, mọi máy):**

```bash
./scripts/seed.sh                # db local `myshop`
DATABASE_URL=postgres://u:p@host:5432/db ./scripts/seed.sh
```

Flyway (V1+) chỉ lo schema; dữ liệu demo (6 sản phẩm Shopee thật + coupons +
cross-sell) nằm ở `apps/api/src/main/resources/db/seed/demo-catalog.sql`, idempotent
— chạy lại bao nhiêu lần cũng reset đúng. Bảng `users` không bị đụng. Sau khi seed
nhớ `npm run build` trong `apps/web` để trang tĩnh nhận data mới.

Env handling: each app keeps a committed `.env.example`; real `.env` files are git-ignored
(see root `.gitignore`).

## 15. Launch Checklist

- [ ] Checkout E2E passes in staging with Stripe live keys (test a real $1 product)
- [ ] Stripe webhook verified + retry-safe order fulfillment
- [ ] (Optional) Automated Bank Transfer Webhook (SePay.vn / Casso.vn) for instant VietQR order confirmation
- [ ] (Optional) Product view counter (Hướng 1: first-party `views_count` on products + beacon tracking)
- [ ] (Optional) Daily and monthly revenue reporting & sales charts in Admin dashboard
- [ ] Custom domain DNS & SSL configured on Cloudflare (e.g. `thuyshop.vn`)
- [ ] `SITE_URL` env set in Cloudflare Worker vars (`wrangler.jsonc`) to enable exact canonical URLs & sitemap origin
- [ ] `robots.txt` updated with `Sitemap: https://<domain>/sitemap.xml`
- [ ] Google Search Console: domain ownership verified via Cloudflare DNS TXT record
- [ ] Google Search Console: `sitemap.xml` submitted and crawled
- [ ] Google Search Console: Request Indexing executed for core catalog products via URL Inspection
- [ ] Sitemap, robots, canonical URLs, JSON-LD validated in Google Rich Results Test
- [ ] Lighthouse ≥ 90 on product/category/home
- [ ] Sentry receiving errors from both apps; uptime monitoring on `/api/health` and homepage
- [ ] Load test: 50 concurrent checkouts without errors
- [ ] Backups: Postgres automated daily backups + tested restore
- [ ] Legal pages: terms, privacy, returns policy
