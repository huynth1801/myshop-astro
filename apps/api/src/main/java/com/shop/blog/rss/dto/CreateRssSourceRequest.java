package com.shop.blog.rss.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

public record CreateRssSourceRequest(
        @NotBlank(message = "Tên nguồn RSS không được để trống")
        @Size(max = 255)
        String name,

        @NotBlank(message = "URL nguồn RSS không được để trống")
        @Size(max = 2048)
        @URL(message = "URL nguồn RSS không đúng định dạng")
        String url,

        @Size(max = 100)
        String category,

        Boolean isActive
) {
    public boolean active() {
        return isActive == null || isActive;
    }
}
