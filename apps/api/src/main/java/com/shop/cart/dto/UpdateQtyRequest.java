package com.shop.cart.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** qty = 0 removes the item. */
public record UpdateQtyRequest(@Min(0) @Max(99) int qty) {
}
