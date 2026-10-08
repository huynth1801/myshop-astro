package com.shop.cart;

public class CartNotFoundException extends RuntimeException {

    public CartNotFoundException() {
        super("No active cart for this cart_token cookie");
    }
}
