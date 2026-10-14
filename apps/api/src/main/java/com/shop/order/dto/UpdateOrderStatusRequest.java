package com.shop.order.dto;

import com.shop.order.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateOrderStatusRequest(
        @NotNull(message = "Order status is required") OrderStatus status
) {}
