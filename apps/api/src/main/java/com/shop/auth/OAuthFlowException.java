package com.shop.auth;

/**
 * OAuth failure that the controller translates into a redirect back to the
 * storefront with ?auth_error=&lt;code&gt; (ADR 0004) — the browser never sees JSON.
 */
class OAuthFlowException extends RuntimeException {

    private final String errorCode;

    OAuthFlowException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }

    String errorCode() {
        return errorCode;
    }
}
