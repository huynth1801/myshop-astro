package com.shop.blog.dto;

import com.shop.blog.PostStatus;
import com.shop.catalog.dto.ProductSummaryResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostDetailResponse(
        UUID id,
        String title,
        String slug,
        String summary,
        String content,
        String featuredImage,
        String author,
        PostStatus status,
        String seoTitle,
        String seoDescription,
        long viewCount,
        Instant publishedAt,
        Instant createdAt,
        List<ProductSummaryResponse> relatedProducts
) {}
