package com.shop.common.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * In-memory Token Bucket rate limiter protecting sensitive API surfaces
 * from brute-force authentication, bot-driven inventory depletion, and message flooding.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final boolean enabled;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private static final int MAX_BUCKETS_CACHE_SIZE = 10_000;

    public RateLimitingFilter(@Value("${shop.security.rate-limiting.enabled:true}") boolean enabled) {
        this.enabled = enabled;
    }

    public RateLimitingFilter() {
        this(true);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        Bandwidth limit = resolveLimit(method, path);
        if (limit != null) {
            String clientIp = resolveClientIp(request);
            String bucketKey = clientIp + ":" + method + ":" + normalizeCategory(path);

            // Guard against unbounded memory growth
            if (buckets.size() > MAX_BUCKETS_CACHE_SIZE) {
                buckets.clear();
            }

            Bucket bucket = buckets.computeIfAbsent(bucketKey, k ->
                    Bucket.builder().addLimit(limit).build()
            );

            if (!bucket.tryConsume(1)) {
                writeRateLimitProblem(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private Bandwidth resolveLimit(String method, String path) {
        if ("POST".equalsIgnoreCase(method)) {
            // Login: 5 requests per minute
            if (path.startsWith("/api/v1/auth/login")) {
                return Bandwidth.classic(5, Refill.greedy(5, Duration.ofMinutes(1)));
            }
            // Register: 3 requests per minute
            if (path.startsWith("/api/v1/auth/register")) {
                return Bandwidth.classic(3, Refill.greedy(3, Duration.ofMinutes(1)));
            }
            // Checkout: 5 requests per minute
            if (path.startsWith("/api/v1/checkout")) {
                return Bandwidth.classic(5, Refill.greedy(5, Duration.ofMinutes(1)));
            }
            // Chat: 15 messages per minute
            if (path.startsWith("/api/v1/chat/messages")) {
                return Bandwidth.classic(15, Refill.greedy(15, Duration.ofMinutes(1)));
            }
        }

        // Orders lookup and cancellation: 30 requests per minute
        if (path.startsWith("/api/v1/orders")) {
            return Bandwidth.classic(30, Refill.greedy(30, Duration.ofMinutes(1)));
        }

        return null;
    }

    private String resolveClientIp(HttpServletRequest request) {
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isBlank()) {
            return cfIp.trim();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private String normalizeCategory(String path) {
        if (path.startsWith("/api/v1/auth/login")) return "auth_login";
        if (path.startsWith("/api/v1/auth/register")) return "auth_register";
        if (path.startsWith("/api/v1/checkout")) return "checkout";
        if (path.startsWith("/api/v1/chat/messages")) return "chat";
        if (path.startsWith("/api/v1/orders")) return "orders";
        return "other";
    }

    private void writeRateLimitProblem(HttpServletResponse response) throws IOException {
        response.setStatus(429);
        response.setHeader("Retry-After", "60");
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(
                "{\"status\":429,\"code\":\"TOO_MANY_REQUESTS\",\"detail\":\"Bạn đang thao tác quá nhanh. Vui lòng đợi 1 phút rồi thử lại.\"}"
        );
    }
}
