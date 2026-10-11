package com.shop.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Add an existing image by URL — site-relative "/…" or absolute https?://… (like the seeded ones). */
public record AddImageRequest(
        @NotBlank @Size(max = 1024) @Pattern(regexp = "^(/|https?://).*",
                message = "url must start with / or http(s)://") String url,
        @Size(max = 255) String alt) {
}
