package com.shop.admin.dto;

import com.shop.catalog.ProductStatus;
import com.shop.catalog.dto.CategoryRefResponse;
import com.shop.catalog.dto.ImageResponse;
import java.time.Instant;
import java.util.UUID;

/** Admin list row: thumbnail, price range, stock, variant count, status. */
public record AdminProductSummaryResponse(UUID id, String slug, String name, ProductStatus status,
        CategoryRefResponse category, Long priceFromCents, Long priceToCents, int variantCount,
        int totalStock, boolean inStock, ImageResponse image, Instant createdAt) {
}
