# ADR 0008: Checkout Flow, Payment Methods (COD & VietQR), and Order Management

- **Status:** Accepted
- **Date:** 2026-10-13
- **Context:** E-commerce Storefront — Phase 1 / Phase 2 Order Fulfillment & Checkout Engine

## Context & Problem Statement

`myshop` has a functional product catalog, inventory variants, guest/user carts with coupon discounts, and an editorial blog storefront. However, customers cannot complete a purchase because the checkout flow and order persistence were not yet wired up.

While Stripe integration was initially planned, direct card payment via Stripe is often deferred or has high friction for Vietnamese retail shoppers, where Cash-On-Delivery (COD) and App-to-App Bank Transfer (VietQR) constitute over 90% of DTC orders.

We need a robust, tamper-proof checkout system that:
1. Calculates order totals strictly server-side (never trusting client numbers).
2. Manages variant inventory accurately (deducting stock on order placement, restoring stock on cancellation).
3. Supports both **COD** and **VietQR** (dynamic QR generation with bank details and prefilled order code & amount).
4. Provides a public order confirmation page (`/order-success`) and an administrative management dashboard (`/admin/orders`) to manage order lifecycles.

## Decision

1. **Order Schema & Human-Readable Code:**
   - Existing `orders` and `order_items` tables in `V1__baseline.sql` are augmented via `V10__orders_vietnam_checkout.sql`:
     - `order_code VARCHAR(32) UNIQUE`: Human-friendly tracking code format (e.g. `MS-261013-XXXX`).
     - `payment_method VARCHAR(50)`: Enum values `COD`, `VIETQR`, `STRIPE`.
     - `customer_note TEXT`: Special delivery instructions.
     - Updated status constraints: `PENDING`, `CONFIRMED`, `PAID`, `SHIPPING`, `FULFILLED`, `CANCELLED`, `REFUNDED`.
   - `order_items` continues to snapshot product name, SKU, quantity, and unit price in cents at the moment of order placement.

2. **Server-Side Recalculation & Stock Guarantee:**
   - When `POST /api/v1/checkout` is invoked with `cartToken` and shipping details:
     - Live cart items are fetched from DB.
     - Live stock for each variant is validated. If stock is insufficient, an `OUT_OF_STOCK` (409) conflict is thrown.
     - Subtotal is computed from live variant prices (`price_cents * qty`).
     - Any applied coupon is re-validated against min-order threshold and discount rule (percentage with floor or fixed clamped).
     - Shipping rule is evaluated: subtotal >= 500,000 VND qualifies for Free Shipping; otherwise 30,000 VND.
     - Total = Subtotal - Discount + Shipping.
     - Variant stock is decremented immediately within the transaction.
     - Cart items are cleared so the customer cannot re-submit the same cart.
     - Duplicate submissions with the same `Idempotency-Key` return the existing order.

3. **VietQR Payment Integration:**
   - For `VIETQR` payment, the backend builds a dynamic QR image URL using standard VietQR quick link format:
     `https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.jpg?amount={TOTAL_VND}&addInfo={ORDER_CODE}&accountName={ACCOUNT_NAME}`.
   - Bank configuration is sourced from environment variables with sensible defaults for local development.

4. **Order Status Lifecycle:**
   - `PENDING`: Order placed (COD waiting for confirmation, or VietQR waiting for transfer).
   - `CONFIRMED`: Admin verified address/payment.
   - `SHIPPING`: Shipped via courier.
   - `FULFILLED`: Delivered and completed.
   - `CANCELLED`: Cancelled by admin or customer. Stock is automatically returned to inventory.

5. **Storefront & Admin Experience:**
   - `/checkout`: Clean multi-step or single-page checkout island with Zod validation, Vietnam shipping address fields, payment method switcher, order summary sidebar, and live coupon/freeship calculation.
   - `/order-success`: Beautiful confirmation receipt with order code, interactive VietQR code (if chosen), bank transfer copy buttons, and order item recap.
   - `/admin/orders`: Dedicated management dashboard with order metrics, status filtering, live search, and status progression controls.

## Consequences

- Complete e-commerce loop from browse → cart → checkout → order tracking → admin fulfillment is fully operational.
- No third-party payment gateway dependencies required for local testing or immediate launch in Vietnam market.
- Stripe can easily be added as a third option (`paymentMethod = STRIPE`) without restructuring order schema.
