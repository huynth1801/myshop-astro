package com.shop.catalog;

/** Admin variant create hit a SKU that already exists (409 SKU_TAKEN). */
public class SkuTakenException extends RuntimeException {

    public SkuTakenException(String sku) {
        super("SKU '" + sku + "' is already in use");
    }
}
