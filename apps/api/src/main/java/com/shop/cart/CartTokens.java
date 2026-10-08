package com.shop.cart;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * cart_token cookie. httpOnly: only the API needs to read it; the browser just
 * echoes it back. SameSite=Lax works because web (4321) and API (8080) are the
 * same site on localhost and will share a registrable domain in production.
 */
@Component
public class CartTokens {

    public static final String COOKIE_NAME = "cart_token";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration MAX_AGE = Duration.ofDays(30);

    private final boolean secure;

    public CartTokens(@Value("${shop.cookie.secure:false}") boolean secure) {
        this.secure = secure;
    }

    public Optional<String> read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return Optional.ofNullable(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    public void write(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, token)
                .httpOnly(true)
                .path("/")
                .sameSite("Lax")
                .maxAge(MAX_AGE)
                .secure(secure)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    static String newToken() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
