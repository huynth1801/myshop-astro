package com.shop.admin.dto;

import com.shop.catalog.ProductStatus;
import com.shop.catalog.dto.CategoryRefResponse;
import com.shop.catalog.dto.VariantResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Admin detail: editable fields plus the full variant list. */
public record AdminProductDetailResponse(UUID id, String slug, String name, String description,
        String shortDescription, ProductStatus status, CategoryRefResponse category,
        List<VariantResponse> variants, Instant createdAt) {
}
