package com.shop.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateCategoryRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$",
                message = "slug must be lowercase kebab-case") String slug,
        UUID parentId) {
}
