package com.shop.blog.dto;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public record CrawlPostRequest(
        @NotBlank(message = "sourceUrl is required")
        @URL(message = "sourceUrl must be a valid URL")
        String sourceUrl
) {}
