package com.shop.catalog;

/** Admin create/update hit a slug that already exists (409 SLUG_TAKEN). */
public class SlugTakenException extends RuntimeException {

    public SlugTakenException(String slug) {
        super("Slug '" + slug + "' is already in use");
    }
}
