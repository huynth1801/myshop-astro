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

    /**
     * Resolves the caller's cart. Authenticated users get their account cart; a
     * guest cart riding along in the cookie is adopted (no account cart yet) or
     * merged into it (both exist). Guests resolve by cookie only.
     */
    @Transactional
    public Cart getOrCreateCart(UUID userId, String cartToken) {
        Instant now = Instant.now();
        if (userId == null) {
            return resolveGuestCart(cartToken, now);
        }

        Optional<Cart> guest = cartToken == null
                ? Optional.empty()
                : carts.findByCartTokenAndExpiresAtAfter(cartToken, now);
        Optional<Cart> userCart =
                carts.findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(userId, now);

        if (userCart.isEmpty() && guest.isPresent()) {
            guest.get().attachUser(userId);
            return guest.get();
        }
        if (userCart.isEmpty()) {
            Cart created = Cart.newCart(CartTokens.newToken(), now.plus(CART_TTL));
            created.attachUser(userId);
            return carts.save(created);
        }
        if (guest.isPresent() && !guest.get().getCartToken().equals(userCart.get().getCartToken())) {
            mergeGuestInto(userCart.get(), guest.get());
        }
        return userCart.get();
    }

    @Transactional(readOnly = true)
    public Optional<Cart> findActiveCart(UUID userId, String cartToken) {
        if (userId != null) {
            return carts.findFirstByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(userId, Instant.now());
        }
        if (cartToken == null) {
            return Optional.empty();
        }
        return carts.findByCartTokenAndExpiresAtAfter(cartToken, Instant.now());
    }

    private Cart resolveGuestCart(String cartToken, Instant now) {
        if (cartToken != null) {
            Optional<Cart> found = carts.findByCartTokenAndExpiresAtAfter(cartToken, now);
            if (found.isPresent()) {
                return found.get();
            }
        }
        return carts.save(Cart.newCart(CartTokens.newToken(), now.plus(CART_TTL)));
    }

    /**
     * Moves guest items into the user's cart, summing quantities per variant and
     * clamping to stock — a stale guest cart must never block a login.
     */
    private void mergeGuestInto(Cart target, Cart guest) {
        for (CartItem guestItem : items.findAllByCartWithDetails(guest.getId())) {
            int stock = guestItem.getVariant().getStock();
            if (stock <= 0) {
                continue;
            }
            CartItem targetItem = items
                    .findByCartIdAndVariantId(target.getId(), guestItem.getVariant().getId())
                    .orElse(null);
            int mergedQty = Math.min((targetItem == null ? 0 : targetItem.getQty()) + guestItem.getQty(), stock);
            if (mergedQty <= 0) {
                continue;
            }
            if (targetItem == null) {
                items.save(CartItem.newItem(target, guestItem.getVariant(), mergedQty));
            } else {
                targetItem.setQty(mergedQty);
            }
        }
        carts.delete(guest);
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
