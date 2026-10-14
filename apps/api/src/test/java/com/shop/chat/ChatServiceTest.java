package com.shop.chat;

import tools.jackson.databind.ObjectMapper;
import com.shop.chat.dto.ChatConversationResponse;
import com.shop.chat.dto.ChatMessageResponse;
import com.shop.chat.dto.SendChatMessageRequest;
import com.shop.chat.entity.ChatConversation;
import com.shop.chat.entity.ChatMessage;
import com.shop.chat.entity.SenderType;
import com.shop.chat.repository.ChatConversationRepository;
import com.shop.chat.repository.ChatMessageRepository;
import com.shop.chat.service.ChatService;
import com.shop.chat.telegram.TelegramClient;
import com.shop.chat.telegram.TelegramUpdate;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatConversationRepository conversationRepository;

    @Mock
    private ChatMessageRepository messageRepository;

    @Mock
    private TelegramClient telegramClient;

    private ChatService chatService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        chatService = new ChatService(conversationRepository, messageRepository, telegramClient, objectMapper);
    }

    @Test
    void getConversation_whenSessionTokenBlank_returnsEmptyConversationWithNewToken() {
        ChatConversationResponse response = chatService.getConversation(" ", null);

        assertThat(response.sessionToken()).isNotBlank();
        assertThat(response.messages()).isEmpty();
    }

    @Test
    void getConversation_whenNotFound_returnsEmptyConversation() {
        when(conversationRepository.findBySessionToken("token-123")).thenReturn(Optional.empty());

        ChatConversationResponse response = chatService.getConversation("token-123", null);

        assertThat(response.sessionToken()).isEqualTo("token-123");
        assertThat(response.messages()).isEmpty();
    }

    @Test
    void getConversation_whenFound_returnsMessages() {
        ChatConversation conv = new ChatConversation("token-123", null, "Mai", "0912345678");
        conv.setId(UUID.randomUUID());

        ChatMessage msg1 = new ChatMessage(conv, SenderType.CUSTOMER, "Xin chào", null, 101L);
        ChatMessage msg2 = new ChatMessage(conv, SenderType.ADMIN, "Chào bạn, shop có thể giúp gì?", null, 102L);

        when(conversationRepository.findBySessionToken("token-123")).thenReturn(Optional.of(conv));
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId())).thenReturn(List.of(msg1, msg2));

        ChatConversationResponse response = chatService.getConversation("token-123", null);

        assertThat(response.sessionToken()).isEqualTo("token-123");
        assertThat(response.customerName()).isEqualTo("Mai");
        assertThat(response.messages()).hasSize(2);
        assertThat(response.messages().get(0).senderType()).isEqualTo(SenderType.CUSTOMER);
        assertThat(response.messages().get(1).senderType()).isEqualTo(SenderType.ADMIN);
    }

    @Test
    void sendMessage_createsConversationAndForwardsToTelegram() {
        SendChatMessageRequest req = new SendChatMessageRequest(
                "token-abc",
                "Áo này còn size L không?",
                "Lan",
                "0909000111",
                "https://myshop.vn/products/ao-nguc",
                "Áo ngực su đúc",
                "MS-AO-01"
        );

        when(conversationRepository.findBySessionToken("token-abc")).thenReturn(Optional.empty());
        when(conversationRepository.save(any(ChatConversation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(telegramClient.sendMessage(anyString(), any())).thenReturn(9999L);
        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(inv -> inv.getArgument(0));

        ChatMessageResponse response = chatService.sendMessage(req, null);

        assertThat(response.sessionToken()).isEqualTo("token-abc");
        assertThat(response.senderType()).isEqualTo(SenderType.CUSTOMER);
        assertThat(response.content()).isEqualTo("Áo này còn size L không?");
        assertThat(response.metadata()).containsEntry("productTitle", "Áo ngực su đúc");

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(telegramClient).sendMessage(htmlCaptor.capture(), any());
        assertThat(htmlCaptor.getValue()).contains("Lan");
        assertThat(htmlCaptor.getValue()).contains("0909000111");
        assertThat(htmlCaptor.getValue()).contains("Áo ngực su đúc");
        assertThat(htmlCaptor.getValue()).contains("Áo này còn size L không?");
    }

    @Test
    void handleTelegramUpdate_whenReplyingToMessage_savesAdminReply() {
        ChatConversation conv = new ChatConversation("token-xyz", null, "Nam", null);
        conv.setId(UUID.randomUUID());
        conv.setLastMessageAt(Instant.now());

        ChatMessage customerMsg = new ChatMessage(conv, SenderType.CUSTOMER, "Có freeship không ạ?", null, 8888L);

        when(messageRepository.findTopByTelegramMessageId(8888L)).thenReturn(Optional.of(customerMsg));
        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(inv -> inv.getArgument(0));

        TelegramUpdate.TelegramMessage replyMsg = new TelegramUpdate.TelegramMessage(
                9990L,
                "Dạ đơn từ 500k bên mình freeship nha!",
                new TelegramUpdate.TelegramChat(12345L),
                new TelegramUpdate.TelegramMessage(8888L, "Có freeship không ạ?", null, null)
        );
        TelegramUpdate update = new TelegramUpdate(101L, replyMsg);

        boolean handled = chatService.handleTelegramUpdate(update);

        assertThat(handled).isTrue();
        ArgumentCaptor<ChatMessage> msgCaptor = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messageRepository).save(msgCaptor.capture());
        assertThat(msgCaptor.getValue().getSenderType()).isEqualTo(SenderType.ADMIN);
        assertThat(msgCaptor.getValue().getContent()).isEqualTo("Dạ đơn từ 500k bên mình freeship nha!");
        assertThat(msgCaptor.getValue().getConversation().getSessionToken()).isEqualTo("token-xyz");
    }

    @Test
    void handleTelegramUpdate_ignoresBotCommands() {
        TelegramUpdate.TelegramMessage commandMsg = new TelegramUpdate.TelegramMessage(
                1L,
                "/start",
                new TelegramUpdate.TelegramChat(12345L),
                null
        );
        TelegramUpdate update = new TelegramUpdate(102L, commandMsg);

        boolean handled = chatService.handleTelegramUpdate(update);

        assertThat(handled).isFalse();
    }
}
