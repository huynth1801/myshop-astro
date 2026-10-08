package com.shop.cart;

import java.util.UUID;

public class CartItemNotFoundException extends RuntimeException {

    public CartItemNotFoundException(UUID itemId) {
        super("No cart item '" + itemId + "' in this cart");
    }
}
