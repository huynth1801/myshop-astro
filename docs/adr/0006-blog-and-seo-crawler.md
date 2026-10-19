# ADR 0006 — Blog Engine & SEO Article Crawler

Date: 2026-10-13 · Status: accepted

## Context

Phase 3 roadmap focuses on SEO, traffic acquisition, and organic discovery. While product pages capture transactional search queries, e-commerce stores rely heavily on informational queries (style guides, material reviews, how-to articles) to drive top-of-funnel traffic. The store needs:
1. A fast, SEO-optimized blog on the storefront (`/blog`, `/blog/[slug]`).
2. An admin interface to manage blog posts and crawl external articles as drafts to accelerate content curation.
3. Tight conversion integration: articles must easily link to catalog products.

## Decisions

1. **Storage & API Architecture:**
   - Blog posts are stored in PostgreSQL (`posts` and `post_related_products` tables) via Flyway migrations (`V7__create_blog_posts.sql`), managed by the Spring Boot API.
   - Public endpoints: `GET /api/v1/posts` (paginated, tag/searchable) and `GET /api/v1/posts/{slug}` (includes related product summaries).
   - Admin endpoints: `/api/v1/admin/posts/**` protected by `hasRole('ADMIN')`.
   - Contract-first design: documented in `docs/api-spec.yaml` before backend or frontend code.

2. **Crawler Mechanism (Backend Jsoup):**
   - The Spring Boot backend owns the crawling logic via `org.jsoup:jsoup` at `POST /api/v1/admin/posts/crawl`.
   - The crawler takes a `sourceUrl`, extracts metadata (title, meta description, OG image, author), cleans the main article body HTML (removing scripts, styles, iframes, navigation, ads), and creates/returns a `DRAFT` post.
   - **Quality & SEO Guardrail:** All crawled posts default to `DRAFT`. Articles must be edited, formatted, and approved by the store admin before publishing to avoid search engine duplicate-content penalties.

3. **Storefront Rendering (Astro 5):**
   - Public pages `/blog` and `/blog/[slug]` follow the existing static-first rule (`prerender = true`).
   - SEO metadata: canonical URL, OpenGraph tags, semantic HTML.
   - Structured data (JSON-LD): `BlogPosting` schema + `BreadcrumbList` on every article page.
   - In-article product cards: articles render `ProductCard` islands for related products to convert reader traffic into store orders.

## Consequences

- Adds `org.jsoup:jsoup` dependency to `apps/api/pom.xml`.
- Preserves zero-JS storefront baseline while providing dynamic CMS capabilities in the admin portal.
- All public list endpoints remain strictly paginated, matching project standards.
