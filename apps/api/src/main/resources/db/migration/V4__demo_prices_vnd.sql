-- V4 — demo catalog switches to VND (ADR 0003).
-- Storage convention unchanged: price_cents holds MINOR UNITS (x100), so
-- 450,000₫ is stored as 45,000,000. Never floats (AGENTS.md).

UPDATE product_variants SET price_cents = 45000000, compare_at_price_cents = 59000000 WHERE sku LIKE 'TEE-CLS-%';
UPDATE product_variants SET price_cents = 119000000 WHERE sku LIKE 'HOOD-HVY-%';
UPDATE product_variants SET price_cents = 35000000  WHERE sku = 'SOCK-MER-3PK';
UPDATE product_variants SET price_cents = 55000000  WHERE sku LIKE 'BELT-WCX-%';
UPDATE product_variants SET price_cents = 29000000, compare_at_price_cents = 39000000 WHERE sku = 'MUG-ENM-350';
UPDATE product_variants SET price_cents = 65000000  WHERE sku = 'CAP-FLD-OS';

-- Keep in-flight demo carts consistent with the new price level (snapshot column)
UPDATE cart_items ci
SET price_at_add_cents = v.price_cents
FROM product_variants v
WHERE ci.variant_id = v.id;
