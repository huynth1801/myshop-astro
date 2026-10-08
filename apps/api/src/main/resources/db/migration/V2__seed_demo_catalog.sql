-- V2 — demo catalog seed so the storefront has real data before admin CRUD exists.
-- Remove or gate this before production (tracked for the launch checklist).
-- Fixed UUIDs keep the seed deterministic. Images are picsum placeholders.

INSERT INTO categories (id, name, slug, position) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Apparel',    'apparel',    0),
  ('11111111-1111-1111-1111-111111111102', 'Accessories', 'accessories', 1)
ON CONFLICT DO NOTHING;

INSERT INTO products (id, name, slug, description, short_description, status, category_id, created_at) VALUES
  ('22222222-2222-2222-2222-222222222201', 'Classic Cotton Tee', 'classic-cotton-tee',
   'A heavyweight 220 gsm combed cotton tee with a relaxed fit and reinforced collar. Pre-shrunk so the size you buy is the size it stays.',
   'Heavyweight 220 gsm combed cotton tee, relaxed fit, pre-shrunk and built to keep its shape.',
   'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '9 days'),
  ('22222222-2222-2222-2222-222222222202', 'Heavyweight Hoodie', 'heavyweight-hoodie',
   'A 450 gsm brushed-fleece hoodie with a double-lined hood, kangaroo pocket, and ribbed cuffs. Warm enough to be your outer layer most of the year.',
   '450 gsm brushed-fleece hoodie with double-lined hood and kangaroo pocket — a cold-morning staple.',
   'ACTIVE', '11111111-1111-1111-1111-111111111101', now() - interval '7 days'),
  ('22222222-2222-2222-2222-222222222203', 'Merino Crew Socks (3-Pack)', 'merino-crew-socks-3-pack',
   'Three pairs of cushioned merino-blend crew socks. Temperature-regulating, odour-resistant, and smooth across the toe so nothing rubs on long days.',
   'Cushioned merino-blend crew socks in a 3-pack: breathable, odour-resistant, no toe seam.',
   'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '6 days'),
  ('22222222-2222-2222-2222-222222222204', 'Waxed Canvas Belt', 'waxed-canvas-belt',
   'A 38 mm waxed canvas belt with a solid brass buckle. Stiff when new, then molds to you. Trim-to-fit with a household scissors.',
   '38 mm waxed canvas belt with solid brass buckle — breaks in, never breaks down.',
   'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '4 days'),
  ('22222222-2222-2222-2222-222222222205', 'Enamel Camp Mug', 'enamel-camp-mug',
   'A 350 ml steel-core enamel mug, kiln-fired twice so the rim stays smooth. Handles camp stoves, dishwashers, and being dropped on gravel.',
   '350 ml steel-core enamel mug, double kiln-fired — camp stove and dishwasher safe.',
   'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '3 days'),
  ('22222222-2222-2222-2222-222222222206', 'Field Cap', 'field-cap',
   'A six-panel washed-cotton cap with a low profile, brass slider closure, and a soft brim that packs flat without creasing.',
   'Six-panel washed-cotton cap, low profile, brass slider closure, packs flat.',
   'ACTIVE', '11111111-1111-1111-1111-111111111102', now() - interval '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (id, product_id, sku, price_cents, compare_at_price_cents, stock, attributes) VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'TEE-CLS-S', 1900, 2400, 42, '{"size": "S"}'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'TEE-CLS-M', 1900, 2400, 35, '{"size": "M"}'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 'TEE-CLS-L', 1900, 2400, 28, '{"size": "L"}'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222201', 'TEE-CLS-XL', 1900, 2400, 12, '{"size": "XL"}'),
  ('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222202', 'HOOD-HVY-M', 4900, NULL, 20, '{"size": "M"}'),
  ('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222202', 'HOOD-HVY-L', 4900, NULL, 24, '{"size": "L"}'),
  ('33333333-3333-3333-3333-333333333313', '22222222-2222-2222-2222-222222222202', 'HOOD-HVY-XL', 4900, NULL, 9, '{"size": "XL"}'),
  ('33333333-3333-3333-3333-333333333321', '22222222-2222-2222-2222-222222222203', 'SOCK-MER-3PK', 1400, NULL, 60, '{"size": "One Size"}'),
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222204', 'BELT-WCX-38', 2200, NULL, 18, '{"length_cm": 95}'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222204', 'BELT-WCX-42', 2200, NULL, 15, '{"length_cm": 107}'),
  ('33333333-3333-3333-3333-333333333341', '22222222-2222-2222-2222-222222222205', 'MUG-ENM-350', 1200, 1500, 80, '{"capacity_ml": 350}'),
  ('33333333-3333-3333-3333-333333333351', '22222222-2222-2222-2222-222222222206', 'CAP-FLD-OS', 2600, NULL, 0, '{"size": "One Size"}')
ON CONFLICT DO NOTHING;

INSERT INTO product_images (id, product_id, url, alt, position) VALUES
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', 'https://picsum.photos/seed/myshop-tee-1/800/800', 'Classic Cotton Tee worn by a model, front view', 0),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222201', 'https://picsum.photos/seed/myshop-tee-2/800/800', 'Classic Cotton Tee folded, showing fabric texture', 1),
  ('44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222202', 'https://picsum.photos/seed/myshop-hoodie-1/800/800', 'Heavyweight Hoodie hanging on a hook', 0),
  ('44444444-4444-4444-4444-444444444412', '22222222-2222-2222-2222-222222222202', 'https://picsum.photos/seed/myshop-hoodie-2/800/800', 'Heavyweight Hoodie kangaroo pocket detail', 1),
  ('44444444-4444-4444-4444-444444444421', '22222222-2222-2222-2222-222222222203', 'https://picsum.photos/seed/myshop-socks-1/800/800', 'Merino Crew Socks three-pack, folded', 0),
  ('44444444-4444-4444-4444-444444444422', '22222222-2222-2222-2222-222222222203', 'https://picsum.photos/seed/myshop-socks-2/800/800', 'Merino Crew Socks cushioned sole detail', 1),
  ('44444444-4444-4444-4444-444444444431', '22222222-2222-2222-2222-222222222204', 'https://picsum.photos/seed/myshop-belt-1/800/800', 'Waxed Canvas Belt with brass buckle', 0),
  ('44444444-4444-4444-4444-444444444432', '22222222-2222-2222-2222-222222222204', 'https://picsum.photos/seed/myshop-belt-2/800/800', 'Waxed Canvas Belt trim-to-fit end', 1),
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222205', 'https://picsum.photos/seed/myshop-mug-1/800/800', 'Enamel Camp Mug on a picnic table', 0),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222205', 'https://picsum.photos/seed/myshop-mug-2/800/800', 'Enamel Camp mug stacked with gear', 1),
  ('44444444-4444-4444-4444-444444444451', '22222222-2222-2222-2222-222222222206', 'https://picsum.photos/seed/myshop-cap-1/800/800', 'Field Cap, front view', 0),
  ('44444444-4444-4444-4444-444444444452', '22222222-2222-2222-2222-222222222206', 'https://picsum.photos/seed/myshop-cap-2/800/800', 'Field Cap brass slider closure detail', 1)
ON CONFLICT DO NOTHING;

-- Field Cap starts out of stock on purpose: proves the SEO rule that OOS pages
-- stay live with availability=OutOfStock in JSON-LD.
