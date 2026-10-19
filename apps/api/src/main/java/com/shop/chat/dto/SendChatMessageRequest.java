package com.shop.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendChatMessageRequest(
        @Size(max = 128) String sessionToken,
        @NotBlank(message = "Message content is required")
        @Size(max = 2000, message = "Message must not exceed 2000 characters")
        String content,
        @Size(max = 255) String customerName,
        @Size(max = 32) String customerPhone,
        @Size(max = 2048) String currentUrl,
        @Size(max = 255) String productTitle,
        @Size(max = 64) String productSku
) {}
