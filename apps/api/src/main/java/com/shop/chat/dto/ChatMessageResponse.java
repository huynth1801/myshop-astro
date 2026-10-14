package com.shop.chat.dto;

import com.shop.chat.entity.ChatMessage;
import com.shop.chat.entity.SenderType;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        String sessionToken,
        SenderType senderType,
        String content,
        Map<String, Object> metadata,
        Instant createdAt
) {
    public static ChatMessageResponse from(ChatMessage msg, String sessionToken, Map<String, Object> parsedMetadata) {
        return new ChatMessageResponse(
                msg.getId(),
                sessionToken,
                msg.getSenderType(),
                msg.getContent(),
                parsedMetadata,
                msg.getCreatedAt()
        );
    }
}
