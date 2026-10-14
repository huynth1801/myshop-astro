package com.shop.chat.controller;

import com.shop.chat.service.ChatService;
import com.shop.chat.telegram.TelegramUpdate;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks/telegram")
public class TelegramWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TelegramWebhookController.class);

    private final ChatService chatService;
    private final String expectedSecretToken;

    public TelegramWebhookController(
            ChatService chatService,
            @Value("${app.telegram.secret-token:}") String expectedSecretToken
    ) {
        this.chatService = chatService;
        this.expectedSecretToken = expectedSecretToken != null ? expectedSecretToken.trim() : "";
    }

    @PostMapping
    public ResponseEntity<Map<String, Boolean>> handleWebhook(
            @RequestHeader(name = "X-Telegram-Bot-Api-Secret-Token", required = false) String secretTokenHeader,
            @RequestBody TelegramUpdate update
    ) {
        if (!expectedSecretToken.isEmpty()) {
            if (secretTokenHeader == null || !expectedSecretToken.equals(secretTokenHeader.trim())) {
                log.warn("Unauthorized Telegram webhook attempt: invalid or missing secret token");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("ok", false));
            }
        }

        chatService.handleTelegramUpdate(update);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
