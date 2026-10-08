package com.shop.cart.dto;

import java.util.List;
import java.util.UUID;

public record CartResponse(UUID id, List<CartItemResponse> items, long subtotalCents,
        long discountCents, String couponCode, long shippingCents,
        long freeShippingThresholdCents, int itemCount) {
}
