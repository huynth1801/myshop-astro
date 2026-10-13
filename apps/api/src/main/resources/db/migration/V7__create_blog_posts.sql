-- V7 — blog posts & related products for content marketing & SEO (ADR 0006)

CREATE TABLE posts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    summary           VARCHAR(500) NOT NULL DEFAULT '',
    content           TEXT         NOT NULL DEFAULT '',
    featured_image    VARCHAR(2048),
    author            VARCHAR(100),
    status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    seo_title         VARCHAR(255),
    seo_description   VARCHAR(500),
    view_count        BIGINT       NOT NULL DEFAULT 0,
    published_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_posts_status CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE INDEX idx_posts_status_published ON posts (status, published_at DESC);

CREATE TABLE post_related_products (
    post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, product_id)
);

CREATE INDEX idx_post_related_products_post ON post_related_products (post_id, position);
