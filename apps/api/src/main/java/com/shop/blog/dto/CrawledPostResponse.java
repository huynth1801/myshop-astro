package com.shop.blog.dto;

public record CrawledPostResponse(
        String title,
        String summary,
        String content,
        String featuredImage,
        String author,
        String sourceUrl,
        String suggestedSlug
) {}
