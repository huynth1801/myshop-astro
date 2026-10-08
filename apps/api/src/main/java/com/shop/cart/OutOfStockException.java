package com.shop.cart;

public class OutOfStockException extends RuntimeException {

    public OutOfStockException(String sku, int available) {
        super("Only " + available + " left in stock for SKU " + sku);
    }
}
