package com.shop.blog;

import com.shop.blog.dto.AdminPostDetailResponse;
import com.shop.blog.dto.PostDetailResponse;
import com.shop.blog.dto.PostSummaryResponse;
import com.shop.catalog.dto.ProductSummaryResponse;
import java.util.List;
import java.util.UUID;

public final class PostMapper {

    private PostMapper() {
    }

    public static PostSummaryResponse toSummary(Post post) {
        return new PostSummaryResponse(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                post.getSummary(),
                post.getFeaturedImage(),
                post.getAuthor(),
                post.getStatus(),
                post.getPublishedAt(),
                post.getCreatedAt()
        );
    }

    public static PostDetailResponse toDetail(Post post, List<ProductSummaryResponse> relatedProducts) {
        return new PostDetailResponse(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                post.getSummary(),
                post.getContent(),
                post.getFeaturedImage(),
                post.getAuthor(),
                post.getStatus(),
                post.getSeoTitle(),
                post.getSeoDescription(),
                post.getViewCount(),
                post.getPublishedAt(),
                post.getCreatedAt(),
                relatedProducts == null ? List.of() : relatedProducts
        );
    }

    public static AdminPostDetailResponse toAdminDetail(Post post, List<UUID> relatedProductIds) {
        return new AdminPostDetailResponse(
                post.getId(),
                post.getTitle(),
                post.getSlug(),
                post.getSummary(),
                post.getContent(),
                post.getFeaturedImage(),
                post.getAuthor(),
                post.getStatus(),
                post.getSeoTitle(),
                post.getSeoDescription(),
                post.getViewCount(),
                post.getPublishedAt(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                relatedProductIds == null ? List.of() : relatedProductIds
        );
    }
}
