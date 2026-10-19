package com.shop.order.dto;

import java.util.UUID;

public record OrderItemResponse(
        UUID id,
        String productName,
        String sku,
        long unitPriceCents,
        int qty,
        long totalPriceCents,
        String imageUrl
) {}
