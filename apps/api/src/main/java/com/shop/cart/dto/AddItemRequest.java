package com.shop.cart.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AddItemRequest(@NotNull UUID variantId, @Min(1) @Max(99) int qty) {
}
