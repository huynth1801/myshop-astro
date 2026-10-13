-- V9 — update fashion-specific RSS sources (ADR 0007)

DELETE FROM rss_sources WHERE url IN (
    'https://vnexpress.net/rss/suc-khoe.rss',
    'https://kenh14.vn/fashion.rss',
    'https://vnexpress.net/rss/thoi-trang.rss',
    'https://vnexpress.net/rss/gia-dinh.rss'
);

INSERT INTO rss_sources (name, url, category, is_active) VALUES
    ('Thanh Niên — Thời trang trẻ', 'https://thanhnien.vn/rss/thoi-trang-tre.rss', 'Thời trang', true),
    ('Eva.vn — Thời trang & Xu hướng', 'https://eva.vn/rss/rss.php/36', 'Thời trang', true),
    ('Tạp chí Đẹp — Thời trang & Phong cách', 'https://dep.com.vn/feed/', 'Phong cách', true),
    ('Harper''s Bazaar Việt Nam', 'https://bazaarvietnam.vn/feed/', 'Thời trang cao cấp', true)
ON CONFLICT (url) DO UPDATE SET is_active = true;
