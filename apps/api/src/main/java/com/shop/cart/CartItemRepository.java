package com.shop.cart;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    /** One query for the whole drawer — no per-item lazy loading (no N+1). */
    @Query("""
            select ci from CartItem ci
              join fetch ci.variant v
              join fetch v.product p
            where ci.cart.id = :cartId
            order by ci.id
            """)
    List<CartItem> findAllByCartWithDetails(@Param("cartId") UUID cartId);

    Optional<CartItem> findByCartIdAndVariantId(UUID cartId, UUID variantId);

    Optional<CartItem> findByIdAndCartId(UUID id, UUID cartId);
}
