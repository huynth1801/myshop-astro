package com.shop.order.dto;

import com.shop.order.PaymentMethod;
import java.time.Instant;
import java.util.UUID;

public record AdminOrderSummaryResponse(
        UUID id,
        String orderCode,
        String status,
        String customerName,
        String customerPhone,
        String customerCity,
        long totalCents,
        int itemCount,
        PaymentMethod paymentMethod,
        Instant createdAt
) {}
