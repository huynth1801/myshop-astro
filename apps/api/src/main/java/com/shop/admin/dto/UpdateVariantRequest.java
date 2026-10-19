package com.shop.admin.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.Map;

/** Partial — null (or absent) means unchanged. */
public record UpdateVariantRequest(
        @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9-]+$",
                message = "sku may contain letters, digits and dashes only") String sku,
        @PositiveOrZero Long priceCents,
        @PositiveOrZero Long compareAtPriceCents,
        @PositiveOrZero Integer stock,
        Map<String, Object> attributes) {

    public UpdateVariantRequest(Long priceCents, Long compareAtPriceCents, Integer stock) {
        this(null, priceCents, compareAtPriceCents, stock, null);
    }
}
