package com.shop.chat.telegram;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TelegramClient {

    private static final Logger log = LoggerFactory.getLogger(TelegramClient.class);
    private static final String TELEGRAM_API_BASE = "https://api.telegram.org/bot";

    private final boolean enabled;
    private final String botToken;
    private final String chatId;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TelegramClient(
            @Value("${app.telegram.enabled:false}") boolean enabled,
            @Value("${app.telegram.bot-token:}") String botToken,
            @Value("${app.telegram.chat-id:}") String chatId,
            ObjectMapper objectMapper
    ) {
        this.enabled = enabled;
        this.botToken = botToken != null ? botToken.trim() : "";
        this.chatId = chatId != null ? chatId.trim() : "";
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    public boolean isConfigured() {
        return enabled && !botToken.isBlank() && !chatId.isBlank();
    }

    public Long sendMessage(String htmlText, Long replyToMessageId) {
        if (!isConfigured()) {
            log.info("Telegram notifications skipped (enabled={}, hasToken={}, hasChatId={})",
                    enabled, !botToken.isBlank(), !chatId.isBlank());
            return null;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("chat_id", chatId);
            payload.put("text", htmlText);
            payload.put("parse_mode", "HTML");
            if (replyToMessageId != null) {
                payload.put("reply_to_message_id", replyToMessageId);
            }

            String jsonBody = objectMapper.writeValueAsString(payload);
            String url = TELEGRAM_API_BASE + botToken + "/sendMessage";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(20))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.path("ok").asBoolean()) {
                    long msgId = root.path("result").path("message_id").asLong();
                    log.info("Telegram notification sent successfully (message_id={})", msgId);
                    return msgId;
                }
            }
            log.warn("Telegram sendMessage failed with status {}: {}", response.statusCode(), response.body());
        } catch (Exception e) {
            log.error("Failed to send Telegram message: {}", e.getMessage());
        }
        return null;
    }

    public List<TelegramUpdate> getUpdates(long offset, int timeoutSeconds) {
        if (!isConfigured()) {
            return Collections.emptyList();
        }

        try {
            String url = String.format("%s%s/getUpdates?offset=%d&timeout=%d&allowed_updates=[\"message\"]",
                    TELEGRAM_API_BASE, botToken, offset, timeoutSeconds);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(timeoutSeconds + 5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if (root.path("ok").asBoolean()) {
                    JsonNode resultNode = root.path("result");
                    return objectMapper.convertValue(resultNode, new TypeReference<List<TelegramUpdate>>() {});
                }
            }
            log.warn("Telegram getUpdates returned status {}: {}", response.statusCode(), response.body());
        } catch (Exception e) {
            log.debug("Telegram getUpdates error (ignorable during network glitches): {}", e.getMessage());
        }
        return Collections.emptyList();
    }
}
