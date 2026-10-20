package com.shop.sepay;

import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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

/**
 * SePay.vn transaction webhook (PLAN.md §12). SePay POSTs every incoming bank
 * transaction; SepayPaymentService decides whether it settles an order.
 *
 * Auth: the token from the SePay dashboard arrives in the Authorization header
 * (with or without a "Bearer " prefix) and is compared in constant time.
 * Unlike the Telegram webhook, an UNSET token disables the endpoint (503) —
 * payment events must never be accepted unauthenticated.
 *
 * Always answers 2xx for authorized calls (even "ignored" matches) so SePay
 * does not retry events we deliberately skipped; retries are only useful for
 * transport failures.
 */
@RestController
@RequestMapping("/api/v1/webhooks/sepay")
public class SepayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(SepayWebhookController.class);

    private final SepayPaymentService service;
    private final String apiToken;

    public SepayWebhookController(
            SepayPaymentService service,
            @Value("${app.sepay.api-token:}") String apiToken) {
        this.service = service;
        this.apiToken = apiToken == null ? "" : apiToken.trim();
    }

    @PostMapping
    public ResponseEntity<Object> handle(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SepayWebhookRequest event) {
        if (apiToken.isEmpty()) {
            log.warn("[SePay] Webhook called but SEPAY_API_TOKEN is not configured — rejecting");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("status", "DISABLED", "message", "SePay webhook chưa được cấu hình"));
        }
        if (!tokenMatches(authorization)) {
            log.warn("[SePay] Unauthorized webhook attempt");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("status", "UNAUTHORIZED", "message", "Token không hợp lệ"));
        }
        return ResponseEntity.ok(service.reconcile(event));
    }

    private boolean tokenMatches(String header) {
        if (header == null) {
            return false;
        }
        String presented = header.trim();
        if (presented.regionMatches(true, 0, "Bearer ", 0, 7)) {
            presented = presented.substring(7).trim();
        }
        return MessageDigest.isEqual(
                apiToken.getBytes(StandardCharsets.UTF_8),
                presented.getBytes(StandardCharsets.UTF_8));
    }
}
