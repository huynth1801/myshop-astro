package com.shop.admin.dto;

import jakarta.validation.constraints.Size;

/** Update image url and/or alt-text; reordering goes through the dedicated order endpoint. */
public record UpdateImageRequest(
        @Size(max = 2048) String url,
        @Size(max = 255) String alt) {

    public UpdateImageRequest(String alt) {
        this(null, alt);
    }
}
