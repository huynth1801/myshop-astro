package com.shop.blog.rss.dto;

import java.time.Instant;
import java.util.UUID;

public record RssSourceResponse(
        UUID id,
        String name,
        String url,
        String category,
        boolean isActive,
        Instant lastFetchedAt,
        Instant createdAt
) {}
