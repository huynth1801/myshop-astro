package com.shop.blog.rss.dto;

import com.shop.blog.dto.PostSummaryResponse;
import java.util.List;

public record RssScanResultResponse(
        int sourcesScanned,
        int articlesScanned,
        int newDraftsCreated,
        int skippedExisting,
        List<PostSummaryResponse> createdPosts
) {}
