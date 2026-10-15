-- V12: defense-in-depth — every money/quantity column gets a non-negative CHECK.
-- Bean Validation (@PositiveOrZero / @Min) guards the HTTP boundary and checkout
-- recalculates all totals server-side; these constraints guarantee no other code
-- path (seed, backfill, a future bug) can persist a negative amount.
-- All existing rows already satisfy every constraint below (V1/V5 seeds and
-- server-computed orders are non-negative), so this is backward-compatible.

-- compare_at_price_cents was missed in V1 (price_cents has chk_variant_price).
ALTER TABLE product_variants
    ADD CONSTRAINT chk_variant_compare_price CHECK (compare_at_price_cents >= 0);

ALTER TABLE cart_items
    ADD CONSTRAINT chk_cart_price CHECK (price_at_add_cents >= 0);

ALTER TABLE order_items
    ADD CONSTRAINT chk_order_unit_price CHECK (unit_price_cents >= 0);

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_money CHECK (
        subtotal_cents >= 0
        AND discount_cents >= 0
        AND shipping_cents >= 0
        AND total_cents >= 0
    );

-- A PERCENT coupon above 100 or a non-positive value would be nonsense; the
-- service clamps percent at 100, the DB now refuses to store it at all.
ALTER TABLE coupons
    ADD CONSTRAINT chk_coupon_value CHECK (value >= 1 AND min_order_cents >= 0);

ALTER TABLE coupons
    ADD CONSTRAINT chk_coupon_percent_cap CHECK (type <> 'PERCENT' OR value <= 100);

ALTER TABLE posts
    ADD CONSTRAINT chk_posts_view_count CHECK (view_count >= 0);
