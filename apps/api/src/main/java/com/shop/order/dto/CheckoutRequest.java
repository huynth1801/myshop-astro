package com.shop.order.dto;

import com.shop.order.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CheckoutRequest(
        @Size(max = 64) String cartToken,
        @Size(max = 255) String email,
        @Size(max = 32) String phone,
        @NotNull(message = "Shipping address is required") @Valid CustomerAddressDto shippingAddress,
        @NotNull(message = "Payment method is required") PaymentMethod paymentMethod,
        @Size(max = 1000) String customerNote
) {}
