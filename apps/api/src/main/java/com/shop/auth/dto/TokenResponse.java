package com.shop.auth.dto;

/** Access token for the client; the refresh token lives only in the httpOnly cookie. */
public record TokenResponse(String accessToken, long expiresIn, String email, String name) {
}
