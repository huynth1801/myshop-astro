package com.shop.cart;

import com.shop.common.uuid.Ids;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "carts")
public class Cart {

    @Id
    private UUID id;

    @Column(name = "cart_token", nullable = false, unique = true)
    private String cartToken;

    /** Plain column until the User entity exists (Phase 1 auth); FK enforced in DDL. */
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Applied coupon (V5) — discount recomputed from the coupon row per response. */
    @Column(name = "coupon_id")
    private UUID couponId;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    static Cart newCart(String token, Instant expiresAt) {
        Cart cart = new Cart();
        cart.cartToken = token;
        cart.expiresAt = expiresAt;
        return cart;
    }

    /** Adopt a guest cart into a user account on login/register. */
    void attachUser(UUID userId) {
        this.userId = userId;
    }

    void applyCoupon(UUID couponId) {
        this.couponId = couponId;
    }

    void removeCoupon() {
        this.couponId = null;
    }

    void extendExpiry(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void assignId() {
        if (id == null) {
            id = Ids.newId();
        }
    }

    public UUID getId() {
        return id;
    }

    public String getCartToken() {
        return cartToken;
    }

    public UUID getUserId() {
        return userId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public UUID getCouponId() {
        return couponId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
