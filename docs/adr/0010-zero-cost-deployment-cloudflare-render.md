# ADR 0010: Zero-Cost Deployment Architecture (Cloudflare Pages + Render + Supabase)

- **Status:** Accepted
- **Date:** 2026-10-14
- **Deciders:** Engineering Team, Product Owner

---

## Context

The application is composed of:
1. **Frontend (`apps/web`):** Astro 5 storefront with hybrid static prerendering (catalog) and React islands (cart, checkout, orders, admin, live chat).
2. **Backend (`apps/api`):** Java 21 / Spring Boot 4 REST API with Flyway migrations.
3. **Database:** PostgreSQL 16.

The project requires:
- **100% Free Hosting** for both Frontend and Backend during early growth.
- **Global Edge Delivery & DDOS Protection via Cloudflare**.
- **Automated Deployments:**
  - Pull Requests (PRs) from any feature branch into `main` automatically deploy an isolated **Preview Environment** with a unique URL (`https://<branch>.thuyshop.pages.dev`).
  - Merges into `main` automatically deploy to the **Production Environment**.

---

## Architecture

```
[Customer Browser]
       │
       ▼
[Cloudflare Pages] (100% Free)
 ├── Static Assets & Prerendered Catalog (Global Edge CDN Cache)
 ├── Server-Side Rendering (Cloudflare Worker via @astrojs/cloudflare)
 └── Automatic PR Preview Deployments & Git Integration
       │
       ▼ HTTPS REST / JSON (Credentials included)
[Render.com Free Web Service] (100% Free)
 └── Dockerized Java 21 / Spring Boot 4 Monolith
       │
       ▼ JDBC with SSL
[Supabase / Neon Free PostgreSQL 16] (100% Free)
 └── Managed PostgreSQL with Flyway Migrations & Automated Backups
```

---

## Decision Drivers & Choices

1. **Frontend on Cloudflare Pages:**
   - **Cost:** $0/month.
   - **Performance:** Unlimited bandwidth, HTTP/3, Brotli, edge caching at 300+ PoPs worldwide.
   - **PR Automation:** Native GitHub integration. Opening a PR from any branch creates a Preview Deployment automatically and posts the URL directly to the PR discussion.
   - **SSR Support:** `@astrojs/cloudflare` adapter handles dynamic routes (`/checkout`, `/orders`, `/admin`) via Cloudflare Workers without server management.

2. **Backend on Render.com:**
   - **Cost:** $0/month (Free Web Service tier).
   - **Containerization:** Multi-stage `Dockerfile` (`eclipse-temurin:21-jdk` -> `eclipse-temurin:21-jre`) ensures identical runtime across environments.
   - **Auto-Deploy:** Automatic zero-downtime deployment when `main` is updated.

3. **Database on Supabase:**
   - **Cost:** $0/month (Free Tier with 500 MB storage).
   - **Compatibility:** Native PostgreSQL 16 compatible with Flyway, Testcontainers, and Hibernate 7.

4. **Cross-Origin Security & Cookies:**
   - `shop.cors.allowed-origins` configured with `setAllowedOriginPatterns` to support wildcard preview subdomains (`https://*.pages.dev`) alongside production and localhost.
   - `shop.cookie.same-site` and `shop.cookie.secure` made configurable to support `SameSite=None; Secure` when frontend (`pages.dev`) and backend (`onrender.com`) reside on different eTLDs.

---

## Consequences

- **Cold Starts:** Render's free tier spins down instances after 15 minutes of inactivity (initial request takes ~30–45s). For a production store, can be kept warm using free uptime pingers (e.g. UptimeRobot) or upgraded to Starter ($7/mo) when revenue justifies it.
- **Preview Deployments:** Astro build on Cloudflare Pages accesses `PUBLIC_API_URL` to prerender products. The staging/production API serves as the catalog source for builds.
