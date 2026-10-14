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
}
