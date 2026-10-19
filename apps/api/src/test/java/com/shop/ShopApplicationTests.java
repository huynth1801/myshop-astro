package com.shop;

import com.shop.order.VietQrService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ShopApplicationTests {

	@Autowired
	private VietQrService vietQrService;

	@Test
	void contextLoads() {
		assertThat(vietQrService).isNotNull();
		assertThat(vietQrService.getBankId()).isNotBlank();
		assertThat(vietQrService.getAccountNo()).isNotBlank();
		assertThat(vietQrService.getAccountName()).isNotBlank();
	}

}
