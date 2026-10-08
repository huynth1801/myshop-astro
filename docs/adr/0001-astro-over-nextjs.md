# ADR 0001 — Astro 5 for the storefront (instead of Next.js)

Date: 2026-10-08 · Status: accepted

## Context

SEO is a primary growth channel; catalog pages need maximal Core Web Vitals with minimal
client JavaScript. A Next.js App Router storefront typically ships ~90–140 KB JS to a catalog
page. We also want to keep shadcn/ui (React) components for the interactive parts, and the
backend is already Java/Spring, unaffected by the frontend choice.

## Decision

Use Astro 5 with React islands:

- Catalog/product/category pages prerendered — static HTML, ~0 KB JS by default.
- Interactivity (add-to-cart, cart drawer, free-shipping bar, checkout) as hydrated React
  islands using shadcn/ui, with the cheapest `client:*` directive that works.
- Tailwind CSS v4 unchanged. Client state via nanostores (not Zustand) so `.astro` scripts
  and multiple islands share one cart store.

## Consequences

- Astro has no built-in tag revalidation (`revalidateTag`): start with Pattern A
  (prerender + rebuild-on-webhook, `docs/PLAN.md` §10); move to Pattern B (SSR + CDN cache +
  HMAC-verified purge) only when price/stock churn demands it.
- Backend, database, API contract, checkout flow, and security plans are unchanged.
- If an app-like experience is needed later (complex admin dashboard, real-time), build it as
  a separate React app — the catalog stays Astro.
