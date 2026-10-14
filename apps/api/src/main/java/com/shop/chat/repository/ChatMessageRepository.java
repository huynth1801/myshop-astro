package com.shop.chat.repository;

import com.shop.chat.entity.ChatMessage;
import com.shop.chat.entity.SenderType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    List<ChatMessage> findByConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID conversationId, Instant after);

    Optional<ChatMessage> findTopByTelegramMessageId(Long telegramMessageId);

    Optional<ChatMessage> findTopByConversationIdAndSenderTypeOrderByCreatedAtDesc(UUID conversationId, SenderType senderType);
}
