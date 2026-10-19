package com.shop.order.dto;

import java.util.List;

public record PagedAdminOrdersResponse(
        List<AdminOrderSummaryResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
