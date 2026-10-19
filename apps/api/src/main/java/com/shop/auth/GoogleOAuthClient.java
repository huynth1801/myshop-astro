package com.shop.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin Google client: code exchange + userinfo fetch over TLS (ADR 0004).
 * We read identity from the userinfo endpoint instead of validating id_token
 * signatures — equivalent assurance for this flow, no JWKS machinery.
 */
@Component
public class GoogleOAuthClient {

    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

    /** The fields we consume from Google's userinfo response. */
    public record Profile(String subject, String email, Boolean emailVerified, String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TokenResponse(@JsonProperty("access_token") String accessToken) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ProfileResponse(String sub, String email,
            @JsonProperty("email_verified") Boolean emailVerified, String name) {
    }

    private final RestClient rest;

    GoogleOAuthClient(RestClient.Builder builder) {
        this.rest = builder.build();
    }

    /**
     * @throws OAuthExchangeException on any transport/HTTP failure or missing
     *         fields — callers surface a generic auth_error, never detail
     */
    public Profile exchangeCodeForProfile(String code, String redirectUri, String clientId,
            String clientSecret) {
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("code", code);
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);
            form.add("redirect_uri", redirectUri);
            form.add("grant_type", "authorization_code");

            TokenResponse token = rest.post()
                    .uri(TOKEN_ENDPOINT)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TokenResponse.class);
            if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
                throw new OAuthExchangeException();
            }

            ProfileResponse profile = rest.get()
                    .uri(USERINFO_ENDPOINT)
                    .headers(headers -> headers.setBearerAuth(token.accessToken()))
                    .retrieve()
                    .body(ProfileResponse.class);
            if (profile == null || profile.sub() == null || profile.sub().isBlank()) {
                throw new OAuthExchangeException();
            }
            return new Profile(profile.sub(), profile.email(), profile.emailVerified(), profile.name());
        } catch (RestClientException | OAuthExchangeException e) {
            throw new OAuthExchangeException();
        }
    }
}
