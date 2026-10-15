package com.shop.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TurnstileVerifierTest {

    @Test
    void whenSecretIsUnset_bypassesVerification() {
        TurnstileVerifier verifier = new TurnstileVerifier("");
        assertThat(verifier.verify(null, "127.0.0.1")).isTrue();
        assertThat(verifier.verify("some-token", "127.0.0.1")).isTrue();
    }

    @Test
    void whenSecretIsDummy_bypassesVerification() {
        TurnstileVerifier verifier = new TurnstileVerifier("dummy-secret-key");
        assertThat(verifier.verify(null, "127.0.0.1")).isTrue();
    }

    @Test
    void whenSecretIsConfiguredAndTokenIsEmpty_failsValidation() {
        TurnstileVerifier verifier = new TurnstileVerifier("0x4AAAAAAtestsecret");
        assertThat(verifier.verify("", "127.0.0.1")).isFalse();
        assertThat(verifier.verify(null, "127.0.0.1")).isFalse();
    }
}
