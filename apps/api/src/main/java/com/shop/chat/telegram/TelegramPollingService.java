package com.shop.chat.telegram;

import com.shop.chat.service.ChatService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TelegramPollingService {

    private static final Logger log = LoggerFactory.getLogger(TelegramPollingService.class);

    private final TelegramClient telegramClient;
    private final ChatService chatService;
    private final boolean pollingEnabled;
    private long lastUpdateId = 0;

    public TelegramPollingService(
            TelegramClient telegramClient,
            ChatService chatService,
            @Value("${app.telegram.polling-enabled:false}") boolean pollingEnabled
    ) {
        this.telegramClient = telegramClient;
        this.chatService = chatService;
        this.pollingEnabled = pollingEnabled;
    }

    @Scheduled(fixedDelay = 2000, initialDelay = 5000)
    public void pollTelegramUpdates() {
        if (!pollingEnabled || !telegramClient.isConfigured()) {
            return;
        }

        try {
            List<TelegramUpdate> updates = telegramClient.getUpdates(lastUpdateId + 1, 0);
            for (TelegramUpdate update : updates) {
                if (update.updateId() != null && update.updateId() > lastUpdateId) {
                    lastUpdateId = update.updateId();
                }
                chatService.handleTelegramUpdate(update);
            }
        } catch (Exception e) {
            log.debug("Error during Telegram polling (ignorable): {}", e.getMessage());
        }
    }
}
