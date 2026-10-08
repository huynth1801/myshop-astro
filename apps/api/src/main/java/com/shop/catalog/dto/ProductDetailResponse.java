package com.shop.catalog.dto;

import java.util.List;
import java.util.UUID;

public record ProductDetailResponse(UUID id, String slug, String name, String description,
        String shortDescription, CategoryRefResponse category, List<ImageResponse> images,
        List<VariantResponse> variants, boolean inStock) {
}
