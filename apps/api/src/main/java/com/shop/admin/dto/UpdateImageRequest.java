package com.shop.admin.dto;

import jakarta.validation.constraints.Size;

/** Alt-text edit; reordering goes through the dedicated order endpoint. */
public record UpdateImageRequest(@Size(max = 255) String alt) {
}
