package com.shop.chat.service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.shop.chat.dto.ChatConversationResponse;
import com.shop.chat.dto.ChatMessageResponse;
import com.shop.chat.dto.SendChatMessageRequest;
import com.shop.chat.entity.ChatConversation;
import com.shop.chat.entity.ChatMessage;
import com.shop.chat.entity.SenderType;
import com.shop.chat.repository.ChatConversationRepository;
import com.shop.chat.repository.ChatMessageRepository;
import com.shop.chat.telegram.TelegramClient;
import com.shop.chat.telegram.TelegramUpdate;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final TelegramClient telegramClient;
    private final ObjectMapper objectMapper;

    public ChatService(
            ChatConversationRepository conversationRepository,
            ChatMessageRepository messageRepository,
            TelegramClient telegramClient,
            ObjectMapper objectMapper
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.telegramClient = telegramClient;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ChatConversationResponse getConversation(String sessionToken, Instant after) {
        if (sessionToken == null || sessionToken.isBlank()) {
            return new ChatConversationResponse(UUID.randomUUID().toString(), null, null, Collections.emptyList());
        }

        Optional<ChatConversation> convOpt = conversationRepository.findBySessionToken(sessionToken);
        if (convOpt.isEmpty()) {
            return new ChatConversationResponse(sessionToken, null, null, Collections.emptyList());
        }

        ChatConversation conv = convOpt.get();
        List<ChatMessage> entities;
        if (after != null) {
            entities = messageRepository.findByConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(conv.getId(), after);
        } else {
            entities = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId());
        }

        List<ChatMessageResponse> messages = entities.stream()
                .map(msg -> ChatMessageResponse.from(msg, sessionToken, msg.getMetadata()))
                .toList();

        return new ChatConversationResponse(conv.getSessionToken(), conv.getCustomerName(), conv.getCustomerPhone(), messages);
    }

    @Transactional
    public ChatMessageResponse sendMessage(SendChatMessageRequest request, UUID authenticatedUserId) {
        String token = (request.sessionToken() != null && !request.sessionToken().isBlank())
                ? request.sessionToken().trim()
                : UUID.randomUUID().toString();

        ChatConversation conversation = conversationRepository.findBySessionToken(token)
                .orElseGet(() -> {
                    ChatConversation c = new ChatConversation(token, authenticatedUserId, request.customerName(), request.customerPhone());
                    return conversationRepository.save(c);
                });

        if (authenticatedUserId != null && conversation.getUserId() == null) {
            conversation.setUserId(authenticatedUserId);
        }
        if (request.customerName() != null && !request.customerName().isBlank()) {
            conversation.setCustomerName(request.customerName().trim());
        }
        if (request.customerPhone() != null && !request.customerPhone().isBlank()) {
            conversation.setCustomerPhone(request.customerPhone().trim());
        }
        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);

        Map<String, Object> metaMap = new HashMap<>();
        if (request.currentUrl() != null && !request.currentUrl().isBlank()) {
            metaMap.put("currentUrl", request.currentUrl().trim());
        }
        if (request.productTitle() != null && !request.productTitle().isBlank()) {
            metaMap.put("productTitle", request.productTitle().trim());
        }
        if (request.productSku() != null && !request.productSku().isBlank()) {
            metaMap.put("productSku", request.productSku().trim());
        }

        ChatMessage message = new ChatMessage(
                conversation,
                SenderType.CUSTOMER,
                request.content().trim(),
                metaMap.isEmpty() ? null : metaMap,
                null
        );
        ChatMessage saved = messageRepository.save(message);

        // Format and send to Telegram asynchronously so customer web request is never blocked
        String telegramHtml = buildTelegramMessageHtml(conversation, request.content(), metaMap);
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                Long telegramMessageId = telegramClient.sendMessage(telegramHtml, null);
                if (telegramMessageId != null) {
                    saved.setTelegramMessageId(telegramMessageId);
                    messageRepository.save(saved);
                }
            } catch (Exception e) {
                log.warn("Failed to dispatch Telegram message: {}", e.getMessage());
            }
        });

        return ChatMessageResponse.from(saved, token, metaMap);
    }

    @Transactional
    public boolean handleTelegramUpdate(TelegramUpdate update) {
        if (update == null || update.message() == null || update.message().text() == null) {
            return false;
        }

        String text = update.message().text().trim();
        if (text.startsWith("/")) {
            // Ignore bot commands like /start
            return false;
        }

        TelegramUpdate.TelegramMessage message = update.message();
        Long replyToId = message.replyToMessage() != null ? message.replyToMessage().messageId() : null;

        ChatConversation targetConv = null;

        if (replyToId != null) {
            Optional<ChatMessage> original = messageRepository.findTopByTelegramMessageId(replyToId);
            if (original.isPresent()) {
                targetConv = original.get().getConversation();
            }
        }

        if (targetConv == null) {
            // Smart fallback: Check latest active conversation within last 4 hours
            Optional<ChatConversation> latestConv = conversationRepository.findTopByOrderByLastMessageAtDesc();
            if (latestConv.isPresent()) {
                Duration age = Duration.between(latestConv.get().getLastMessageAt(), Instant.now());
                if (age.toHours() < 4) {
                    targetConv = latestConv.get();
                    log.info("Correlated Telegram message to latest active conversation {} (age: {}m)",
                            targetConv.getId(), age.toMinutes());
                }
            }
        }

        if (targetConv == null) {
            log.warn("Unable to correlate Telegram reply (messageId={}, replyToId={}) with any customer conversation",
                    message.messageId(), replyToId);
            return false;
        }

        ChatMessage adminReply = new ChatMessage(
                targetConv,
                SenderType.ADMIN,
                text,
                null,
                message.messageId()
        );
        messageRepository.save(adminReply);

        targetConv.setLastMessageAt(Instant.now());
        conversationRepository.save(targetConv);

        log.info("Saved admin reply from Telegram for conversation session={}", targetConv.getSessionToken());
        return true;
    }

    private String buildTelegramMessageHtml(ChatConversation conv, String content, Map<String, Object> meta) {
        StringBuilder sb = new StringBuilder();
        sb.append("💬 <b>Tin nhắn mới từ khách hàng</b>\n");

        String customerDisplay = (conv.getCustomerName() != null && !conv.getCustomerName().isBlank())
                ? escapeHtml(conv.getCustomerName())
                : "Khách #" + conv.getSessionToken().substring(0, Math.min(8, conv.getSessionToken().length()));
        sb.append("👤 Khách: <b>").append(customerDisplay).append("</b>\n");

        if (conv.getCustomerPhone() != null && !conv.getCustomerPhone().isBlank()) {
            sb.append("📞 SĐT: <code>").append(escapeHtml(conv.getCustomerPhone())).append("</code>\n");
        }

        if (meta.containsKey("productTitle")) {
            sb.append("🛍️ Sản phẩm: <b>").append(escapeHtml(String.valueOf(meta.get("productTitle")))).append("</b>\n");
        }

        if (meta.containsKey("currentUrl")) {
            String url = String.valueOf(meta.get("currentUrl"));
            sb.append("🔗 Trang xem: <a href=\"").append(escapeHtml(url)).append("\">Mở liên kết</a>\n");
        }

        sb.append("────────────────────\n");
        sb.append(escapeHtml(content)).append("\n");
        sb.append("────────────────────\n");
        sb.append("<i>👉 Nhấn Reply tin nhắn này để trả lời khách trực tiếp trên web</i>");

        return sb.toString();
    }

    private Map<String, Object> parseMetadata(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
