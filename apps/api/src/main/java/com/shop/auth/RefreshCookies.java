package com.shop.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * refresh_token cookie — httpOnly (JS can never read it), scoped to /api/v1/auth
 * so the browser only sends it to auth endpoints.
 */
@Component
public class RefreshCookies {

    public static final String NAME = "refresh_token";

    private final boolean secure;

    public RefreshCookies(@Value("${shop.cookie.secure:false}") boolean secure) {
        this.secure = secure;
    }

    public Optional<String> read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (NAME.equals(cookie.getName())) {
                return Optional.ofNullable(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    public void write(HttpServletResponse response, String refreshToken, Duration maxAge) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(maxAge, refreshToken));
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(Duration.ZERO, ""));
    }

    private String build(Duration maxAge, String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .path("/api/v1/auth")
                .sameSite("Lax")
                .maxAge(maxAge)
                .secure(secure)
                .build()
                .toString();
    }
}
