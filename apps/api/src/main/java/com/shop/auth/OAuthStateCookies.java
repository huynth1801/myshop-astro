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
 * Short-lived cookies carrying the OAuth state (CSRF check) and the allowlisted
 * return origin between /authorize and /callback — the only two "states" this
 * stateless API ever keeps (ADR 0004). SameSite=Lax survives the top-level
 * redirect chain web → Google → callback.
 */
@Component
public class OAuthStateCookies {

    public static final String STATE_COOKIE = "oauth_state";
    public static final String REDIRECT_COOKIE = "oauth_redirect";

    private static final Duration MAX_AGE = Duration.ofMinutes(10);

    private final boolean secure;

    public OAuthStateCookies(@Value("${shop.cookie.secure:false}") boolean secure) {
        this.secure = secure;
    }

    public void write(HttpServletResponse response, String state, String redirectOrigin) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(STATE_COOKIE, state, MAX_AGE));
        response.addHeader(HttpHeaders.SET_COOKIE, build(REDIRECT_COOKIE, redirectOrigin, MAX_AGE));
    }

    public Optional<String> readState(HttpServletRequest request) {
        return read(request, STATE_COOKIE);
    }

    public Optional<String> readRedirect(HttpServletRequest request) {
        return read(request, REDIRECT_COOKIE);
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(STATE_COOKIE, "", Duration.ZERO));
        response.addHeader(HttpHeaders.SET_COOKIE, build(REDIRECT_COOKIE, "", Duration.ZERO));
    }

    private String build(String name, String value, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .path("/api/v1/auth/oauth") // only sent to the OAuth endpoints
                .sameSite("Lax")
                .maxAge(maxAge)
                .secure(secure)
                .build()
                .toString();
    }

    private static Optional<String> read(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return Optional.ofNullable(cookie.getValue());
            }
        }
        return Optional.empty();
    }
}
