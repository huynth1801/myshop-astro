package com.shop.catalog;

import java.util.UUID;

public class CategoryNotFoundException extends RuntimeException {

    public CategoryNotFoundException(String slug) {
        super("No category with slug '" + slug + "'");
    }

    public CategoryNotFoundException(UUID id) {
        super("No category with id '" + id + "'");
    }
}
