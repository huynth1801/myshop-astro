package com.shop.catalog;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/** Curated recommendation link between two products (PK = product, related, type). */
@Entity
@Table(name = "related_products")
@IdClass(RelatedProduct.RelatedProductId.class)
public class RelatedProduct {

    @Id
    private UUID productId;

    @Id
    private UUID relatedProductId;

    @Id
    @Enumerated(EnumType.STRING)
    private RelatedType type;

    public UUID getProductId() {
        return productId;
    }

    public UUID getRelatedProductId() {
        return relatedProductId;
    }

    public RelatedType getType() {
        return type;
    }

    public static class RelatedProductId implements Serializable {
        private UUID productId;
        private UUID relatedProductId;
        private RelatedType type;

        public RelatedProductId() {
        }

        public RelatedProductId(UUID productId, UUID relatedProductId, RelatedType type) {
            this.productId = productId;
            this.relatedProductId = relatedProductId;
            this.type = type;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (o == null || getClass() != o.getClass()) {
                return false;
            }
            RelatedProductId that = (RelatedProductId) o;
            return Objects.equals(productId, that.productId)
                    && Objects.equals(relatedProductId, that.relatedProductId)
                    && type == that.type;
        }

        @Override
        public int hashCode() {
            return Objects.hash(productId, relatedProductId, type);
        }
    }
}
