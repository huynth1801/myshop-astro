package com.shop.catalog;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    List<ProductImage> findByProductIdInOrderByPositionAsc(Collection<UUID> productIds);

    List<ProductImage> findByProductIdOrderByPositionAsc(UUID productId);
}
