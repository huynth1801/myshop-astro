package com.shop.admin.dto;

import com.shop.catalog.ProductStatus;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Partial update — every field optional; absent means unchanged. The slug is
 * immutable (stable-URL rule) and therefore not present.
 */
public record UpdateProductRequest(
        @Size(min = 1, max = 255) String name,
        @Size(max = 100_000) String description,
        @Size(max = 200) String shortDescription,
        ProductStatus status,
        UUID categoryId) {
}
