package com.shop.catalog;

/** Variant delete blocked by a cart_items reference (409 VARIANT_IN_USE, ADR 0005). */
public class VariantInUseException extends RuntimeException {

    public VariantInUseException() {
        super("This variant is in a shopper's cart and cannot be deleted — carts expire on their own; retry later");
    }
}
