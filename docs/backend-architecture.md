# Backend Architecture — myshop API

Trực quan hóa `apps/api` (Spring Boot 4.1, Java 21): quan hệ bảng, phân tầng, và các
luồng request chính. Nguồn sự thật: Flyway V1–V4 + code trong `com.shop.*`.

## 1. Quan hệ bảng (ERD)

```mermaid
erDiagram
    USERS ||--o{ ADDRESSES : "ship to"
    USERS |o--o{ CARTS : "guest → adopted on login"
    USERS |o--o{ ORDERS : "places"

    CATEGORIES |o--o{ CATEGORIES : "parent"
    CATEGORIES ||--o{ PRODUCTS : "groups"

    PRODUCTS ||--o{ PRODUCT_VARIANTS : "priced as"
    PRODUCTS ||--o{ PRODUCT_IMAGES : "gallery"
    PRODUCTS ||--o{ RELATED_PRODUCTS : "product side"
    PRODUCTS ||--o{ RELATED_PRODUCTS : "related side"

    CARTS ||--o{ CART_ITEMS : "holds"
    PRODUCT_VARIANTS ||--o{ CART_ITEMS : "referenced by"

    ORDERS ||--o{ ORDER_ITEMS : "snapshot lines"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar role "CUSTOMER | ADMIN"
    }
    CATEGORIES {
        uuid id PK
        varchar slug UK
        uuid parent_id FK
    }
    PRODUCTS {
        uuid id PK
        varchar slug UK
        varchar status "DRAFT | ACTIVE | ARCHIVED"
        uuid category_id FK
    }
    PRODUCT_VARIANTS {
        uuid id PK
        uuid product_id FK
        varchar sku UK
        bigint price_cents "VND minor units x100"
        int stock
        jsonb attributes
    }
    CARTS {
        uuid id PK
        varchar cart_token UK
        uuid user_id FK "null = guest"
        timestamptz expires_at
    }
    CART_ITEMS {
        uuid id PK
        uuid cart_id FK
        uuid variant_id FK
        int qty "CHECK > 0"
        bigint price_at_add_cents
    }
    ORDERS {
        uuid id PK
        uuid user_id FK "null = guest"
        varchar status "PENDING..REFUNDED"
        bigint total_cents
        varchar payment_intent_id
    }
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        varchar product_name "snapshot"
        varchar sku "snapshot"
        bigint unit_price_cents "snapshot"
    }
    COUPONS {
        uuid id PK
        varchar code UK
        varchar type "PERCENT | FIXED"
        int value
        bigint min_order_cents
    }
    RELATED_PRODUCTS {
        uuid product_id FK "PK"
        uuid related_product_id FK "PK"
        varchar type "CROSS_SELL | UPSELL | BUNDLE"
    }
```

Ghi chú thiết kế:

- **Tiền = `bigint` minor units** (ADR 0003: VND ×100), không bao giờ float — CHECK
  `price_cents >= 0`, `qty > 0` ngay ở DB.
- **`order_items` không FK về products/variants** — chụp `name/sku/unit_price` tại
  thời điểm mua; đổi/xóa sản phẩm sau này không làm hỏng đơn cũ.
- **`carts.user_id` nullable** — guest cart tồn tại trước user; login/register nhận
  cart (hoặc merge + kẹp theo stock) qua `CartService.getOrCreateCart(userId, token)`.
- **`related_products`** là self N–N có type — nền cho Phase 2 upsell.
- UUID do app sinh (UUIDv7 sortable, `common/uuid/Ids`); DB chỉ `gen_random_uuid()`
  làm phòng hờ.

## 2. Phân tầng & package (package-by-feature)

```mermaid
flowchart TB
    subgraph Cross["Tiết ngang (common)"]
        SEC["SecurityFilterChain<br/>JwtAuthFilter + CORS + EntryPoint 401"]
        ERR["ApiExceptionHandler<br/>problem+json code/traceId"]
        PAGED["PagedResponse"]
        IDS["UUIDv7"]
    end
    subgraph Features["Package-by-feature"]
        subgraph DONE["✅ đã chạy"]
            CAT["catalog/<br/>Controller·Service·Repo·DTO"]
            CART["cart/<br/>+ CartTokens cookie"]
            AUTH["auth/<br/>+ JwtService·RefreshCookies"]
        end
        subgraph LATER["⏳ chờ Stripe / Phase 2"]
            ORD["order/"]
            CHK["checkout/"]
        end
    end
    DB[(PostgreSQL 16<br/>Flyway V1–V4)]

    REQ[Request] --> SEC
    SEC --> CAT & CART & AUTH & ORD & CHK
    CAT & CART & AUTH & ORD & CHK --> ERR
    CAT & CART & AUTH & ORD & CHK --> DB
```

Luật tầng (AGENTS.md): Controller không business logic → Service không biết HTTP →
Repository chỉ query. Controller **không bao giờ** trả entity — map qua DTO record.
Mỗi list endpoint dùng chung envelope `PagedResponse` (page/size/totalElements).

## 3. Luồng request tiêu biểu

### 3.1 Đọc catalog (public, không state)

```mermaid
sequenceDiagram
    participant W as Astro (build/dev)
    participant F as JwtAuthFilter
    participant C as ProductController
    participant S as CatalogService
    participant R as Repositories
    W->>F: GET /api/v1/products?size=12&sort=newest
    F->>C: permitAll, không có Bearer → guest
    C->>S: listProducts(page, size, sort) — @Valid
    S->>R: ① page summaries (1 query, group-by min price)
    S->>R: ② images IN (productIds) — primary + hover
    S->>R: ③ variants IN (productIds) — defaultVariant + inStock
    R-->>S: 3 query — không N+1
    S-->>C: PagedResponse&lt;ProductSummaryResponse&gt; (DTO)
    C-->>W: 200 JSON — Zod parse ở web
```

### 3.2 Guest cart (cookie `cart_token`)

```mermaid
sequenceDiagram
    participant I as Island (CartWidget/CartBridge)
    participant C as CartController
    participant S as CartService
    participant DB as PostgreSQL
    I->>C: POST /api/v1/cart/items {variantId, qty} + cookie
    C->>C: đọc cookie (CartTokens) — không có → tạo cart mới + set cookie
    C->>S: addItem(cart, variantId, qty)
    S->>DB: khóa variant, kiểm stock<br/>(đã có trong cart → cộng dồn)
    alt vượt stock
        S-->>C: OutOfStockException
        C-->>I: 409 problem+json OUT_OF_STOCK
    else ổn
        S->>DB: insert/update cart_items
        S-->>C: CartResponse — tổng tính lại từ giá DB hiện tại
        C-->>I: 201 + Set-Cookie (30 ngày)
    end
```

### 3.3 Auth + nhận guest cart

```mermaid
sequenceDiagram
    participant B as AuthButton island
    participant A as AuthController
    participant S as AuthService
    participant J as JwtService
    participant CS as CartService
    B->>A: POST /auth/register {email, password≥12, name}
    A->>S: register — bcrypt hash, email trùng → 409
    S-->>A: User (role CUSTOMER)
    A->>J: issue(userId, email, name, role)
    J-->>A: access 15 phút + refresh 7 ngày
    A->>CS: getOrCreateCart(userId, cartToken cookie)
    alt user chưa có cart
        CS->>CS: guest cart.attachUser(userId) — nhận luôn
    else đã có cart
        CS->>CS: merge items (cộng dồn, kẹp stock) + xóa guest cart
    end
    A-->>B: 201 accessToken (JS memory) + refresh httpOnly cookie /api/v1/auth
    Note over B,J: Request sau: Bearer access → JwtAuthFilter → SecurityContext
```

## 4. Phân phối phase theo module

| Module | Bảng | Trạng thái |
|---|---|---|
| `catalog` | categories, products, product_variants, product_images | ✅ đang chạy |
| `cart` | carts, cart_items | ✅ đang chạy (coupons áp vào CartMapper — Phase 2) |
| `auth` | users (+addresses chưa dùng) | ✅ đang chạy |
| `order` | orders, order_items | ⏳ chờ Stripe (hoãn theo PLAN §3) |
| `checkout` | — (Stripe + Idempotency-Key) | ⏳ chờ Stripe |
| upsell | coupons, related_products | ⏳ Phase 2 |

## 5. Runbook ngắn

- Dev: `./mvnw spring-boot:run` (8080) — Flyway auto migrate lúc boot, `ddl-auto=validate`.
- Test: `./mvnw verify` — unit + context test (cần Postgres local).
- Migrations: chỉ thêm `V{n}__*.sql` forward-only — không sửa file cũ (checksum).
