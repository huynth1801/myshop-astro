package com.shop.order;

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
@Table(name = "order_items")
public class OrderItem {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(nullable = false, length = 64)
    private String sku;

    @Column(name = "unit_price_cents", nullable = false)
    private long unitPriceCents;

    @Column(nullable = false)
    private int qty;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = Ids.newId();
        }
    }

    public static OrderItem create(
            String productName,
            String sku,
            long unitPriceCents,
            int qty,
            String imageUrl
    ) {
        OrderItem item = new OrderItem();
        item.id = Ids.newId();
        item.productName = productName;
        item.sku = sku;
        item.unitPriceCents = unitPriceCents;
        item.qty = qty;
        item.imageUrl = imageUrl;
        return item;
    }

    void setOrder(Order order) {
        this.order = order;
    }

    public UUID getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    public String getProductName() {
        return productName;
    }

    public String getSku() {
        return sku;
    }

    public long getUnitPriceCents() {
        return unitPriceCents;
    }

    public int getQty() {
        return qty;
    }

    public String getImageUrl() {
        return imageUrl;
    }
}
