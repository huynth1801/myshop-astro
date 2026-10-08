package com.shop.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * HS256 access (15 min) + refresh (7 days) tokens.
 *
 * Stateless by design (PLAN.md §7): no token store, so refresh tokens cannot
 * be revoked individually — logout clears the cookie. Revisit with a
 * denylist only if the security checklist demands it before launch.
 */
@Component
public class JwtService {

    public record Tokens(String accessToken, String refreshToken, long expiresInSeconds) {
    }

    public record AccessClaims(UUID userId, String email, String name, UserRole role) {
    }

    private final SecretKey key;
    private final Duration accessTtl;
    private final Duration refreshTtl;

    public JwtService(@Value("${shop.auth.jwt-secret}") String secret,
            @Value("${shop.auth.access-token-minutes}") long accessMinutes,
            @Value("${shop.auth.refresh-token-days}") long refreshDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.accessTtl = Duration.ofMinutes(accessMinutes);
        this.refreshTtl = Duration.ofDays(refreshDays);
    }

    /** Decoupled from the User entity so tests (and future callers) need no persisted id. */
    public Tokens issue(UUID userId, String email, String name, UserRole role) {
        Instant now = Instant.now();
        String access = Jwts.builder()
                .subject(userId.toString())
                .claim("typ", "access")
                .claim("email", email)
                .claim("name", name)
                .claim("role", role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(key)
                .compact();
        String refresh = Jwts.builder()
                .subject(userId.toString())
                .claim("typ", "refresh")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTtl)))
                .signWith(key)
                .compact();
        return new Tokens(access, refresh, accessTtl.toSeconds());
    }

    /** @return access-token claims, or empty when missing/invalid/expired/wrong type */
    public Optional<AccessClaims> parseAccessToken(String token) {
        return parse(token, "access").map(claims -> new AccessClaims(
                UUID.fromString(claims.getSubject()),
                claims.get("email", String.class),
                claims.get("name", String.class),
                UserRole.valueOf(claims.get("role", String.class))));
    }

    /** @return user id from a refresh token, or empty when missing/invalid/expired/wrong type */
    public Optional<UUID> parseRefreshToken(String token) {
        return parse(token, "refresh").map(claims -> UUID.fromString(claims.getSubject()));
    }

    private Optional<Claims> parse(String token, String expectedType) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload();
            if (!expectedType.equals(claims.get("typ", String.class))) {
                return Optional.empty();
            }
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
