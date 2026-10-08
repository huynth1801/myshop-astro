package com.shop.catalog.dto;

import java.util.UUID;

public record ProductSummaryResponse(UUID id, String slug, String name, String shortDescription,
        Long priceFromCents, ImageResponse image, CategoryRefResponse category) {
}
