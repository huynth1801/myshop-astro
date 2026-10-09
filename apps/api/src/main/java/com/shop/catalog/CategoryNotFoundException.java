package com.shop.catalog;

public class CategoryNotFoundException extends RuntimeException {

    public CategoryNotFoundException(String slug) {
        super("No category with slug '" + slug + "'");
    }
}
