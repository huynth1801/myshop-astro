package com.shop.catalog;

import java.util.UUID;

/** Admin image lookup scoped to a product failed (404 IMAGE_NOT_FOUND). */
public class ImageNotFoundException extends RuntimeException {

    public ImageNotFoundException(UUID imageId) {
        super("No image with id '" + imageId + "' on this product");
    }
}
