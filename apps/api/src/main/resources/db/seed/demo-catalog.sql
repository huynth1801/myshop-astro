-- Demo catalog seed — chạy bằng ./scripts/seed.sh (KHÔNG phải Flyway migration).
-- Flyway (V1–V6) chỉ lo schema + seed lịch sử; file này là nguồn dữ liệu demo
-- "thật" (ảnh Shopee) reset được vô hạn lần trên mọi máy.
-- Idempotent: TRUNCATE rồi INSERT lại. Bảng users được GIỮ NGUYÊN (tài khoản thật).

BEGIN;

TRUNCATE cart_items, carts, related_products, product_images, product_variants,
         products, categories, coupons RESTART IDENTITY CASCADE;

-- ============ categories ============
INSERT INTO categories (id, name, slug, position) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Đồ mặc',    'apparel',    0),
  ('11111111-1111-1111-1111-111111111102', 'Phụ kiện', 'accessories', 1);

-- ============ products (giá = minor units ×100 — ADR 0003 VND) ============
INSERT INTO products (id, name, slug, description, short_description, status, category_id, created_at) VALUES
  ('66666666-6666-6666-6666-666666666601', 'Áo khoác thể thao zip', 'ao-khoac-the-thao',
   'Áo khoác zip form slim, vải thun lạnh co giãn 4 chiều, mũ 3 lỗ và lỗ ngón tay cố định. Che nắng, thoát nhiệt — chạy bộ, gym hay đi phố đều gọn.',
   'Áo khoác zip thun lạnh co giãn, form slim, mũ 3 lỗ — chạy bộ và gym.',
   'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '9 days'),
  ('66666666-6666-6666-6666-666666666602', 'Áo thể thao Hanabi', 'ao-the-thao-hanabi',
   'Áo thể thao cổ tròn chất liệu thun lạnh, thấm hút mồ hôi nhanh, form regular đứng form. Bảng màu hanabi trẻ trung, giặt máy thoải mái.',
   'Áo thể thao thun lạnh thấm mồ hôi, form đứng, nhiều màu hanabi.',
   'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '7 days'),
  ('66666666-6666-6666-6666-666666666603', 'Áo croptop thể thao', 'ao-croptop-the-thao',
   'Croptop thể thao ôm nhẹ, viền ngực lưới thoáng khí, chất co giãn thoáng khí. Tập luyện hay mix đồ phố đều cân.',
   'Croptop gym ôm nhẹ, co giãn thoáng khí, viền lưới thoáng khí.',
   'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '6 days'),
  ('66666666-6666-6666-6666-666666666604', 'Set 5 đôi tất Hanabi', 'set-tat-hanabi-5-doi',
   'Set 5 đôi tất cổ ngắn chất liệu Việt Nam dệt, co giãn ôm chân, đế êm thấm hút. Size 39–43, giặt máy không bai dão.',
   'Set 5 đôi tất cổ ngắn êm chân, co giãn tốt, size 39–43.',
   'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '4 days'),
  ('66666666-6666-6666-6666-666666666605', 'Khẩu trang chống nắng UV UPF50', 'khau-trang-chong-nang-uv',
   'Khẩu trang dài chống nắng chuẩn UPF50, phủ cổ và tai, vải mát không bí. Có van lọc khí, giặt lại dùng nhiều lần.',
   'Khẩu trang chống nắng UPF50 phủ cổ tai, mát không bí, tái sử dụng.',
   'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '3 days'),
  ('66666666-6666-6666-6666-666666666606', 'Dép da xỏ ngón', 'dep-da-xo-ngon',
   'Dép xỏ ngón đế da memory foam êm chân, quai da mềm không cấn, đế chống trượt. Đi trong nhà lẫn ra phố đều tiện.',
   'Dép xỏ ngón đế memory foam, quai da mềm, chống trượt.',
   'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '1 day');

-- ============ variants ============
INSERT INTO product_variants (id, product_id, sku, price_cents, compare_at_price_cents, stock, attributes) VALUES
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666601', 'AKT-M', 35000000, 45000000, 25, '{"size": "M"}'),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666601', 'AKT-L', 35000000, 45000000, 18, '{"size": "L"}'),
  ('77777777-7777-7777-7777-777777777711', '66666666-6666-6666-6666-666666666602', 'HNB-S', 25000000, NULL, 30, '{"size": "S"}'),
  ('77777777-7777-7777-7777-777777777712', '66666666-6666-6666-6666-666666666602', 'HNB-M', 25000000, NULL, 26, '{"size": "M"}'),
  ('77777777-7777-7777-7777-777777777713', '66666666-6666-6666-6666-666666666602', 'HNB-L', 25000000, NULL, 14, '{"size": "L"}'),
  ('77777777-7777-7777-7777-777777777721', '66666666-6666-6666-6666-666666666603', 'CRP-FS', 18500000, 24000000, 40, '{"size": "Free size"}'),
  ('77777777-7777-7777-7777-777777777731', '66666666-6666-6666-6666-666666666604', 'TAT-5PK', 14500000, NULL, 80, '{"size": "39-43"}'),
  ('77777777-7777-7777-7777-777777777741', '66666666-6666-6666-6666-666666666605', 'KTN-FS', 9500000, 13000000, 100, '{"màu": "Trắng"}'),
  ('77777777-7777-7777-7777-777777777742', '66666666-6666-6666-6666-666666666605', 'KTN-DEN', 9500000, 13000000, 60, '{"màu": "Đen"}'),
  ('77777777-7777-7777-7777-777777777751', '66666666-6666-6666-6666-666666666606', 'DEP-39', 21000000, NULL, 15, '{"size": "39"}'),
  ('77777777-7777-7777-7777-777777777752', '66666666-6666-6666-6666-666666666606', 'DEP-40', 21000000, NULL, 20, '{"size": "40"}'),
  ('77777777-7777-7777-7777-777777777753', '66666666-6666-6666-6666-666666666606', 'DEP-41', 21000000, NULL, 0,  '{"size": "41"}');

-- ============ images (public/ — phục vụ trực tiếp, không qua optimize) ============
INSERT INTO product_images (id, product_id, url, alt, position) VALUES
  ('88888888-8888-8888-8888-888888888801', '66666666-6666-6666-6666-666666666601', '/images/products/ao-khoac-the-thao-1.jpg', 'Áo khoác thể thao zip đen mặc thử', 0),
  ('88888888-8888-8888-8888-888888888802', '66666666-6666-6666-6666-666666666601', '/images/products/ao-khoac-the-thao-2.jpg', 'Áo khoác thể thao chi tiết vải', 1),
  ('88888888-8888-8888-8888-888888888811', '66666666-6666-6666-6666-666666666602', '/images/products/ao-the-thao-hanabi-1.jpg', 'Áo thể thao Hanabi mặc thử', 0),
  ('88888888-8888-8888-8888-888888888812', '66666666-6666-6666-6666-666666666602', '/images/products/ao-the-thao-hanabi-2.jpg', 'Áo thể thao Hanabi bảng màu', 1),
  ('88888888-8888-8888-8888-888888888821', '66666666-6666-6666-6666-666666666603', '/images/products/ao-croptop-the-thao-1.jpg', 'Áo croptop thể thao mặc thử', 0),
  ('88888888-8888-8888-8888-888888888822', '66666666-6666-6666-6666-666666666603', '/images/products/ao-croptop-the-thao-2.jpg', 'Áo croptop thể thao chi tiết viền', 1),
  ('88888888-8888-8888-8888-888888888831', '66666666-6666-6666-6666-666666666604', '/images/products/set-tat-hanabi-5-doi-1.jpg', 'Set 5 đôi tất Hanabi trải ra', 0),
  ('88888888-8888-8888-8888-888888888832', '66666666-6666-6666-6666-666666666604', '/images/products/set-tat-hanabi-5-doi-2.jpg', 'Set 5 đôi tất chi tiết chất liệu', 1),
  ('88888888-8888-8888-8888-888888888841', '66666666-6666-6666-6666-666666666605', '/images/products/khau-trang-chong-nang-uv-1.jpg', 'Khẩu trang chống nắng UPF50 đeo thử', 0),
  ('88888888-8888-8888-8888-888888888842', '66666666-6666-6666-6666-666666666605', '/images/products/khau-trang-chong-nang-uv-2.jpg', 'Khẩu trang chống nắng chi tiết van khí', 1),
  ('88888888-8888-8888-8888-888888888851', '66666666-6666-6666-6666-666666666606', '/images/products/dep-da-xo-ngon-1.jpg', 'Dép da xỏ ngón đặt phẳng', 0),
  ('88888888-8888-8888-8888-888888888852', '66666666-6666-6666-6666-666666666606', '/images/products/dep-da-xo-ngon-2.jpg', 'Dép da xỏ ngón chi tiết quai', 1);

-- ============ coupons ============
INSERT INTO coupons (id, code, type, value, min_order_cents, expires_at, active) VALUES
  ('55555555-5555-5555-5555-555555555501', 'WELCOME10', 'PERCENT', 10, 0, NULL, true),
  ('55555555-5555-5555-5555-555555555502', 'GIAM50K', 'FIXED', 5000000, 30000000, NULL, true),
  ('55555555-5555-5555-5555-555555555503', 'TUANLE20', 'PERCENT', 20, 100000000, now() + interval '30 days', true);

-- ============ cross-sell curated ============
INSERT INTO related_products (product_id, related_product_id, type) VALUES
  ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666602', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666601', '66666666-6666-6666-6666-666666666604', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666602', '66666666-6666-6666-6666-666666666601', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666602', '66666666-6666-6666-6666-666666666603', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666603', '66666666-6666-6666-6666-666666666602', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666603', '66666666-6666-6666-6666-666666666605', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666604', '66666666-6666-6666-6666-666666666601', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666604', '66666666-6666-6666-6666-666666666605', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666605', '66666666-6666-6666-6666-666666666603', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666605', '66666666-6666-6666-6666-666666666604', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666606', '66666666-6666-6666-6666-666666666602', 'CROSS_SELL'),
  ('66666666-6666-6666-6666-666666666606', '66666666-6666-6666-6666-666666666604', 'CROSS_SELL');

COMMIT;
