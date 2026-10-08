package com.shop.common.web;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * The one pagination envelope for every list endpoint (PLAN.md §8):
 * { "content": [...], "page": 0, "size": 20, "totalElements": 342, "totalPages": 18 }
 */
public record PagedResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <T> PagedResponse<T> from(Page<T> page) {
        return new PagedResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
