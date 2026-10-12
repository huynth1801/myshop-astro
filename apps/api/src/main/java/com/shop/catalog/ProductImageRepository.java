package com.shop.catalog;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    List<ProductImage> findByProductIdInOrderByPositionAsc(Collection<UUID> productIds);

    List<ProductImage> findByProductIdOrderByPositionAsc(UUID productId);

    /** Admin update/delete scoped to one product — no cross-product tampering. */
    Optional<ProductImage> findByIdAndProductId(UUID id, UUID productId);

    /** Next free position for an append (CatalogAdminService). */
    Optional<ProductImage> findFirstByProductIdOrderByPositionDesc(UUID productId);
}
