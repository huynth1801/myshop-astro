package com.shop.cart.dto;

import java.util.Map;
import java.util.UUID;

public record CartItemResponse(UUID id, UUID variantId, String sku, String productName,
        String productSlug, Map<String, Object> attributes, int qty, long priceAtAddCents,
        long priceCents, long lineTotalCents) {
}
