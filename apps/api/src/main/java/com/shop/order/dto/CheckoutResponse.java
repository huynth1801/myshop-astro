package com.shop.order.dto;

import com.shop.order.PaymentMethod;
import java.util.UUID;

public record CheckoutResponse(
        UUID orderId,
        String orderCode,
        String status,
        long subtotalCents,
        long discountCents,
        long shippingCents,
        long totalCents,
        PaymentMethod paymentMethod,
        String vietQrUrl,
        BankInfoDto bankInfo,
        String stripeUrl
) {}
