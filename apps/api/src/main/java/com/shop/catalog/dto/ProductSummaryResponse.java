package com.shop.catalog.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Flat list-page DTO: everything ProductCard needs — including the second image
 * (hover swap), a default variant for quick-add, stock flag, and createdAt for
 * "New" badges. No JS-side computation.
 */
public record ProductSummaryResponse(UUID id, String slug, String name, String shortDescription,
        Long priceFromCents, Long compareAtFromCents, ImageResponse image, ImageResponse hoverImage,
        CategoryRefResponse category, UUID defaultVariantId, boolean inStock, Instant createdAt) {
}
