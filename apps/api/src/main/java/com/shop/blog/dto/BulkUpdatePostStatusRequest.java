package com.shop.blog.dto;

import com.shop.blog.PostStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record BulkUpdatePostStatusRequest(
        @NotEmpty(message = "Danh sách ID bài viết không được để trống")
        List<UUID> ids,

        @NotNull(message = "Trạng thái không được để trống")
        PostStatus status
) {}
