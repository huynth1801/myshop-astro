package com.shop.catalog;

import java.util.UUID;

/** Admin variant lookup by id failed (404 VARIANT_NOT_FOUND). */
public class VariantNotFoundException extends RuntimeException {

    public VariantNotFoundException(UUID id) {
        super("No variant with id '" + id + "'");
    }
}
