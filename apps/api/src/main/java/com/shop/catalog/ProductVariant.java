package com.shop.catalog;

import com.shop.common.uuid.Ids;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "product_variants")
public class ProductVariant {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private String sku;

    @Column(name = "price_cents")
    private long priceCents;

    @Column(name = "compare_at_price_cents")
    private Long compareAtPriceCents;

    private int stock;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> attributes;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = Ids.newId();
        }
    }

    public UUID getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public String getSku() {
        return sku;
    }

    public long getPriceCents() {
        return priceCents;
    }

    public Long getCompareAtPriceCents() {
        return compareAtPriceCents;
    }

    public int getStock() {
        return stock;
    }

    public Map<String, Object> getAttributes() {
        return attributes;
    }
}
