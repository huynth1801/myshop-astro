package com.shop.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "test-secret-that-is-long-enough-0123456789";
    private static final UUID USER_ID = UUID.randomUUID();

    private JwtService.Tokens issue(JwtService jwt) {
        return jwt.issue(USER_ID, "demo@example.com", "Demo User", UserRole.CUSTOMER);
    }

    @Test
    void issuedAccessTokenRoundTripsClaims() {
        JwtService jwt = new JwtService(SECRET, 15, 7);

        JwtService.AccessClaims claims = jwt.parseAccessToken(issue(jwt).accessToken()).orElseThrow();

        assertThat(claims.userId()).isEqualTo(USER_ID);
        assertThat(claims.email()).isEqualTo("demo@example.com");
        assertThat(claims.name()).isEqualTo("Demo User");
        assertThat(claims.role()).isEqualTo(UserRole.CUSTOMER);
    }

    @Test
    void refreshTokenIsNotAcceptedAsAccessTokenAndViceVersa() {
        JwtService jwt = new JwtService(SECRET, 15, 7);
        JwtService.Tokens tokens = issue(jwt);

        assertThat(jwt.parseAccessToken(tokens.refreshToken())).isEmpty();
        assertThat(jwt.parseRefreshToken(tokens.accessToken())).isEmpty();
    }

    @Test
    void refreshTokenYieldsUserId() {
        JwtService jwt = new JwtService(SECRET, 15, 7);

        assertThat(jwt.parseRefreshToken(issue(jwt).refreshToken())).contains(USER_ID);
    }

    @Test
    void tamperedTokenIsRejected() {
        JwtService jwt = new JwtService(SECRET, 15, 7);
        String token = issue(jwt).accessToken() + "tamper";

        assertThat(jwt.parseAccessToken(token)).isEmpty();
    }

    @Test
    void tokenSignedWithDifferentSecretIsRejected() {
        JwtService issuer = new JwtService(SECRET, 15, 7);
        JwtService other = new JwtService("another-secret-that-is-long-enough-0123456789", 15, 7);

        String token = issue(issuer).accessToken();

        assertThat(other.parseAccessToken(token)).isEmpty();
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService jwt = new JwtService(SECRET, -1, 7); // access already expired at issue

        assertThat(jwt.parseAccessToken(issue(jwt).accessToken())).isEmpty();
    }
}
