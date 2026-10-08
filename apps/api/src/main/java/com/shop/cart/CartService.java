package com.shop.cart;

import com.shop.cart.dto.CartResponse;
import com.shop.catalog.ProductVariant;
import com.shop.catalog.ProductVariantRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    private static final Duration CART_TTL = Duration.ofDays(30);

    private final CartRepository carts;
    private final CartItemRepository items;
    private final ProductVariantRepository variants;

    public CartService(CartRepository carts, CartItemRepository items,
            ProductVariantRepository variants) {
        this.carts = carts;
        this.items = items;
        this.variants = variants;
    }

    @Transactional
    public Cart getOrCreateCart(String cartToken) {
        if (cartToken != null) {
            Optional<Cart> found = carts.findByCartTokenAndExpiresAtAfter(cartToken, Instant.now());
            if (found.isPresent()) {
                return found.get();
            }
        }
        // Missing or expired → brand-new cart with a fresh token (cookie refreshed by controller)
        return carts.save(Cart.newCart(CartTokens.newToken(), Instant.now().plus(CART_TTL)));
    }

    @Transactional(readOnly = true)
    public Optional<Cart> findActiveCart(String cartToken) {
        if (cartToken == null) {
            return Optional.empty();
        }
        return carts.findByCartTokenAndExpiresAtAfter(cartToken, Instant.now());
    }

    @Transactional
    public CartResponse addItem(Cart cart, UUID variantId, int qty) {
        ProductVariant variant = variants.findByIdWithProduct(variantId)
                .orElseThrow(() -> new VariantNotFoundException(variantId));

        CartItem item = items.findByCartIdAndVariantId(cart.getId(), variantId).orElse(null);
        int newQty = (item == null ? 0 : item.getQty()) + qty;
        if (variant.getStock() < newQty) {
            throw new OutOfStockException(variant.getSku(), variant.getStock());
        }
        if (item == null) {
            items.save(CartItem.newItem(cart, variant, qty));
        } else {
            item.setQty(newQty);
        }
        return toResponse(cart);
    }

    @Transactional
    public CartResponse changeQty(Cart cart, UUID itemId, int qty) {
        CartItem item = items.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new CartItemNotFoundException(itemId));
        if (qty == 0) {
            items.delete(item);
        } else {
            if (item.getVariant().getStock() < qty) {
                throw new OutOfStockException(item.getVariant().getSku(), item.getVariant().getStock());
            }
            item.setQty(qty);
        }
        return toResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(Cart cart, UUID itemId) {
        CartItem item = items.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new CartItemNotFoundException(itemId));
        items.delete(item);
        return toResponse(cart);
    }

    @Transactional(readOnly = true)
    public CartResponse toResponse(Cart cart) {
        return CartMapper.toResponse(cart, items.findAllByCartWithDetails(cart.getId()));
    }
}
