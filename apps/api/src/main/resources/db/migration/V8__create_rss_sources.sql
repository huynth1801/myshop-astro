-- V8 — RSS feed sources & post source tracking for automated topic crawling (ADR 0007)

ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_url VARCHAR(2048);
CREATE INDEX IF NOT EXISTS idx_posts_source_url ON posts (source_url);

CREATE TABLE rss_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    url             VARCHAR(2048) NOT NULL UNIQUE,
    category        VARCHAR(100),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_fetched_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rss_sources_active ON rss_sources (is_active);

INSERT INTO rss_sources (name, url, category, is_active) VALUES
    ('VnExpress — Thời trang & Làm đẹp', 'https://vnexpress.net/rss/thoi-trang.rss', 'Thời trang', true),
    ('VnExpress — Sức khỏe & Đời sống', 'https://vnexpress.net/rss/suc-khoe.rss', 'Sức khỏe', true),
    ('Kenh14 — Star & Fashion', 'https://kenh14.vn/fashion.rss', 'Xu hướng', true)
ON CONFLICT (url) DO NOTHING;
