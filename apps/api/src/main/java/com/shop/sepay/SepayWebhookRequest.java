package com.shop.sepay;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * SePay transaction webhook payload — only the fields we consume; SePay sends
 * many more (id, gateway, accountNumber, …) and unknown fields are ignored.
 * transferAmount is whole VND ("đồng"); money is stored as cents ×100 (ADR 0003).
 */
public record SepayWebhookRequest(
        @NotBlank String content,
        @NotNull @Positive Long transferAmount,
        String transferType) {
}
