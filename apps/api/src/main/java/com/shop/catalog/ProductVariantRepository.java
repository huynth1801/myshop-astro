package com.shop.catalog;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    /** Detail fetch with product join-fetched so cart mapping never lazy-loads. */
    @Query("select v from ProductVariant v join fetch v.product where v.id = :id")
    Optional<ProductVariant> findByIdWithProduct(@Param("id") UUID id);

    /** Stock + id per product for list pages (quick-add default variant, inStock). */
    List<ProductVariant> findByProductIdInOrderBySkuAsc(Collection<UUID> productIds);
}
