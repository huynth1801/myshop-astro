package com.shop.auth;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** OAuth knobs (application.yml, shop.auth.oauth.*) — see ADR 0004. */
@Component
public class OAuthProperties {

    private final String googleClientId;
    private final String googleClientSecret;
    private final List<String> allowedRedirectOrigins;

    public OAuthProperties(
            @Value("${shop.auth.oauth.google.client-id:}") String googleClientId,
            @Value("${shop.auth.oauth.google.client-secret:}") String googleClientSecret,
            @Value("${shop.auth.oauth.allowed-redirect-origins}") List<String> allowedRedirectOrigins) {
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
        this.allowedRedirectOrigins = List.copyOf(allowedRedirectOrigins);
    }

    /** Empty credentials keep the app bootable (CI, new devs) — Google is off then. */
    public boolean googleConfigured() {
        return !googleClientId.isBlank() && !googleClientSecret.isBlank();
    }

    public String googleClientId() {
        return googleClientId;
    }

    public String googleClientSecret() {
        return googleClientSecret;
    }

    /** Only allowlisted storefront origins may receive the post-login redirect. */
    public boolean isAllowedRedirectOrigin(String origin) {
        return allowedRedirectOrigins.contains(origin);
    }

    public String fallbackRedirectOrigin() {
        return allowedRedirectOrigins.get(0);
    }
}
