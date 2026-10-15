package com.shop.common.security;

public class BotDetectedException extends RuntimeException {
    public BotDetectedException(String message) {
        super(message);
    }
}
