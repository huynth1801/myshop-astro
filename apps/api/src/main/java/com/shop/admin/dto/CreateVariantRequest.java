package com.shop.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record CreateVariantRequest(
        @NotBlank @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9-]+$",
                message = "sku may contain letters, digits and dashes only") String sku,
        @NotNull @PositiveOrZero Long priceCents,
        @PositiveOrZero Long compareAtPriceCents,
        @NotNull @PositiveOrZero Integer stock,
        Map<String, Object> attributes) {
}
