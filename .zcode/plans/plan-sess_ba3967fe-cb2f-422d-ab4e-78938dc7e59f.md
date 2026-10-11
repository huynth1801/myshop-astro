# Plan — Nâng cấp Admin Quản lý Sản phẩm kiểu Shopee Seller Centre

Mục tiêu: trang list có **ảnh thumbnail + tìm kiếm/lọc**, bấm vào sản phẩm mở **trang chỉnh sửa chuyên sâu** riêng (`/admin/products/{id}`): sửa giá/tồn kho, quản lý hình ảnh (upload/reorder/xóa/alt), sửa mô tả, trạng thái, biến thể.

## Kiến trúc tổng thể

- **3 PR stacked** trên `feat/admin-ui` (theo quy tắc small PRs):
  1. `feat/admin-catalog-backend` — API: filter/ảnh cho list, ảnh trong detail, image CRUD + upload + serve file, xóa biến thể
  2. `feat/admin-list-v2` — trang `/admin` v2: thumbnail, search, filter, link sang trang sửa
  3. `feat/admin-product-edit` — trang `/admin/products/[id]` đầy đủ section kiểu Shopee
- **Không cần migration DB** — bảng `product_images`/`product_variants` hiện tại đã đủ (url, alt, position).
- Upload ảnh: **lưu local ở API** (`shop.uploads.dir`, mặc định `./data/uploads`), serve tại `GET /api/v1/files/{name}`. Ghi **ADR 0005**: local-first, thay bằng S3/Cloudinary sau (PLAN.md §1 đã dành chỗ). Lý do không trỏ thẳng vào `apps/web/public`: API và web là 2 app riêng khi deploy.

## PR 1 — Backend (`feat/admin-catalog-backend`)

**Endpoints mới/sửa (spec `docs/api-spec.yaml` trước, như luật contract-first):**

| Endpoint | Thay đổi |
|---|---|
| `GET /admin/products` | Thêm param `q` (tìm tên/slug, ilike), `status`, `categoryId`; summary thêm `image` (ảnh chính — tái dùng batch query `findByProductIdInOrderByPositionAsc` như `CatalogService.enrichSummaries`) |
| `GET /admin/products/{id}` | Response thêm `images: [{url, alt, position}]` |
| `POST /admin/products/{id}/images` | JSON `{url, alt}` — thêm ảnh bằng URL |
| `POST /admin/products/{id}/images/upload` | multipart `file` (+ `alt`) — upload ≤5MB, chỉ jpg/png/webp; tên lưu = UUID + đuôi gốc (chống path traversal) |
| `PATCH /admin/products/{id}/images/{imageId}` | Sửa `alt`, `position` |
| `PUT /admin/products/{id}/images/order` | Body `{imageIds: [...]}` theo thứ tự mới — gán lại position 0..n |
| `DELETE /admin/products/{id}/images/{imageId}` | Xóa ảnh |
| `DELETE /admin/variants/{variantId}` | Xóa biến thể — FK `cart_items` (RESTRICT) chặn nếu đang có trong giỏ → bắt `DataIntegrityViolationException` → **409 `VARIANT_IN_USE`** với thông điệp rõ ràng |

**Code:**
- `ProductImage`: thêm factory `newImage(product, url, alt, position)` + mutator `update(alt, position)`
- `CatalogAdminService`: `listProducts(q, status, categoryId, page, size)` (JPQL `:q is null or lower(p.name) like …`), ảnh trong summary/detail; `addImageByUrl`, `uploadImage(MultipartFile)`, `updateImage`, `reorderImages`, `deleteImage`, `deleteVariant`
- `FileStorage` component (`common/`): lưu/đọc file trong `shop.uploads.dir`, kiểm tra magic-bytes/đuôi, tên UUID
- Serve file: `FilesController` — `GET /api/v1/files/{name}` permitAll + `Cache-Control: immutable`; thêm vào `SecurityConfig`
- `application.yml` + `.env.example`: `shop.uploads.dir: ${UPLOAD_DIR:./data/uploads}`
- Exception handler: `VARIANT_IN_USE` 409, `IMAGE_NOT_FOUND` 404
- **Unit tests**: filter logic, image reorder (position gán lại đúng), upload từ chối file sai loại/quá lớn, variant delete → 409 khi FK chặn

## PR 2 — Trang list `/admin` v2 (`feat/admin-list-v2`)

- `AdminDashboard.tsx` nâng cấp:
  - **Cột thumbnail 48px** (ảnh chính, fallback placeholder "Không có ảnh")
  - **Thanh tìm kiếm** `q` (debounce 300ms) + dropdown lọc **trạng thái** (Tất cả/Đang bán/Nháp/Lưu trữ) + **danh mục**
  - Cột giá hiển thị **khoảng giá** (giá từ → giá đến khi có nhiều variant)
  - Nút **"Sửa"** + click hàng → điều hướng `admin/products/{id}` (bỏ panel inline `AdminProductDetail` cũ)
  - Badge trạng thái giữ nguyên + vẫn cho đổi nhanh qua dropdown
  - Phân trang như cũ; "+" Thêm sản phẩm giữ nguyên
- `lib/api/admin.ts`: `listProducts(q, status, categoryId, page)`, schema thêm `image`

## PR 3 — Trang chỉnh sửa `/admin/products/[id]` (`feat/admin-product-edit`)

SSR page `pages/admin/products/[id].astro` truyền `id` vào island `AdminProductEdit` (client:load), gate ADMIN như list. Bố cục 2 cột kiểu Shopee Seller Centre (form chính + cột phải trạng thái/hành động), chia component ≤200 dòng:

1. **Header** — tên + slug + badge trạng thái, link **"Xem trên shop"** (`/products/{slug}`), nút Xuất bản / Lưu trữ / Về nháp
2. **Thông tin cơ bản** (`AdminBasicInfoForm`) — tên, danh mục, mô tả ngắn, mô tả dài (textarea nhiều dòng), slug read-only kèm ghi chú "URL cố định"; nút Lưu riêng cho section, trạng thái "Đã lưu lúc …"
3. **Hình ảnh** (`AdminImagesManager`) — grid ảnh: badge **"Ảnh chính"** cho ảnh đầu, nút ←/→ đổi thứ tự (gọi `order`), sửa alt inline, nút Xóa (confirm); **khu thêm ảnh**: chọn/t kéo-thả file (upload) **hoặc** dán URL; preview trước khi lưu; tối đa khuyến nghị 5 ảnh/product (cảnh báo thôi)
4. **Biến thể & kho** (`AdminVariantsEditor`) — bảng SKU/thuộc tính (attributes render badge key:value)/giá/giá so sánh/tồn; sửa inline (nhập VND → ×100); **thêm biến thể** (SKU, giá, so sánh, tồn, attributes dạng key:value đơn giản); **xóa biến thể** có confirm, lỗi `VARIANT_IN_USE` hiện "Biến thể đang nằm trong giỏ của khách"
5. Mọi action hiển thị loading + lỗi tiếng Việt theo `code` problem+json

## Kiểm thử & nghiệm thu

- `./mvnw test` (unit tests mới; `contextLoads` vẫn fail do DB password local — đã biết, CI pass)
- `npm run check` (astro) — 0 errors
- Demo end-to-end trên stack đang chạy (Postgres 5433 + API + web + browser): upload 1 ảnh thật cho sản phẩm → ảnh hiện trên shop; reorder ảnh chính → ProductCard đổi ảnh hover; sửa giá/giả mô tả → trang product công khai phản ánh; xóa biến thể trong giỏ → 409 hiển thị đúng

## Rủi ro & đánh đổi đã cân nhắc

- **Upload local** không bền vững qua nhiều instance / mất khi re-deploy → ADR 0005 ghi rõ đường lên S3/Cloudinary; interface `FileStorage` thiết kế sẵn để thay
- Ảnh upload serve từ origin API (8080) khác origin web (4321) — chỉ là `<img src>`, không dính CORS
- Xóa biến thể bị chặn khi còn trong giỏ — hợp lý (giỏ hết hạn tự sạch); xóa ảnh an toàn (cascade, không FK từ giỏ)
