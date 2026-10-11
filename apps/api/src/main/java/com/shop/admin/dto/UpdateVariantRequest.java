package com.shop.admin.dto;

import jakarta.validation.constraints.PositiveOrZero;

/** Partial — null (or absent) means unchanged. */
public record UpdateVariantRequest(
        @PositiveOrZero Long priceCents,
        @PositiveOrZero Long compareAtPriceCents,
        @PositiveOrZero Integer stock) {
}
