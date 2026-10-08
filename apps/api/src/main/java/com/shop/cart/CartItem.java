package com.shop.cart;

import com.shop.catalog.ProductVariant;
import com.shop.common.uuid.Ids;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "cart_items")
public class CartItem {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id")
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    private int qty;

    @Column(name = "price_at_add_cents", nullable = false)
    private long priceAtAddCents;

    static CartItem newItem(Cart cart, ProductVariant variant, int qty) {
        CartItem item = new CartItem();
        item.cart = cart;
        item.variant = variant;
        item.qty = qty;
        item.priceAtAddCents = variant.getPriceCents();
        return item;
    }

    void setQty(int qty) {
        this.qty = qty;
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

    public Cart getCart() {
        return cart;
    }

    public ProductVariant getVariant() {
        return variant;
    }

    public int getQty() {
        return qty;
    }

    public long getPriceAtAddCents() {
        return priceAtAddCents;
    }
}
