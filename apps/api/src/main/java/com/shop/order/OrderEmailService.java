package com.shop.order;

import com.shop.order.dto.BankInfoDto;
import com.shop.order.dto.CustomerAddressDto;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class OrderEmailService {

    private static final Logger log = LoggerFactory.getLogger(OrderEmailService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final JavaMailSender mailSender;
    private final VietQrService vietQrService;
    private final boolean mailEnabled;
    private final String mailFrom;
    private final String storefrontUrl;

    public OrderEmailService(
            @Autowired(required = false) JavaMailSender mailSender,
            VietQrService vietQrService,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:myshop <noreply@myshop.vn>}") String mailFrom,
            @Value("${shop.storefront-url:http://localhost:4321}") String storefrontUrl
    ) {
        this.mailSender = mailSender;
        this.vietQrService = vietQrService;
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
        this.storefrontUrl = storefrontUrl;
    }

    @Async
    public void sendOrderConfirmationEmail(Order order, CustomerAddressDto address) {
        String recipientEmail = null;
        if (address != null && address.email() != null && !address.email().isBlank()) {
            recipientEmail = address.email().trim();
        } else if (order.getShippingAddress() != null && order.getShippingAddress().get("email") != null) {
            recipientEmail = String.valueOf(order.getShippingAddress().get("email")).trim();
        }

        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("Cannot send confirmation email: Order {} has no customer email address", order.getOrderCode());
            return;
        }

        String htmlContent = buildOrderEmailHtml(order, address);

        if (!mailEnabled || mailSender == null) {
            log.info("[MOCK EMAIL] Order confirmation prepared for {} (Order: {}). Live mail sending is disabled (app.mail.enabled=false).",
                    recipientEmail, order.getOrderCode());
            log.debug("[MOCK EMAIL HTML]\n{}", htmlContent);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(mailFrom);
            helper.setTo(recipientEmail);
            helper.setSubject("Xác nhận đơn hàng #" + order.getOrderCode() + " - myshop Boutique");
            helper.setText(htmlContent, true);

            mailSender.send(mimeMessage);
            log.info("Order confirmation email successfully sent to {} for order {}", recipientEmail, order.getOrderCode());
        } catch (Exception e) {
            log.error("Failed to send order confirmation email to {} for order {}: {}",
                    recipientEmail, order.getOrderCode(), e.getMessage(), e);
        }
    }

    public String buildOrderEmailHtml(Order order, CustomerAddressDto address) {
        String customerName = address != null ? address.fullName() : "Quý khách";
        String customerPhone = address != null ? address.phone() : "";
        String fullAddress = formatAddress(address);
        String formattedDate = order.getCreatedAt() != null ? DATE_FORMATTER.format(order.getCreatedAt()) : "";

        StringBuilder itemsHtml = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            long itemTotalCents = item.getUnitPriceCents() * item.getQty();
            String itemImageTag = (item.getImageUrl() != null && !item.getImageUrl().isBlank())
                    ? String.format("<img src=\"%s\" width=\"44\" height=\"44\" style=\"border-radius:6px; object-fit:cover; margin-right:10px; vertical-align:middle;\" alt=\"thumb\" />", item.getImageUrl())
                    : "";

            itemsHtml.append(String.format("""
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 8px; text-align: left; vertical-align: middle;">
                        <div style="display: flex; align-items: center;">
                            %s
                            <div>
                                <div style="font-weight: 600; color: #0f172a; font-size: 13px;">%s</div>
                                <div style="font-size: 11px; color: #64748b; font-family: monospace;">SKU: %s</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 12px 8px; text-align: center; color: #334155; font-size: 13px;">%d</td>
                    <td style="padding: 12px 8px; text-align: right; color: #334155; font-size: 13px;">%s</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #0f172a; font-size: 13px;">%s</td>
                </tr>
                """,
                    itemImageTag,
                    escapeHtml(item.getProductName()),
                    escapeHtml(item.getSku()),
                    item.getQty(),
                    formatVnd(item.getUnitPriceCents()),
                    formatVnd(itemTotalCents)
            ));
        }

        // Payment section
        String paymentSectionHtml = buildPaymentSectionHtml(order);

        // Tracking URL
        String trackingUrl = storefrontUrl + "/orders?code=" + order.getOrderCode();

        return String.format("""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Xác nhận đơn hàng #%s</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
                <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
                    <tr>
                        <td align="center">
                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                                
                                <!-- Brand Header -->
                                <tr>
                                    <td style="background-color: #0f172a; padding: 24px; text-align: center;">
                                        <div style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">myshop boutique</div>
                                        <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Thời trang & Đồ lót cao cấp</div>
                                    </td>
                                </tr>

                                <!-- Status Banner -->
                                <tr>
                                    <td style="padding: 24px 24px 12px 24px; text-align: center;">
                                        <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 600; font-size: 12px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                                            ✓ ĐẶT HÀNG THÀNH CÔNG
                                        </div>
                                        <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 16px 0 6px 0;">Cảm ơn quý khách đã mua sắm!</h1>
                                        <p style="font-size: 13px; color: #64748b; margin: 0;">Đơn hàng của bạn đã được ghi nhận vào hệ thống và đang được xử lý.</p>
                                    </td>
                                </tr>

                                <!-- Order & Customer Info Grid -->
                                <tr>
                                    <td style="padding: 12px 24px;">
                                        <table width="100%%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px;">
                                            <tr>
                                                <td width="50%%" style="vertical-align: top; padding-right: 12px;">
                                                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Thông tin đơn hàng</div>
                                                    <div style="font-size: 13px; color: #0f172a;"><strong>Mã đơn:</strong> <span style="font-family: monospace; color: #2563eb; font-weight: 700;">%s</span></div>
                                                    <div style="font-size: 12px; color: #475569; margin-top: 3px;"><strong>Thời gian:</strong> %s</div>
                                                    <div style="font-size: 12px; color: #475569; margin-top: 3px;"><strong>Trạng thái:</strong> Chờ xác nhận</div>
                                                </td>
                                                <td width="50%%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #e2e8f0;">
                                                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Địa chỉ giao hàng</div>
                                                    <div style="font-size: 13px; font-weight: 600; color: #0f172a;">%s</div>
                                                    <div style="font-size: 12px; color: #475569; margin-top: 2px;">SĐT: %s</div>
                                                    <div style="font-size: 12px; color: #475569; margin-top: 2px;">%s</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Order Items Table -->
                                <tr>
                                    <td style="padding: 12px 24px;">
                                        <table width="100%%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                            <thead>
                                                <tr style="border-bottom: 2px solid #e2e8f0; background-color: #f1f5f9;">
                                                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #475569; text-transform: uppercase;">Sản phẩm</th>
                                                    <th style="padding: 10px 8px; text-align: center; font-size: 11px; color: #475569; text-transform: uppercase;">SL</th>
                                                    <th style="padding: 10px 8px; text-align: right; font-size: 11px; color: #475569; text-transform: uppercase;">Đơn giá</th>
                                                    <th style="padding: 10px 8px; text-align: right; font-size: 11px; color: #475569; text-transform: uppercase;">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                %s
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Totals Summary -->
                                <tr>
                                    <td style="padding: 0 24px 16px 24px;">
                                        <table width="100%%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e2e8f0; padding-top: 12px;">
                                            <tr>
                                                <td style="text-align: right; padding: 4px 8px; font-size: 12px; color: #64748b;">Tạm tính:</td>
                                                <td width="120" style="text-align: right; padding: 4px 8px; font-size: 12px; font-weight: 500; color: #0f172a;">%s</td>
                                            </tr>
                                            %s
                                            <tr>
                                                <td style="text-align: right; padding: 4px 8px; font-size: 12px; color: #64748b;">Phí vận chuyển:</td>
                                                <td width="120" style="text-align: right; padding: 4px 8px; font-size: 12px; font-weight: 500; color: #0f172a;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="text-align: right; padding: 8px 8px; font-size: 14px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">Tổng thanh toán:</td>
                                                <td width="120" style="text-align: right; padding: 8px 8px; font-size: 16px; font-weight: 700; color: #2563eb; border-top: 1px solid #e2e8f0;">%s</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Payment Instructions Box -->
                                <tr>
                                    <td style="padding: 0 24px 20px 24px;">
                                        %s
                                    </td>
                                </tr>

                                <!-- Action Button: Track Order -->
                                <tr>
                                    <td style="padding: 0 24px 24px 24px; text-align: center;">
                                        <a href="%s" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 9999px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                            Tra cứu & Theo dõi đơn hàng trực tuyến →
                                        </a>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                                        <div>Cần hỗ trợ? Vui lòng liên hệ Hotline: <strong>1900 xxxx</strong> hoặc gửi email về <strong>support@myshop.vn</strong></div>
                                        <div style="margin-top: 6px;">© 2026 myshop Boutique. Tất cả các quyền được bảo lưu.</div>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """,
                order.getOrderCode(),
                order.getOrderCode(),
                formattedDate,
                escapeHtml(customerName),
                escapeHtml(customerPhone),
                escapeHtml(fullAddress),
                itemsHtml.toString(),
                formatVnd(order.getSubtotalCents()),
                (order.getDiscountCents() > 0 ? String.format("<tr><td style=\"text-align: right; padding: 4px 8px; font-size: 12px; color: #059669;\">Giảm giá:</td><td style=\"text-align: right; padding: 4px 8px; font-size: 12px; font-weight: 600; color: #059669;\">-%s</td></tr>", formatVnd(order.getDiscountCents())) : ""),
                (order.getShippingCents() == 0 ? "Miễn phí" : formatVnd(order.getShippingCents())),
                formatVnd(order.getTotalCents()),
                paymentSectionHtml,
                trackingUrl
        );
    }

    private String buildPaymentSectionHtml(Order order) {
        if (order.getPaymentMethod() == PaymentMethod.VIETQR) {
            BankInfoDto bankInfo = vietQrService.getBankInfo(order.getTotalCents(), order.getOrderCode());
            String qrUrl = vietQrService.generateQrUrl(order.getTotalCents(), order.getOrderCode());

            return String.format("""
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; text-align: center;">
                    <div style="font-weight: 700; color: #1e40af; font-size: 14px; margin-bottom: 4px;">Hướng dẫn chuyển khoản VietQR</div>
                    <div style="font-size: 12px; color: #3b82f6; margin-bottom: 12px;">Quét mã QR bằng App ngân hàng bất kỳ để thanh toán tự động</div>
                    
                    <div style="background-color: #ffffff; display: inline-block; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <img src="%s" width="200" height="200" style="display: block; margin: 0 auto;" alt="Mã VietQR" />
                    </div>

                    <table width="100%%" cellspacing="0" cellpadding="0" style="margin-top: 12px; font-size: 12px; text-align: left; max-width: 380px; margin-left: auto; margin-right: auto;">
                        <tr><td style="padding: 2px 0; color: #64748b;">Ngân hàng:</td><td style="padding: 2px 0; font-weight: 600; color: #0f172a; text-align: right;">%s</td></tr>
                        <tr><td style="padding: 2px 0; color: #64748b;">Số tài khoản:</td><td style="padding: 2px 0; font-family: monospace; font-weight: 700; color: #0f172a; text-align: right;">%s</td></tr>
                        <tr><td style="padding: 2px 0; color: #64748b;">Chủ tài khoản:</td><td style="padding: 2px 0; font-weight: 600; color: #0f172a; text-align: right;">%s</td></tr>
                        <tr><td style="padding: 2px 0; color: #64748b;">Nội dung CK:</td><td style="padding: 2px 0; font-family: monospace; font-weight: 700; color: #2563eb; text-align: right;">%s</td></tr>
                    </table>

                    <div style="margin-top: 12px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 8px; font-size: 11px; color: #92400e;">
                        ⏱️ <strong>Lưu ý:</strong> Đơn hàng sẽ tự động hủy nếu không hoàn tất thanh toán trong vòng <strong>24 giờ</strong>.
                    </div>
                </div>
                """,
                    qrUrl,
                    escapeHtml(bankInfo.bankName()),
                    escapeHtml(bankInfo.bankAccount()),
                    escapeHtml(bankInfo.accountHolder()),
                    escapeHtml(bankInfo.transferContent())
            );
        } else {
            return String.format("""
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                    <div style="font-weight: 600; color: #0f172a; font-size: 13px;">Thanh toán khi nhận hàng (COD)</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                        Đơn hàng sẽ được nhân viên giao hàng thu tiền mặt tận nơi với tổng số tiền <strong>%s</strong>. Quý khách vui lòng chuẩn bị số tiền tương ứng.
                    </div>
                </div>
                """,
                    formatVnd(order.getTotalCents())
            );
        }
    }

    private String formatAddress(CustomerAddressDto address) {
        if (address == null) return "";
        StringBuilder sb = new StringBuilder();
        if (address.line1() != null) sb.append(address.line1());
        if (address.ward() != null && !address.ward().isBlank()) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(address.ward());
        }
        if (address.district() != null && !address.district().isBlank()) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(address.district());
        }
        if (address.city() != null && !address.city().isBlank()) {
            if (!sb.isEmpty()) sb.append(", ");
            sb.append(address.city());
        }
        return sb.toString();
    }

    public static String formatVnd(long cents) {
        long vnd = cents / 100;
        return String.format(Locale.GERMANY, "%,d ₫", vnd);
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
