package com.shop.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class GoogleOAuthClientTest {

    private static final String CALLBACK = "http://localhost:8080/api/v1/auth/oauth/google/callback";

    private MockRestServiceServer server;
    private GoogleOAuthClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new GoogleOAuthClient(builder);
    }

    @Test
    void exchangesCodeForTokenThenLoadsProfile() {
        server.expect(requestTo("https://oauth2.googleapis.com/token"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"access_token\":\"ya29.a0\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://openidconnect.googleapis.com/v1/userinfo"))
                .andRespond(withSuccess(
                        "{\"sub\":\"g-123\",\"email\":\"me@example.com\",\"email_verified\":true,\"name\":\"Me\"}",
                        MediaType.APPLICATION_JSON));

        GoogleOAuthClient.Profile profile =
                client.exchangeCodeForProfile("code-1", CALLBACK, "id", "secret");

        assertThat(profile.subject()).isEqualTo("g-123");
        assertThat(profile.email()).isEqualTo("me@example.com");
        assertThat(profile.emailVerified()).isTrue();
        assertThat(profile.name()).isEqualTo("Me");
        server.verify();
    }

    @Test
    void failsWhenTokenResponseHasNoAccessToken() {
        server.expect(requestTo("https://oauth2.googleapis.com/token"))
                .andRespond(withSuccess("{\"token_type\":\"Bearer\"}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.exchangeCodeForProfile("code-1", CALLBACK, "id", "secret"))
                .isInstanceOf(OAuthExchangeException.class);
    }

    @Test
    void failsWhenGoogleRejectsTheCode() {
        server.expect(requestTo("https://oauth2.googleapis.com/token"))
                .andRespond(withServerError());

        assertThatThrownBy(() -> client.exchangeCodeForProfile("bad-code", CALLBACK, "id", "secret"))
                .isInstanceOf(OAuthExchangeException.class);
    }
}
