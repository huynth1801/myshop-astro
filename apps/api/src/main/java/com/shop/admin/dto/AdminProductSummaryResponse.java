package com.shop.admin.dto;

import com.shop.catalog.ProductStatus;
import com.shop.catalog.dto.CategoryRefResponse;
import java.time.Instant;
import java.util.UUID;

/** Admin list row: inventory-centric — stock, variant count, price range, status. */
public record AdminProductSummaryResponse(UUID id, String slug, String name, ProductStatus status,
        CategoryRefResponse category, Long priceFromCents, int variantCount, int totalStock,
        boolean inStock, Instant createdAt) {
}
