package com.shop.common.file;

/** Upload rejected (bad type / not a real image) — 400 with a clear message. */
public class InvalidUploadException extends RuntimeException {

    public InvalidUploadException(String message) {
        super(message);
    }
}
