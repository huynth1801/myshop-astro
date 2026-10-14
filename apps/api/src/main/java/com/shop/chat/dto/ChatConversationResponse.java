package com.shop.chat.dto;

import java.util.List;

public record ChatConversationResponse(
        String sessionToken,
        String customerName,
        String customerPhone,
        List<ChatMessageResponse> messages
) {}
