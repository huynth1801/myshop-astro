package com.shop.admin.dto;

import com.shop.catalog.ProductStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateProductRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$",
                message = "slug must be lowercase kebab-case") String slug,
        @Size(max = 100_000) String description,
        @Size(max = 200) String shortDescription,
        @NotNull ProductStatus status,
        @NotNull UUID categoryId) {
}
