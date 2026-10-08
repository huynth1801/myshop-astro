package com.shop.auth;

public class UnauthenticatedException extends RuntimeException {

    public UnauthenticatedException() {
        super("Sign in to access this resource");
    }
}
