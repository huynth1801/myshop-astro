-- V5 — coupons (Phase 2 §9): cart remembers its applied coupon.
-- Discounts are ALWAYS recalculated server-side from the coupon row at
-- response time (AGENTS.md: never trust client totals).

ALTER TABLE carts ADD COLUMN coupon_id UUID REFERENCES coupons (id);

-- Demo coupons (VND minor units ×100 — ADR 0003):
--   WELCOME10: −10% toàn đơn, không điều kiện
--   GIAM50K:   −50.000₫, đơn tối thiểu 300.000₫
--   TUANLE20:  −20%, đơn tối thiểu 1.000.000₫, hạn 30 ngày
INSERT INTO coupons (id, code, type, value, min_order_cents, expires_at, active) VALUES
  ('55555555-5555-5555-5555-555555555501', 'WELCOME10', 'PERCENT', 10, 0, NULL, true),
  ('55555555-5555-5555-5555-555555555502', 'GIAM50K', 'FIXED', 5000000, 30000000, NULL, true),
  ('55555555-5555-5555-5555-555555555503', 'TUANLE20', 'PERCENT', 20, 100000000, now() + interval '30 days', true)
ON CONFLICT DO NOTHING;
