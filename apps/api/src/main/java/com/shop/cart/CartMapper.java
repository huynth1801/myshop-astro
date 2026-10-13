package com.shop.cart;

import com.shop.cart.dto.CartItemResponse;
import com.shop.cart.dto.CartResponse;
import com.shop.catalog.Product;
import com.shop.catalog.ProductImage;
import com.shop.catalog.ProductVariant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cart → DTO with CURRENT variant prices (the cart always recalculates;
 * priceAtAddCents is kept only as an informational snapshot). Totals and the
 * coupon discount are computed HERE from DB rows — never from client input
 * (AGENTS.md).
 */
public final class CartMapper {

    /** Free-shipping threshold: 500,000₫ stored as minor units (ADR 0003). */
    static final long FREE_SHIPPING_THRESHOLD_CENTS = 50_000_000L;

    private CartMapper() {
    }

    public static CartResponse toResponse(Cart cart, List<CartItem> items, Coupon coupon) {
        return toResponse(cart, items, coupon, Map.of());
    }

    public static CartResponse toResponse(Cart cart, List<CartItem> items, Coupon coupon,
            Map<UUID, String> primaryImagesByProductId) {
        List<CartItemResponse> itemDtos = items.stream()
                .map(item -> toItemResponse(item, primaryImagesByProductId))
                .toList();
        long subtotalCents = itemDtos.stream().mapToLong(CartItemResponse::lineTotalCents).sum();
        long discountCents = coupon == null ? 0L : discountCents(coupon, subtotalCents);
        String couponCode = coupon == null ? null : coupon.getCode();
        int itemCount = itemDtos.stream().mapToInt(CartItemResponse::qty).sum();
        return new CartResponse(cart.getId(), itemDtos, subtotalCents, discountCents, couponCode,
                0L, FREE_SHIPPING_THRESHOLD_CENTS, itemCount);
    }

    /**
     * PERCENT floors to whole minor units; FIXED is clamped to the subtotal so
     * the cart total can never go negative.
     */
    static long discountCents(Coupon coupon, long subtotalCents) {
        return switch (coupon.getType()) {
            case PERCENT -> Math.min(subtotalCents,
                    subtotalCents * Math.min(coupon.getValue(), 100) / 100);
            case FIXED -> Math.min(coupon.getValue(), subtotalCents);
        };
    }

    private static CartItemResponse toItemResponse(CartItem item,
            Map<UUID, String> primaryImagesByProductId) {
        ProductVariant variant = item.getVariant();
        Product product = variant.getProduct();

        String imageUrl = null;
        if (primaryImagesByProductId != null && product != null && product.getId() != null) {
            imageUrl = primaryImagesByProductId.get(product.getId());
        }
        if (imageUrl == null) {
            try {
                if (product.getImages() != null && !product.getImages().isEmpty()) {
                    imageUrl = product.getImages().stream()
                            .min(Comparator.comparingInt(ProductImage::getPosition))
                            .map(ProductImage::getUrl)
                            .orElse(product.getImages().get(0).getUrl());
                }
            } catch (Exception ignored) {
                // Safe fallback if images collection is uninitialized in lazy mode or mocks
            }
        }

        return new CartItemResponse(item.getId(), variant.getId(), variant.getSku(),
                product.getName(), product.getSlug(),
                variant.getAttributes() == null ? Map.of() : variant.getAttributes(),
                item.getQty(), item.getPriceAtAddCents(), variant.getPriceCents(),
                variant.getPriceCents() * item.getQty(), imageUrl);
    }
}
