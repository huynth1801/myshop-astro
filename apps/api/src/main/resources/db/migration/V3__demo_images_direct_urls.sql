-- V3 — demo seed images: picsum.photos 302-redirects to its CDN, and Astro's
-- build-time remote image loader refuses redirects. placehold.co serves 200s
-- directly. V2 is left untouched (already applied; forward-only rule).
UPDATE product_images
SET url = 'https://placehold.co/800x800/e7e5e4/44403c?text='
        || substring(url from '(myshop-[a-z0-9-]+)')
WHERE url LIKE 'https://picsum.photos/seed/%';
