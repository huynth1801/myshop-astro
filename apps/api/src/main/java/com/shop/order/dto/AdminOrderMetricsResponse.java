package com.shop.order.dto;

public record AdminOrderMetricsResponse(
        long totalOrders,
        long pendingCount,
        long confirmedCount,
        long shippingCount,
        long fulfilledCount,
        long cancelledCount,
        long totalRevenueCents
) {}
