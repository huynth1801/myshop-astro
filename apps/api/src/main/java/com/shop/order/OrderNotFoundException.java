package com.shop.order;

public class OrderNotFoundException extends RuntimeException {

    public OrderNotFoundException(String identifier) {
        super("Order not found with ID or code: " + identifier);
    }
}
