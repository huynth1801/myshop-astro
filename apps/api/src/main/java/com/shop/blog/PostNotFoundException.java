package com.shop.blog;

import java.util.UUID;

public class PostNotFoundException extends RuntimeException {

    public PostNotFoundException(String slug) {
        super("No post found with slug '" + slug + "'");
    }

    public PostNotFoundException(UUID id) {
        super("No post found with id '" + id + "'");
    }
}
