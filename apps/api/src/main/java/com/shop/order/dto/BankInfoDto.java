package com.shop.order.dto;

public record BankInfoDto(
        String bankName,
        String bankAccount,
        String accountHolder,
        String transferContent,
        long amountVnd
) {}
