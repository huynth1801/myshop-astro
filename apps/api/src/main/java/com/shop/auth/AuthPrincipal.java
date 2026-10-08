package com.shop.auth;

import java.util.UUID;

/** Security principal carried by a validated access token. */
public record AuthPrincipal(UUID userId, String email, String name, UserRole role) {
}
