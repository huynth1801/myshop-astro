package com.shop.cart;

import java.util.UUID;

public class VariantNotFoundException extends RuntimeException {

    public VariantNotFoundException(UUID variantId) {
        super("No product variant '" + variantId + "'");
    }
}
