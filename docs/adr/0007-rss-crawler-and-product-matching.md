# ADR 0007 — Automated RSS Crawler & Product-Keyword Matching

Date: 2026-10-13 · Status: accepted

## Context

In addition to manual single-URL article crawling (ADR 0006), the store needs an automated pipeline to discover relevant articles from lifestyle, fashion, and wellness sources, match them to existing catalog products, and ingest them as draft articles to build top-of-funnel SEO traffic.

Key challenges:
1. **Search Engine Duplicate-Content Penalty:** Directly copying and auto-publishing full articles harms domain SEO authority.
2. **Relevance:** The store should only ingest articles that relate to its active product catalog (e.g., underwear, shapewear, sun-protection, activewear).
3. **Admin Control:** Store administrators need full visibility over RSS feeds, the ability to trigger scans on-demand or per-source, and all newly ingested articles must remain in `DRAFT` status until reviewed.

## Decisions

1. **Database Schema:**
   - Create `rss_sources` table via Flyway migration `V8__create_rss_sources.sql` storing feed metadata (`name`, `url`, `category`, `is_active`, `last_fetched_at`).
   - Add `source_url` with an index on `posts` table to track original origin and prevent duplicate crawls.

2. **Feed Parsing & Keyword Matching:**
   - Spring Boot backend parses standard RSS 2.0 and Atom feeds using Jsoup's XML parser (`Parser.xmlParser()`).
   - The matching engine computes relevance scores between RSS item titles/summaries and active product titles and categories.
   - When a match is found, the backend invokes `PostCrawlerService` to fetch and sanitize the full article content.
   - The new post is persisted as a `DRAFT` with `source_url` set and associated `related_products` linked automatically.

3. **API Contract & Permissions:**
   - Endpoints specified in `docs/api-spec.yaml`:
     - `GET /api/v1/admin/rss-sources` (paginated)
     - `POST /api/v1/admin/rss-sources`
     - `DELETE /api/v1/admin/rss-sources/{id}`
     - `POST /api/v1/admin/rss-sources/scan-all`
     - `POST /api/v1/admin/rss-sources/{id}/scan`
   - All management and trigger endpoints are protected with `hasRole('ADMIN')`.

4. **Admin UI Experience:**
   - Admin Blog dashboard provides a dedicated RSS management view allowing admins to configure feeds, run scans with real-time feedback, and immediately review generated drafts.

## Consequences

- Automated discovery saves significant manual curation time while enforcing human-in-the-loop review before publication.
- Zero extra external heavy libraries required; leverages existing Jsoup XML capabilities.
- Maintains strict adherence to pagination rules and non-negotiables.
