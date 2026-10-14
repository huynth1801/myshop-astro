package com.shop.chat.repository;

import com.shop.chat.entity.ChatConversation;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {

    Optional<ChatConversation> findBySessionToken(String sessionToken);

    Optional<ChatConversation> findTopByOrderByLastMessageAtDesc();
}
