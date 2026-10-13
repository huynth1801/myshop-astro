package com.shop.blog.dto;

import com.shop.blog.PostStatus;
import java.time.Instant;
import java.util.UUID;

public record PostSummaryResponse(
        UUID id,
        String title,
        String slug,
        String summary,
        String featuredImage,
        String author,
        PostStatus status,
        Instant publishedAt,
        Instant createdAt
) {}
