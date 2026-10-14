package com.shop.chat.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramUpdate(
        @JsonProperty("update_id") Long updateId,
        @JsonProperty("message") TelegramMessage message
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TelegramMessage(
            @JsonProperty("message_id") Long messageId,
            @JsonProperty("text") String text,
            @JsonProperty("chat") TelegramChat chat,
            @JsonProperty("reply_to_message") TelegramMessage replyToMessage
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TelegramChat(
            @JsonProperty("id") Long id
    ) {}
}
