package com.shop.chat;

import com.shop.chat.controller.TelegramWebhookController;
import com.shop.chat.service.ChatService;
import com.shop.chat.telegram.TelegramUpdate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TelegramWebhookControllerTest {

    private final ChatService chatService = mock(ChatService.class);

    @Test
    void handleWebhook_whenSecretMatches_processesUpdateAndReturnsOk() {
        TelegramWebhookController controller = new TelegramWebhookController(chatService, "my-secret-token");
        TelegramUpdate update = new TelegramUpdate(1L, null);

        ResponseEntity<Map<String, Boolean>> response = controller.handleWebhook("my-secret-token", update);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("ok", true);
        verify(chatService).handleTelegramUpdate(update);
    }

    @Test
    void handleWebhook_whenSecretMismatch_returnsForbidden() {
        TelegramWebhookController controller = new TelegramWebhookController(chatService, "my-secret-token");
        TelegramUpdate update = new TelegramUpdate(1L, null);

        ResponseEntity<Map<String, Boolean>> response = controller.handleWebhook("wrong-token", update);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).containsEntry("ok", false);
    }

    @Test
    void handleWebhook_whenNoSecretRequired_processesUpdate() {
        TelegramWebhookController controller = new TelegramWebhookController(chatService, "");
        TelegramUpdate update = new TelegramUpdate(1L, null);

        ResponseEntity<Map<String, Boolean>> response = controller.handleWebhook(null, update);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("ok", true);
        verify(chatService).handleTelegramUpdate(update);
    }
}
