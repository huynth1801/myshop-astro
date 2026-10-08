-- V1 baseline — core schema from docs/PLAN.md §4
-- IDs are UUIDs generated app-side (UUIDv7, com.shop.common.uuid.Ids);
-- gen_random_uuid() is only a defensive default for out-of-band inserts.
-- All money columns are BIGINT cents. Never floats.

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    full_name    VARCHAR(255) NOT NULL,
    line1        VARCHAR(255) NOT NULL,
    line2        VARCHAR(255),
    city         VARCHAR(255) NOT NULL,
    postal_code  VARCHAR(32)  NOT NULL,
    country_code CHAR(2)      NOT NULL,
    is_default   BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON addresses (user_id);

CREATE TABLE categories (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      VARCHAR(255) NOT NULL,
    slug      VARCHAR(255) NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories (id),
    position  INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    description       TEXT         NOT NULL DEFAULT '',
    short_description VARCHAR(200) NOT NULL DEFAULT '',
    status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    category_id       UUID NOT NULL REFERENCES categories (id),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_products_status CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
);
-- products(slug) is covered by the UNIQUE constraint's index (see PLAN.md §4)
CREATE INDEX idx_products_status_category ON products (status, category_id);

CREATE TABLE product_variants (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id             UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sku                    VARCHAR(64) NOT NULL UNIQUE,
    price_cents            BIGINT  NOT NULL,
    compare_at_price_cents BIGINT,
    stock                  INTEGER NOT NULL DEFAULT 0,
    attributes             JSONB   NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT chk_variant_price CHECK (price_cents >= 0),
    CONSTRAINT chk_variant_stock CHECK (stock >= 0)
);
CREATE INDEX idx_product_variants_product ON product_variants (product_id);

CREATE TABLE product_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    url        VARCHAR(1024) NOT NULL,
    alt        VARCHAR(255)  NOT NULL DEFAULT '',
    position   INTEGER       NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images (product_id);

CREATE TABLE carts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_token VARCHAR(64)  NOT NULL UNIQUE,
    user_id    UUID REFERENCES users (id),
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- carts(cart_token) is covered by the UNIQUE constraint's index (see PLAN.md §4)

CREATE TABLE cart_items (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id            UUID NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
    variant_id         UUID NOT NULL REFERENCES product_variants (id),
    qty                INTEGER NOT NULL,
    price_at_add_cents BIGINT  NOT NULL,
    CONSTRAINT chk_cart_qty CHECK (qty > 0)
);
CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);

-- orders/order_items snapshot name, sku, and price at purchase time —
-- never join to live product prices.
CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID REFERENCES users (id),
    status            VARCHAR(30) NOT NULL,
    subtotal_cents    BIGINT NOT NULL,
    discount_cents    BIGINT NOT NULL DEFAULT 0,
    shipping_cents    BIGINT NOT NULL DEFAULT 0,
    total_cents       BIGINT NOT NULL,
    payment_intent_id VARCHAR(255),
    shipping_address  JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_orders_status CHECK (status IN ('PENDING', 'PAID', 'FULFILLED', 'CANCELLED', 'REFUNDED'))
);
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_payment_intent ON orders (payment_intent_id);

CREATE TABLE order_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_name     VARCHAR(255) NOT NULL,
    sku              VARCHAR(64)  NOT NULL,
    unit_price_cents BIGINT       NOT NULL,
    qty              INTEGER      NOT NULL,
    CONSTRAINT chk_order_qty CHECK (qty > 0)
);
CREATE INDEX idx_order_items_order ON order_items (order_id);

CREATE TABLE coupons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(64) NOT NULL UNIQUE,
    type            VARCHAR(20) NOT NULL,
    value           INTEGER     NOT NULL,
    min_order_cents BIGINT      NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    active          BOOLEAN     NOT NULL DEFAULT true,
    CONSTRAINT chk_coupon_type CHECK (type IN ('PERCENT', 'FIXED'))
);

CREATE TABLE related_products (
    product_id         UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    type               VARCHAR(20) NOT NULL,
    PRIMARY KEY (product_id, related_product_id),
    CONSTRAINT chk_related_type CHECK (type IN ('CROSS_SELL', 'UPSELL', 'BUNDLE'))
);
