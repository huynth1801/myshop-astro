package com.shop.admin.dto;

import java.util.UUID;

/** Admin category row: includes the id the create-product form needs. */
public record AdminCategoryResponse(UUID id, String slug, String name, boolean hasParent) {
}
