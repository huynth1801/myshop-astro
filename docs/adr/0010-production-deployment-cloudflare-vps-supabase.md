# ADR 0010: Production Deployment Architecture (Cloudflare Pages + VPS + Supabase)

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
- **Cost-effective, highly reliable hosting:**
  - Frontend on **Cloudflare Pages** (100% Free global CDN, automatic PR Preview Deployments).
  - Database on **Supabase PostgreSQL 16** (100% Free managed PostgreSQL in Region Singapore with automated daily backups).
  - Backend API on **VPS (Cloudfly / Ubuntu Linux 1-2GB RAM)** running Docker container.
- **Automated Deployments:**
  - Pull Requests (PRs) from any feature branch into `main` automatically deploy an isolated **Preview Environment** on Cloudflare Pages (`https://<branch>.thuyshop.pages.dev`).
  - Merges into `main` automatically deploy to the **Production Environment** (Cloudflare Pages for Web + GitHub Actions SSH for VPS Backend).

---

## Architecture

```
[Khách hàng truy cập]
         │
         ▼
[Cloudflare Pages] (100% Free CDN & WAF)
 ├── Tự động tạo Preview URL khi MỞ PR (vd: https://feat-chat.thuyshop.pages.dev)
 ├── Tự động deploy Production khi MERGE VÀO MAIN (vd: https://thuyshop.pages.dev)
 └── Chạy hybrid SSR + Static qua adapter @astrojs/cloudflare
         │
         ▼ HTTPS REST / JSON
[VPS Backend (Cloudfly)] (~40k - 80k/tháng)
 └── Docker Container: Java 21 / Spring Boot 4 Monolith (gói 1-2GB RAM)
         │
         ▼ JDBC SSL Pooler (Port 5432 / 6543)
[Supabase PostgreSQL 16] (100% Free - Region Singapore)
 └── Managed PostgreSQL with Flyway Migrations, Daily Backups & Table Editor
```

---

## Decision Drivers & Choices

1. **Frontend on Cloudflare Pages:**
   - **Cost:** $0/month.
   - **Performance:** Unlimited bandwidth, HTTP/3, Brotli, edge caching at 300+ PoPs worldwide.
   - **PR Automation:** Native GitHub integration. Opening a PR from any branch creates a Preview Deployment automatically and posts the URL directly to the PR discussion.
   - **SSR Support:** `@astrojs/cloudflare` adapter handles dynamic routes (`/checkout`, `/orders`, `/admin`) via Cloudflare Workers without server management.

2. **Backend on VPS (Cloudfly / Linux 1-2GB RAM):**
   - **Cost:** ~40.000đ – 80.000đ / tháng (fixed, predictable cost).
   - **Performance:** Local datacenter in Vietnam (Hanoi / HCMC) with sub-10ms latency.
   - **Containerization:** Multi-stage `Dockerfile` (`eclipse-temurin:21-jdk` -> `eclipse-temurin:21-jre`) with memory limits (`limits: memory: 650M`, `JAVA_OPTS=-Xms256m -Xmx450m`).
   - **Auto-Deploy:** GitHub Actions builds the image on GitHub runners (fast build, 0% RAM usage on VPS) and deploys to VPS via SSH `docker compose -f docker-compose.prod.yml pull && up -d`.

3. **Database on Supabase:**
   - **Cost:** $0/month (Free Tier with 500 MB storage).
   - **Compatibility:** Native PostgreSQL 16 compatible with Flyway, Testcontainers, and Hibernate 7.
   - **Reliability:** Automated backups on AWS Singapore (`ap-southeast-1`), relieves the VPS from DB memory/CPU overhead.

4. **Cross-Origin Security & Cookies:**
   - `shop.cors.allowed-origins` configured with `setAllowedOriginPatterns` to support wildcard preview subdomains (`https://*.pages.dev`) alongside production and localhost.
   - `shop.cookie.same-site: ${COOKIE_SAME_SITE:Lax}` and `shop.cookie.secure: ${COOKIE_SECURE:false}` made configurable to support `SameSite=None; Secure` when frontend (`pages.dev`) and backend reside on different domains.
