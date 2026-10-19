package com.shop.catalog;

import java.util.UUID;

/** Reorder request ids do not match the product's image set exactly (409). */
public class ImageSetMismatchException extends RuntimeException {

    public ImageSetMismatchException(UUID productId) {
        super("imageIds must list every image of product '" + productId + "' exactly once");
    }
}
