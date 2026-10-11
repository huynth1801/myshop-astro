package com.shop.catalog;

import java.util.UUID;

public class ProductNotFoundException extends RuntimeException {

    public ProductNotFoundException(String slug) {
        super("No product with slug '" + slug + "'");
    }

    public ProductNotFoundException(UUID id) {
        super("No product with id '" + id + "'");
    }
}
