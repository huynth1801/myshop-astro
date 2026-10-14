package com.shop.chat;

import com.shop.auth.AuthPrincipal;
import com.shop.chat.controller.ChatController;
import com.shop.chat.dto.ChatConversationResponse;
import com.shop.chat.dto.ChatMessageResponse;
import com.shop.chat.dto.SendChatMessageRequest;
import com.shop.chat.entity.SenderType;
import com.shop.chat.service.ChatService;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatControllerTest {

    private final ChatService chatService = mock(ChatService.class);
    private final ChatController controller = new ChatController(chatService);

    @Test
    void getConversation_delegatesToService() {
        ChatConversationResponse expected = new ChatConversationResponse("tok-1", "Lan", null, Collections.emptyList());
        when(chatService.getConversation("tok-1", null)).thenReturn(expected);

        ResponseEntity<ChatConversationResponse> response = controller.getConversation("tok-1", null);

        assertThat(response.getBody()).isSameAs(expected);
    }

    @Test
    void sendMessage_delegatesToServiceWithAuthenticatedUser() {
        SendChatMessageRequest req = new SendChatMessageRequest("tok-1", "Alo shop", "Lan", null, null, null, null);
        UUID userId = UUID.randomUUID();
        AuthPrincipal principal = new AuthPrincipal(userId, "lan@gmail.com", "Lan", com.shop.auth.UserRole.CUSTOMER);

        ChatMessageResponse expected = new ChatMessageResponse(UUID.randomUUID(), "tok-1", SenderType.CUSTOMER, "Alo shop", Map.of(), Instant.now());
        when(chatService.sendMessage(eq(req), eq(userId))).thenReturn(expected);

        ResponseEntity<ChatMessageResponse> response = controller.sendMessage(req, principal);

        assertThat(response.getBody()).isSameAs(expected);
    }
}
