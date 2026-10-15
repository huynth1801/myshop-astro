package com.shop.common.security;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Verifies Cloudflare Turnstile CAPTCHA tokens against Cloudflare Siteverify API.
 * If turnstile-secret is empty or dummy, bypasses verification (for local dev / tests).
 */
@Component
public class TurnstileVerifier {

    private static final Logger log = LoggerFactory.getLogger(TurnstileVerifier.class);
    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final String secretKey;
    private final RestClient restClient;

    public TurnstileVerifier(@Value("${shop.security.turnstile-secret:}") String secretKey) {
        this.secretKey = secretKey;
        this.restClient = RestClient.create();
    }

    public boolean verify(String token, String remoteIp) {
        // Disabled when secret is unset or set to dummy test values
        if (secretKey == null || secretKey.isBlank() || secretKey.startsWith("dummy")) {
            return true;
        }

        if (token == null || token.isBlank()) {
            log.warn("Turnstile verification failed: missing token");
            return false;
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("secret", secretKey);
        body.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            body.add("remoteip", remoteIp);
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(VERIFY_URL)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            boolean success = response != null && Boolean.TRUE.equals(response.get("success"));
            if (!success) {
                log.warn("Cloudflare Turnstile token validation failed: response={}", response);
            }
            return success;
        } catch (Exception e) {
            log.error("Error communicating with Cloudflare Turnstile API", e);
            return false;
        }
    }
}
