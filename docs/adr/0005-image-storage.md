# ADR 0005 — Product image storage: local upload dir on the API, S3/Cloudinary later

- Status: Accepted (2026-10-11)
- Context: the admin needs Shopee-like image management (upload/reorder/delete).
  PLAN.md §1 reserves S3/Cloudinary for product images, but no account/infra
  exists yet and the store runs single-instance.

## Decision

The API owns uploads. `POST /api/v1/admin/products/{id}/images/upload` stores
the file (jpg/png/webp, ≤ 5 MB, magic-byte checked) under
`shop.uploads.dir` (env `UPLOAD_DIR`, default `./data/uploads`) with a
generated `UUID.ext` name, and serves it publicly at
`GET /api/v1/files/{name}` with immutable caching. The `product_images.url`
column stores that path — same as the seeded site-relative `/images/...`
paths, so the storefront needs zero changes.

Adding images **by URL** stays supported (`POST …/images` with `{url, alt}`).

## Why not the web app's public/

In deployment the web (Astro/Node) and API (Spring) are separate containers —
the API cannot write into the web's `public/`. Serving from the API keeps
upload self-contained; an `<img src>` cross-origin is unaffected by CORS.

## Migration path to S3/Cloudinary

All I/O is behind `FileStorage`; swapping it for an S3 implementation only
changes how `store()` returns its URL. Existing rows keep working since URLs
are opaque strings.

## Constraints / risks

- Local disk does not survive container re-creates or scale-out — accepted for
  now (single instance, demo catalog); revisit before launch (Launch Checklist).
- Deleting an image row does not delete the file — orphan files are harmless
  and can be swept later; keeping them makes rollbacks safe.
- Variant deletion is blocked while any cart references the variant
  (`cart_items` FK RESTRICT) → 409 `VARIANT_IN_USE`; carts expire on their own.
