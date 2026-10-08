# apps/web — Astro storefront rules

Astro 5, React islands (shadcn/ui), Tailwind v4, TypeScript strict, nanostores.
These rules apply when working anywhere under `apps/web/`.

## Static first

- `.astro` components emit zero JS. Every `<script>` and `client:` directive must justify
  itself — "which island needs this?"
- Fetch data in page frontmatter (top-level `await`, runs on the server). Never fetch inside
  an island what the page can fetch and pass as props.
- `export const prerender = true` (+ `getStaticPaths`) on catalog/product/category pages;
  `getStaticPaths` throws if the API returns zero products (fail the build).
- `cart`, `checkout`, `account` pages stay SSR (`prerender = false`).

## Islands (React)

- Use the cheapest directive that works:
  `client:load` (above fold: AddToCartButton, CartBadge) ·
  `client:idle` (drawer trigger, search box) ·
  `client:visible` (below fold: FreeShippingBar, cross-sell carousel) ·
  `client:media` (mobile menu).
- `components/ui/*` is shadcn-generated — NEVER edit by hand. Wrap or extend it in
  `components/react/` or `components/astro/`.
- Shared client state (cart) = nanostores in `src/lib/stores/`. No Zustand, no cross-island
  React Context.
- Islands never compute prices or totals — display exactly what the API returned.

## Code

- TypeScript `strict: true`. No `any`, no `!` non-null assertions, no `@ts-ignore`.
- Every Java API response is Zod-parsed before use (`lib/api/`).
- One component per file, PascalCase, ≤ 200 lines, no business logic inside — extract to `lib/`.
- Images: `astro:assets` `<Image>` with explicit dimensions + alt text. Only the LCP image
  gets `loading="eager" fetchpriority="high"`; everything else lazy.
- Fonts: `@fontsource-variable/*` imports — no `<link>` to Google Fonts.
- Tailwind: theme tokens only (`bg-primary`, `text-muted-foreground`) — no inline hex colors,
  no `!important`.
- Env: only `PUBLIC_*` variables reach the client. Secrets stay server-side.
- Every component handles loading, empty, and error states — "works with mock data only" is not done.
- Slug URLs are the contract (`/products/[slug]`, `/categories/[slug]`) and stable forever;
  slug changes require a redirect in `astro.config.mjs`.
- Category filters are server-rendered links (`<a href="?color=red&sort=price">`), not
  client-only React filters.

## SEO

- Every page renders through `layouts/BaseHead.astro` (title, description, canonical, OG).
- JSON-LD via `components/astro/JsonLd.astro` + builders in `lib/seo.ts`: Product + Offer on
  product pages, BreadcrumbList everywhere, Organization on the homepage.
- Out-of-stock products keep their page — flip `availability` in JSON-LD, never 404.
- Targets: LCP < 2.5s · CLS < 0.1 · INP < 200ms · Lighthouse ≥ 90.

## Revalidation

Current strategy: Pattern A (prerender + rebuild webhook). Do not introduce CDN-purge
(Pattern B) without an ADR — see `docs/PLAN.md` §10.
