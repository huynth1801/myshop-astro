package com.shop.order.dto;

import com.shop.order.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record CheckoutRequest(
        String cartToken,
        String email,
        String phone,
        @NotNull(message = "Shipping address is required") @Valid CustomerAddressDto shippingAddress,
        @NotNull(message = "Payment method is required") PaymentMethod paymentMethod,
        String customerNote,
        String honeypot
) {
    public CheckoutRequest(
            String cartToken,
            String email,
            String phone,
            CustomerAddressDto shippingAddress,
            PaymentMethod paymentMethod,
            String customerNote
    ) {
        this(cartToken, email, phone, shippingAddress, paymentMethod, customerNote, null);
    }
}
