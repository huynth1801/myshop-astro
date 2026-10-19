package com.shop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.order.dto.CustomerAddressDto;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class OrderEmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    private VietQrService vietQrService;

    @BeforeEach
    void setUp() {
        vietQrService = new VietQrService("VCB", "9335208171", "THUYSHOP");
    }

    private CustomerAddressDto sampleAddress() {
        return new CustomerAddressDto(
                "Trần Văn C",
                "0988123456",
                "tranc@example.com",
                "789 Điện Biên Phủ",
                "Hồ Chí Minh",
                "Bình Thạnh",
                "Phường 25",
                "70000",
                "VN"
        );
    }

    private Order createSampleOrder(PaymentMethod method) {
        Order order = Order.create(
                "MS-261014-MAIL",
                UUID.randomUUID(),
                method,
                300_000_00L,
                0L,
                30_000_00L,
                330_000_00L,
                sampleAddress().toMap(),
                "Giao giờ hành chính"
        );
        OrderItem item = OrderItem.create("Áo lót su đúc", "AL-SU-34", 150_000_00L, 2, "http://img/ao.jpg");
        order.addItem(item);
        return order;
    }

    @Test
    void buildOrderEmailHtml_vietQr_contains_order_and_payment_info() {
        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, false, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = createSampleOrder(PaymentMethod.VIETQR);

        String html = service.buildOrderEmailHtml(order, sampleAddress());

        assertThat(html).contains("MS-261014-MAIL");
        assertThat(html).contains("Trần Văn C");
        assertThat(html).contains("Áo lót su đúc");
        assertThat(html).contains("330.000 ₫");
        assertThat(html).contains("Hướng dẫn chuyển khoản VietQR");
        assertThat(html).contains("THANH TOAN MS-261014-MAIL");
        assertThat(html).contains("9335208171");
    }

    @Test
    void buildOrderEmailHtml_cod_contains_cod_instructions() {
        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, false, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = createSampleOrder(PaymentMethod.COD);

        String html = service.buildOrderEmailHtml(order, sampleAddress());

        assertThat(html).contains("Thanh toán khi nhận hàng (COD)");
        assertThat(html).doesNotContain("Hướng dẫn chuyển khoản VietQR");
    }

    @Test
    void sendOrderConfirmationEmail_mockMode_doesNotCallMailSender() {
        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, false, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = createSampleOrder(PaymentMethod.VIETQR);

        service.sendOrderConfirmationEmail(order, sampleAddress());

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendOrderConfirmationEmail_enabledMode_sendsMimeMessage() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, true, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = createSampleOrder(PaymentMethod.VIETQR);

        service.sendOrderConfirmationEmail(order, sampleAddress());

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendOrderConfirmationEmail_swallowsException_whenSendingFails() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        doThrow(new MailSendException("SMTP error")).when(mailSender).send(any(MimeMessage.class));

        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, true, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = createSampleOrder(PaymentMethod.VIETQR);

        // Must not throw exception
        service.sendOrderConfirmationEmail(order, sampleAddress());

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void sendOrderConfirmationEmail_noEmail_skipsSending() {
        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, true, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = createSampleOrder(PaymentMethod.VIETQR);
        CustomerAddressDto addressWithoutEmail = new CustomerAddressDto(
                "No Email", "0912345678", null, "Line 1", "City", null, null, null, "VN"
        );
        Map<String, Object> addrMap = addressWithoutEmail.toMap();
        addrMap.remove("email");

        Order orderWithoutEmail = Order.create(
                "MS-NO-EMAIL", UUID.randomUUID(), PaymentMethod.COD, 100L, 0L, 0L, 100L, addrMap, null
        );

        service.sendOrderConfirmationEmail(orderWithoutEmail, addressWithoutEmail);

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void buildOrderEmailPayload_withLocalProductImage_embedsCidInlineFile() {
        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, false, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = Order.create(
                "MS-IMG-TEST", UUID.randomUUID(), PaymentMethod.COD, 89_000_00L, 0L, 0L, 89_000_00L,
                sampleAddress().toMap(), null
        );
        OrderItem item = OrderItem.create(
                "Set túi 3 quần lót su đúc", "SET3QU-01", 89_000_00L, 1,
                "/images/products/set-3-quan-lot-mat-lanh-1.jpg"
        );
        order.addItem(item);

        OrderEmailService.EmailPayload payload = service.buildOrderEmailPayload(order, sampleAddress());

        assertThat(payload.inlineFiles()).containsKey("prod_img_0");
        assertThat(payload.html()).contains("src=\"cid:prod_img_0\"");
        assertThat(payload.html()).doesNotContain("alt=\"thumb\"");
    }

    @Test
    void buildOrderEmailPayload_withMissingImage_rendersPlaceholderEmoji() {
        OrderEmailService service = new OrderEmailService(
                mailSender, vietQrService, false, "myshop <noreply@myshop.vn>", "http://localhost:4321"
        );
        Order order = Order.create(
                "MS-NO-IMG", UUID.randomUUID(), PaymentMethod.COD, 50_000_00L, 0L, 0L, 50_000_00L,
                sampleAddress().toMap(), null
        );
        OrderItem item = OrderItem.create(
                "Sản phẩm không có ảnh", "NO-IMG-01", 50_000_00L, 1, null
        );
        order.addItem(item);

        OrderEmailService.EmailPayload payload = service.buildOrderEmailPayload(order, sampleAddress());

        assertThat(payload.inlineFiles()).isEmpty();
        assertThat(payload.html()).contains("🛍️");
        assertThat(payload.html()).doesNotContain("alt=\"thumb\"");
    }
}

