package com.shop.blog.dto;

import com.shop.blog.PostStatus;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record AdminUpdatePostRequest(
        @Size(max = 255, message = "Title must not exceed 255 characters")
        String title,

        @Size(max = 255, message = "Slug must not exceed 255 characters")
        String slug,

        @Size(max = 500, message = "Summary must not exceed 500 characters")
        String summary,

        String content,

        @Size(max = 2048, message = "Featured image URL must not exceed 2048 characters")
        String featuredImage,

        @Size(max = 100, message = "Author must not exceed 100 characters")
        String author,

        PostStatus status,

        @Size(max = 255, message = "SEO Title must not exceed 255 characters")
        String seoTitle,

        @Size(max = 500, message = "SEO Description must not exceed 500 characters")
        String seoDescription,

        List<UUID> relatedProductIds
) {}
