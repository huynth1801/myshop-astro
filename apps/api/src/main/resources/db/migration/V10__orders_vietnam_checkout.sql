-- V10: Enhance orders table for Vietnam checkout (COD, VietQR), human-readable order code, and status tracking

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_code VARCHAR(32) UNIQUE,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NOT NULL DEFAULT 'COD',
    ADD COLUMN IF NOT EXISTS customer_note TEXT;

-- Add image_url snapshot to order_items
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(1024);

-- Update status check constraint to include CONFIRMED and SHIPPING
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;
ALTER TABLE orders ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('PENDING', 'CONFIRMED', 'PAID', 'SHIPPING', 'FULFILLED', 'CANCELLED', 'REFUNDED'));

CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC);
