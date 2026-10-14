package com.shop.order;

import com.shop.order.dto.BankInfoDto;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VietQrServiceTest {

    @Test
    void generateQrUrl_producesCorrectFormatAndParameters() {
        VietQrService service = new VietQrService("VCB", "0123456789", "NGUYEN VAN A");

        // 250,000 VND = 25,000,000 cents
        String url = service.generateQrUrl(25_000_000L, "MS-261014-ABCD");

        assertThat(url).startsWith("https://img.vietqr.io/image/VCB-0123456789-compact2.jpg?");
        assertThat(url).contains("amount=250000");
        assertThat(url).contains("addInfo=THANH+TOAN+MS-261014-ABCD");
        assertThat(url).contains("accountName=NGUYEN+VAN+A");
    }

    @Test
    void generateQrUrl_handlesZeroAndNegativeAmount() {
        VietQrService service = new VietQrService("MB", "9999", "SHOP");

        String zeroUrl = service.generateQrUrl(0L, "ORDER-0");
        assertThat(zeroUrl).contains("amount=0");

        String negativeUrl = service.generateQrUrl(-5000L, "ORDER-NEG");
        assertThat(negativeUrl).contains("amount=0");
    }

    @Test
    void getBankInfo_returnsPopulatedDto() {
        VietQrService service = new VietQrService("TCB", "9876543210", "CONG TY TNHH ABC");

        long amountCents = 1_500_000_00L; // 1,500,000 VND
        BankInfoDto info = service.getBankInfo(amountCents, "MS-261014-XYZ1");

        assertThat(info.bankName()).isEqualTo("TCB");
        assertThat(info.bankAccount()).isEqualTo("9876543210");
        assertThat(info.accountHolder()).isEqualTo("CONG TY TNHH ABC");
        assertThat(info.transferContent()).isEqualTo("THANH TOAN MS-261014-XYZ1");
        assertThat(info.amountVnd()).isEqualTo(1_500_000L);
    }

    @Test
    void getters_returnConfiguredValues() {
        VietQrService service = new VietQrService("ACB", "11223344", "CHUS HOP");

        assertThat(service.getBankId()).isEqualTo("ACB");
        assertThat(service.getAccountNo()).isEqualTo("11223344");
        assertThat(service.getAccountName()).isEqualTo("CHUS HOP");
    }
}
