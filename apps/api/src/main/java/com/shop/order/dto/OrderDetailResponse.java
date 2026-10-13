package com.shop.order.dto;

import com.shop.order.PaymentMethod;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderDetailResponse(
        UUID id,
        String orderCode,
        String status,
        long subtotalCents,
        long discountCents,
        long shippingCents,
        long totalCents,
        PaymentMethod paymentMethod,
        CustomerAddressDto shippingAddress,
        String customerNote,
        String vietQrUrl,
        BankInfoDto bankInfo,
        List<OrderItemResponse> items,
        Instant createdAt
) {}
