package com.shop.chat.controller;

import com.shop.auth.AuthPrincipal;
import com.shop.chat.dto.ChatConversationResponse;
import com.shop.chat.dto.ChatMessageResponse;
import com.shop.chat.dto.SendChatMessageRequest;
import com.shop.chat.service.ChatService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/messages")
    public ResponseEntity<ChatConversationResponse> getConversation(
            @RequestParam("sessionToken") String sessionToken,
            @RequestParam(name = "after", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant after
    ) {
        return ResponseEntity.ok(chatService.getConversation(sessionToken, after));
    }

    @PostMapping("/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @Valid @RequestBody SendChatMessageRequest request,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID authenticatedUserId = principal != null ? principal.userId() : null;
        return ResponseEntity.ok(chatService.sendMessage(request, authenticatedUserId));
    }
}
