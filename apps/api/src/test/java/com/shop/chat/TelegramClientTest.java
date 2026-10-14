package com.shop.chat;

import tools.jackson.databind.ObjectMapper;
import com.shop.chat.telegram.TelegramClient;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void isConfigured_whenDisabled_returnsFalse() {
        TelegramClient client = new TelegramClient(false, "token", "12345", objectMapper);
        assertThat(client.isConfigured()).isFalse();
    }

    @Test
    void isConfigured_whenTokenOrChatIdBlank_returnsFalse() {
        TelegramClient client1 = new TelegramClient(true, "", "12345", objectMapper);
        assertThat(client1.isConfigured()).isFalse();

        TelegramClient client2 = new TelegramClient(true, "token", "", objectMapper);
        assertThat(client2.isConfigured()).isFalse();
    }

    @Test
    void isConfigured_whenEnabledWithCredentials_returnsTrue() {
        TelegramClient client = new TelegramClient(true, "123:abc", "999", objectMapper);
        assertThat(client.isConfigured()).isTrue();
    }

    @Test
    void sendMessage_whenNotConfigured_returnsNullSafely() {
        TelegramClient client = new TelegramClient(false, "", "", objectMapper);
        Long id = client.sendMessage("Hello", null);
        assertThat(id).isNull();
    }

    @Test
    void getUpdates_whenNotConfigured_returnsEmptyList() {
        TelegramClient client = new TelegramClient(false, "", "", objectMapper);
        assertThat(client.getUpdates(0, 0)).isEmpty();
    }

    @Test
    void parseUpdatesJson_successfullyDeserializesReply() throws Exception {
        String json = """
        [{"update_id":337752747,"message":{"message_id":6,"text":"Dạ có","chat":{"id":1845466828},"reply_to_message":{"message_id":5,"text":"Tin nhắn cũ"}}}]
        """;
        java.util.List<com.shop.chat.telegram.TelegramUpdate> updates = objectMapper.readValue(
                json, new tools.jackson.core.type.TypeReference<java.util.List<com.shop.chat.telegram.TelegramUpdate>>() {}
        );
        assertThat(updates).hasSize(1);
        assertThat(updates.get(0).updateId()).isEqualTo(337752747L);
        assertThat(updates.get(0).message().text()).isEqualTo("Dạ có");
        assertThat(updates.get(0).message().replyToMessage().messageId()).isEqualTo(5L);
    }
}
