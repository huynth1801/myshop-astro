package com.shop.blog.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record BulkDeletePostsRequest(
        @NotEmpty(message = "Danh sách ID bài viết không được để trống")
        List<UUID> ids
) {}
