package com.shop.catalog.dto;

import java.util.Map;
import java.util.UUID;

public record VariantResponse(UUID id, String sku, long priceCents, Long compareAtPriceCents,
        int stock, Map<String, Object> attributes) {
}
