# Hướng Dẫn CI/CD & Triển Khai (Deployment Guide) - Thuy Shop

Tài liệu này cung cấp hướng dẫn chi tiết và đầy đủ nhất về quy trình **CI/CD, Tự động hóa triển khai (Auto Deploy), Thiết lập bảo mật và Bộ lệnh kiểm tra** cho hệ thống storefront **Thuy Shop**:
- **Frontend**: Astro 5 + React Islands, triển khai trên **Cloudflare** (Edge Network).
- **Backend**: Java 21 / Spring Boot 4 + Flyway, triển khai qua **Docker** trên **VPS Ubuntu**.
- **Cơ sở dữ liệu**: PostgreSQL trên **Supabase** (Session Pooler IPv4).
- **Cầu nối bảo mật**: **Cloudflare Tunnel** (HTTPS an toàn cho API mà không cần mở port firewall hay mua domain ngay từ đầu).

---

## 1. Sơ đồ Luồng Hoạt Động (Architecture & CI/CD Flow)

```
                                  [ LẬP TRÌNH VIÊN ]
                                          │  git push
                                          ▼
                                   [ GITHUB REPO ]
                                 (huynth1801/myshop)
                                    /           \
                      Khi tạo PR   /             \  Khi Merge vào "main"
                                  ▼               ▼
                   ┌──────────────────────┐    ┌──────────────────────────────────┐
                   │    CI KIỂM TRA       │    │      AUTO DEPLOY (CD)            │
                   ├──────────────────────┤    ├─────────────────┬────────────────┤
                   │ 1. api.yml (Backend) │    │ A. deploy-api   │ B. Cloudflare  │
                   │    - Chạy Postgres DB│    │    (Backend)    │    (Frontend)  │
                   │    - Chạy 173 test   │    │ - Build Docker  │ - Git Webhook  │
                   │ 2. web.yml (Frontend)│    │ - Push GHCR     │ - Build Astro  │
                   │    - Astro check     │    │ - SSH vào VPS   │ - Deploy Edge  │
                   │    - Build tĩnh thử  │    │ - Docker pull/up│ - Phát hành URL│
                   └──────────────────────┘    └────────┬────────┴────────┬───────┘
                                                        │                 │
                                                        ▼                 ▼
                                                 [ VPS UBUNTU ]     [ CLOUDFLARE ]
                                                 (Spring Boot)       (Astro Web)
                                                        │                 │
                                                        └─── HTTPS Tunnel ◄
                                                          (trycloudflare)
```

---

## 2. CI/CD Backend (Spring Boot -> VPS)

Quy trình tự động hóa của Backend gồm 2 giai đoạn:
1. **Kiểm tra tự động (CI - `.github/workflows/api.yml`)**:
   - Khi có PR hoặc push vào nhánh liên quan tới `apps/api/**`.
   - Khởi tạo container PostgreSQL 16 tạm thời trên GitHub Actions runner.
   - Chạy toàn bộ 173 bài kiểm thử unit & repository test (Testcontainers).
   - Nếu có bất kỳ test nào fail, GitHub sẽ chặn không cho phép merge.
2. **Triển khai tự động (CD - `.github/workflows/deploy-api.yml`)**:
   - Kích hoạt khi merge vào nhánh `main`.
   - Tự động build Docker Image đa tầng (Multi-stage build) trong `apps/api/Dockerfile`.
   - Đẩy image lên **GitHub Container Registry (GHCR)**: `ghcr.io/huynth1801/myshop-api:latest`.
   - Tự động SSH vào VPS `103.82.36.36`.
   - Chạy `docker compose pull` và `docker compose up -d` tại thư mục `/opt/myshop` để cập nhật container mà không làm gián đoạn hệ thống.

### 2.1. Cấu hình GitHub Secrets cho Deploy
Truy cập vào GitHub: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**:

| Tên Secret | Giá trị mẫu | Giải thích |
| :--- | :--- | :--- |
| `VPS_HOST` | `103.82.36.36` | Địa chỉ IP của máy chủ VPS |
| `VPS_USER` | `root` | Tên người dùng SSH |
| `VPS_SSH_KEY` | *(Nội dung private key)* | Khóa bí mật SSH để đăng nhập tự động không cần mật khẩu |
| `VPS_PORT` | `22` | Cổng SSH (mặc định 22) |

#### Hướng dẫn tạo cặp khóa SSH (SSH Key Pair)
Chạy trên VPS hoặc máy cá nhân:
```bash
# 1. Sinh khóa Ed25519 mới
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# 2. Thêm public key vào authorized_keys trên VPS
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 3. Lấy private key dán vào Secret VPS_SSH_KEY trên GitHub
cat ~/.ssh/github_deploy
```

### 2.2. Phân quyền GitHub Container Registry (GHCR)
Để GitHub Actions có quyền tải Docker image lên GHCR:
1. Vào repository GitHub > **Settings** > **Actions** > **General**.
2. Kéo xuống mục **Workflow permissions**:
   - Chọn **Read and write permissions**.
   - Tích chọn **Allow GitHub Actions to create and approve pull requests**.
   - Nhấn **Save**.

### 2.3. Cấu hình biến môi trường Production trên VPS (`/opt/myshop/.env`)
File `.env` trên VPS chứa toàn bộ thông tin nhạy cảm và không được commit lên Git:
```bash
# Database Supabase IPv4 Session Pooler (port 5432)
DB_URL=jdbc:postgresql://aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
DB_USERNAME=postgres.xzolccezqmlqpcqwhrxm
DB_PASSWORD=your-db-password

# CORS & Cookie
CORS_ALLOWED_ORIGINS=https://*.workers.dev,https://*.pages.dev,http://localhost:4321
COOKIE_SECURE=true
COOKIE_SAME_SITE=None

# Thanh toán VietQR
VIETQR_BANK_ID=MB
VIETQR_ACCOUNT_NO=0987654321
VIETQR_ACCOUNT_NAME=THUY SHOP BOUTIQUE

# Telegram Chatbot CSKH
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

---

## 3. CI/CD Frontend (Astro Web -> Cloudflare)

Mỗi khi nhánh `main` có commit mới, Cloudflare tự động kéo code, build và phân phối ra hàng trăm máy chủ Edge toàn cầu.

### 3.1. Cấu hình Build Settings trên Cloudflare Dashboard
Vào **Cloudflare Dashboard** > **Workers & Pages** > Chọn dự án `thuyshop` > **Settings** > **Builds & deployments**:
- **Production branch**: `main`
- **Root directory**: `apps/web` *(Bắt buộc vì là cấu trúc monorepo)*
- **Build command**: `npm run build`
- **Build output directory**: `dist`

### 3.2. Cấu hình Biến môi trường (Environment Variables)
Trong tab **Variables and Secrets** (hoặc Environment variables), điền các biến sau:

| Tên biến | Giá trị | Mục đích |
| :--- | :--- | :--- |
| `NODE_VERSION` | `20` | Bắt buộc để dùng Node 20 (tương thích React 19 và Astro 5) |
| `OUTPUT_ADAPTER` | `cloudflare` | Báo hiệu cho Astro kích hoạt adapter `@astrojs/cloudflare` |
| `PUBLIC_API_URL` | `https://strong-announcement-florist-minimal.trycloudflare.com` | URL gọi API từ trình duyệt khách hàng |
| `API_BASE_URL` | `https://strong-announcement-florist-minimal.trycloudflare.com` | URL để Astro SSR gọi lấy dữ liệu lúc render |

### 3.3. Các file cấu hình cốt lõi của Frontend
- **`apps/web/wrangler.jsonc`**: Khai báo entrypoint `dist/_worker.js/index.js` và thư mục static `dist`.
- **`apps/web/public/.assetsignore`**: Chặn upload mã nguồn server `_worker.js` thành asset công khai.
- **`apps/web/astro.config.mjs`**: Tự động nhận diện môi trường build của Cloudflare.

---

## 4. Cầu Nối Bảo Mật HTTPS: Cloudflare Tunnel

Do Frontend chạy trên giao thức an toàn **HTTPS**, nếu API Backend chạy HTTP thường (`http://103.82.36.36:8080`), trình duyệt sẽ chặn đứng tất cả thao tác giỏ hàng, đặt hàng vì lỗi **Mixed Active Content**.

Giải pháp: Sử dụng **Cloudflare Tunnel (`cloudflared`)** tạo cầu nối HTTPS trực tiếp vào port 8080 của VPS:

```bash
docker run -d \
  --name cf-tunnel \
  --restart always \
  --network host \
  cloudflare/cloudflared:latest tunnel --url http://127.0.0.1:8080
```
- **Ưu điểm**: Không cần mở port firewall, không cần cấu hình Nginx/SSL phức tạp, hoàn toàn miễn phí.
- **Lấy link HTTPS ngẫu nhiên**:
  ```bash
  docker logs cf-tunnel 2>&1 | grep -o 'https://.*\.trycloudflare\.com' | tail -n 1
  ```

---

## 5. Bảng Tra Cứu Lệnh Quản Trị Hệ Thống (Cheat Sheet)

### 5.1. Quản trị Backend trên VPS
```bash
# 1. Đăng nhập vào VPS
ssh root@103.82.36.36

# 2. Xem các container đang chạy
docker ps

# 3. Xem log thời gian thực của Backend (50 dòng gần nhất)
docker logs -f --tail=50 myshop-api

# 4. Kiểm tra sức khỏe API nội bộ
curl -s http://localhost:8080/api/health
# Kết quả mong đợi: {"status":"UP"}

# 5. Kiểm tra danh sách sản phẩm lấy từ Database
curl -s http://localhost:8080/api/v1/products | head -c 200

# 6. Khởi động lại API thủ công
cd /opt/myshop
docker compose -f docker-compose.prod.yml restart api
```

### 5.2. Quản trị Cloudflare Tunnel trên VPS
```bash
# 1. Kiểm tra trạng thái Tunnel
docker ps -f name=cf-tunnel

# 2. Xem URL HTTPS hiện tại của Tunnel
docker logs cf-tunnel 2>&1 | grep -o 'https://.*\.trycloudflare\.com' | tail -n 1

# 3. Xem log hoạt động của Tunnel
docker logs -f --tail=30 cf-tunnel

# 4. Khởi động lại Tunnel nếu cần
docker restart cf-tunnel
```

### 5.3. Kiểm tra Frontend trên máy cá nhân (Local Dev)
```bash
# 1. Vào thư mục web
cd apps/web

# 2. Kiểm tra type check và lỗi Astro
npm run check

# 3. Chạy thử bản build production với Cloudflare Adapter
OUTPUT_ADAPTER=cloudflare npm run build

# 4. Kiểm tra thử đóng gói của Wrangler
npx wrangler deploy --dry-run
```

---

## 6. Tiêu Chuẩn Bảo Mật & Lưu Ý Vận Hành

1. **Tuyệt đối không lưu bí mật vào mã nguồn**:
   - Mọi mật khẩu DB, Token bot Telegram, Private Key đều chỉ nằm ở `/opt/myshop/.env` hoặc GitHub Secrets.
2. **Quy tắc Tiền tệ trong Mã nguồn**:
   - Tiền tệ luôn biểu diễn dưới dạng số nguyên (`long` cents, ví dụ `99_000_000L`), không dùng `float`/`double`.
   - Tổng tiền đơn hàng, mã giảm giá và phí vận chuyển luôn được tính toán lại 100% tại Backend lúc Checkout, không tin tưởng giá trị gửi từ Client.
3. **Giới hạn tài nguyên máy chủ**:
   - Container `myshop-api` được giới hạn tối đa 650MB RAM (`deploy.resources.limits.memory: 650M`) tránh làm treo VPS.
   - Giới hạn xoay vòng log Docker tối đa 5 file, mỗi file 20MB (`max-size: 20m`) tránh đầy dung lượng đĩa cứng.
4. **Quy trình Git chuẩn**:
   - Không commit trực tiếp vào `main`.
   - Mỗi tính năng/sửa lỗi tạo nhánh riêng (`feat/...`, `fix/...`, `docs/...`) > Tạo PR > Merge sau khi CI xanh.
