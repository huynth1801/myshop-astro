package com.shop.admin.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

/** Full ordered id list — positions are reassigned 0..n (index 0 = primary). */
public record ReorderImagesRequest(@NotEmpty List<UUID> imageIds) {
}
