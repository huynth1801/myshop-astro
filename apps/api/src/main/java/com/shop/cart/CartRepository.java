package com.shop.cart;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartRepository extends JpaRepository<Cart, UUID> {

    /** carts(cart_token) is indexed via its UNIQUE constraint. */
    Optional<Cart> findByCartTokenAndExpiresAtAfter(String cartToken, Instant now);
}
