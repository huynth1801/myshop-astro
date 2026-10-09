package com.shop.catalog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RelatedProductRepository extends JpaRepository<RelatedProduct, RelatedProduct.RelatedProductId> {

    List<RelatedProduct> findByProductIdAndTypeOrderByRelatedProductIdAsc(UUID productId, RelatedType type);
}
