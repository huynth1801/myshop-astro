package com.shop.cart;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** coupons table (V1) — discount is recalculated from this row every response. */
@Entity
@Table(name = "coupons")
public class Coupon {

    public enum Type {
        /** value = percent 1..100 */
        PERCENT,
        /** value = minor-unit cents (VND ×100, ADR 0003) */
        FIXED
    }

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Column(nullable = false)
    private int value;

    @Column(name = "min_order_cents", nullable = false)
    private long minOrderCents;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean active = true;

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public Type getType() {
        return type;
    }

    public int getValue() {
        return value;
    }

    public long getMinOrderCents() {
        return minOrderCents;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isUsable(Instant now) {
        return active && (expiresAt == null || expiresAt.isAfter(now));
    }
}
