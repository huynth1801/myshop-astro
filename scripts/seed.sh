#!/usr/bin/env bash
# Seed demo catalog vào PostgreSQL — chạy được trên mọi máy.
#
# Cách dùng:
#   ./scripts/seed.sh                  # db local tên `myshop` (auth peer/localhost)
#   DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/seed.sh
#
# Yêu cầu: schema đã được Flyway tạo (chỉ cần boot API 1 lần trên db rỗng).
# Idempotent: chạy lại bao nhiêu lần cũng ra đúng data demo. Bảng users giữ nguyên.
set -euo pipefail

BASEDIR=$(cd "$(dirname "$0")/.." && pwd)
SEED_FILE="$BASEDIR/apps/api/src/main/resources/db/seed/demo-catalog.sql"

echo "→ Seeding demo catalog…"
if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE"
else
  psql -d "${1:-myshop}" -v ON_ERROR_STOP=1 -f "$SEED_FILE"
fi
echo "✓ Xong: 6 sản phẩm, 12 variants, 12 ảnh, 3 coupons, 12 cross-sell."
echo "  (web cần rebuild để trang tĩnh nhận data mới: cd apps/web && npm run build)"
