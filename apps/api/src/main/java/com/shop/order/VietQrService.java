package com.shop.order;

import com.shop.order.dto.BankInfoDto;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class VietQrService {

    private final String bankId;
    private final String accountNo;
    private final String accountName;

    public VietQrService(
            @Value("${app.payment.vietqr.bank-id}") String bankId,
            @Value("${app.payment.vietqr.account-no}") String accountNo,
            @Value("${app.payment.vietqr.account-name}") String accountName
    ) {
        this.bankId = bankId;
        this.accountNo = accountNo;
        this.accountName = accountName;
    }

    public String generateQrUrl(long amountCents, String orderCode) {
        long amountVnd = Math.max(0, amountCents / 100);
        String transferContent = "THANH TOAN " + orderCode;
        String encodedInfo = URLEncoder.encode(transferContent, StandardCharsets.UTF_8);
        String encodedName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);

        return String.format(
                "https://img.vietqr.io/image/%s-%s-compact2.jpg?amount=%d&addInfo=%s&accountName=%s",
                bankId,
                accountNo,
                amountVnd,
                encodedInfo,
                encodedName
        );
    }

    public BankInfoDto getBankInfo(long amountCents, String orderCode) {
        long amountVnd = Math.max(0, amountCents / 100);
        String transferContent = "THANH TOAN " + orderCode;
        return new BankInfoDto(
                bankId,
                accountNo,
                accountName,
                transferContent,
                amountVnd
        );
    }

    public String getBankId() {
        return bankId;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public String getAccountName() {
        return accountName;
    }
}
