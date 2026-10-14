package com.shop.order;

import com.shop.order.dto.BankInfoDto;
import com.shop.order.dto.CustomerAddressDto;
import jakarta.mail.internet.MimeMessage;
import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class OrderEmailService {

    private static final Logger log = LoggerFactory.getLogger(OrderEmailService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private static final List<String> CANDIDATE_IMAGE_DIRS = List.of(
            "apps/web/public",
            "../web/public",
            "../../apps/web/public",
            "apps/web/dist/client",
            "../web/dist/client",
            "data/uploads",
            "apps/api/data/uploads",
            "../data/uploads",
            "public",
            "./"
    );

    private final JavaMailSender mailSender;
    private final VietQrService vietQrService;
    private final boolean mailEnabled;
    private final String mailFrom;
    private final String storefrontUrl;

    public record EmailPayload(
            String html,
            Map<String, File> inlineFiles,
            Map<String, byte[]> inlineBytes
    ) {}

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

        EmailPayload payload = buildOrderEmailPayload(order, address);

        if (!mailEnabled || mailSender == null) {
            log.info("[MOCK EMAIL] Order confirmation prepared for {} (Order: {}). Live mail sending is disabled (app.mail.enabled=false).",
                    recipientEmail, order.getOrderCode());
            log.debug("[MOCK EMAIL HTML]\n{}", payload.html());
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(mailFrom);
            helper.setTo(recipientEmail);
            helper.setSubject("myshop Boutique: Xác nhận đơn hàng #" + order.getOrderCode() + " của bạn");
            helper.setText(payload.html(), true);

            // Attach local files as inline CID resources
            for (Map.Entry<String, File> entry : payload.inlineFiles().entrySet()) {
                try {
                    helper.addInline(entry.getKey(), entry.getValue());
                } catch (Exception ex) {
                    log.warn("Failed to attach inline image {}: {}", entry.getKey(), ex.getMessage());
                }
            }

            // Attach byte arrays (e.g. downloaded VietQR code)
            for (Map.Entry<String, byte[]> entry : payload.inlineBytes().entrySet()) {
                try {
                    helper.addInline(entry.getKey(), new ByteArrayResource(entry.getValue()), "image/jpeg");
                } catch (Exception ex) {
                    log.warn("Failed to attach inline byte image {}: {}", entry.getKey(), ex.getMessage());
                }
            }

            mailSender.send(mimeMessage);
            log.info("Order confirmation email successfully sent to {} for order {}", recipientEmail, order.getOrderCode());
        } catch (Exception e) {
            log.error("Failed to send order confirmation email to {} for order {}: {}",
                    recipientEmail, order.getOrderCode(), e.getMessage(), e);
        }
    }

    public String buildOrderEmailHtml(Order order, CustomerAddressDto address) {
        return buildOrderEmailPayload(order, address).html();
    }

    public EmailPayload buildOrderEmailPayload(Order order, CustomerAddressDto address) {
        String customerName = address != null && address.fullName() != null && !address.fullName().isBlank()
                ? address.fullName().trim()
                : "bạn";
        String customerPhone = address != null && address.phone() != null ? address.phone().trim() : "";
        String fullAddress = formatAddress(address);
        String formattedDate = order.getCreatedAt() != null ? DATE_FORMATTER.format(order.getCreatedAt()) : "";
        String customerNote = order.getCustomerNote() != null && !order.getCustomerNote().isBlank()
                ? order.getCustomerNote().trim()
                : null;

        Map<String, File> inlineFiles = new LinkedHashMap<>();
        Map<String, byte[]> inlineBytes = new LinkedHashMap<>();

        StringBuilder itemsHtml = new StringBuilder();
        int itemIndex = 0;
        for (OrderItem item : order.getItems()) {
            long itemTotalCents = item.getUnitPriceCents() * item.getQty();
            String rawImgUrl = item.getImageUrl();

            String imageHtml;
            File localImgFile = resolveLocalImageFile(rawImgUrl);
            if (localImgFile != null) {
                String cid = "prod_img_" + itemIndex;
                inlineFiles.put(cid, localImgFile);
                imageHtml = String.format(
                        "<img src=\"cid:%s\" width=\"56\" height=\"56\" style=\"width:56px; height:56px; border-radius:8px; object-fit:cover; border:1px solid #ede9e2; display:block;\" alt=\"%s\" />",
                        cid, escapeHtml(item.getProductName())
                );
            } else if (rawImgUrl != null && (rawImgUrl.startsWith("http://") || rawImgUrl.startsWith("https://"))
                    && !rawImgUrl.contains("localhost") && !rawImgUrl.contains("127.0.0.1")) {
                imageHtml = String.format(
                        "<img src=\"%s\" width=\"56\" height=\"56\" style=\"width:56px; height:56px; border-radius:8px; object-fit:cover; border:1px solid #ede9e2; display:block;\" alt=\"%s\" />",
                        escapeHtml(rawImgUrl), escapeHtml(item.getProductName())
                );
            } else {
                imageHtml = """
                    <table width="56" height="56" cellspacing="0" cellpadding="0" style="width:56px; height:56px; border-radius:8px; background-color:#f5f3ef; border:1px solid #ede9e2; text-align:center;">
                        <tr><td align="center" valign="middle" style="font-size:22px; line-height:1;">🛍️</td></tr>
                    </table>
                    """;
            }

            String unitPriceNote = item.getQty() > 1
                    ? String.format("<div style=\"font-size:11px; color:#a8a29e; margin-top:2px;\">(%s / cái)</div>", formatVnd(item.getUnitPriceCents()))
                    : "";

            itemsHtml.append(String.format("""
                <table width="100%%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #ede9e2;">
                    <tr>
                        <td width="64" valign="middle" style="padding-right: 12px;">
                            %s
                        </td>
                        <td valign="middle" style="text-align: left;">
                            <div style="font-size: 13px; font-weight: 600; color: #292524; line-height: 1.4;">%s</div>
                            <div style="font-size: 11px; color: #a8a29e; margin-top: 2px;">Mã SKU: %s</div>
                            <div style="font-size: 12px; color: #78716c; margin-top: 2px;">Số lượng: <strong>%d</strong></div>
                        </td>
                        <td valign="middle" style="text-align: right; white-space: nowrap;">
                            <div style="font-size: 14px; font-weight: 600; color: #292524;">%s</div>
                            %s
                        </td>
                    </tr>
                </table>
                """,
                    imageHtml,
                    escapeHtml(item.getProductName()),
                    escapeHtml(item.getSku()),
                    item.getQty(),
                    formatVnd(itemTotalCents),
                    unitPriceNote
            ));
            itemIndex++;
        }

        // Payment section
        String paymentSectionHtml = buildPaymentSectionHtml(order, inlineBytes);

        // Tracking URL
        String trackingUrl = storefrontUrl + "/orders?code=" + order.getOrderCode();

        // Customer note HTML block
        String noteBlockHtml = customerNote != null
                ? String.format("<div style=\"margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ede9e2; font-size: 12px; color: #78716c;\"><strong>Ghi chú đơn hàng:</strong> %s</div>", escapeHtml(customerNote))
                : "";

        String html = String.format("""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>myshop Boutique - Đơn hàng #%s</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f9f8f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #292524; line-height: 1.6;">
                <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9f8f6; padding: 32px 12px;">
                    <tr>
                        <td align="center">
                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #ebe8e2; box-shadow: 0 4px 16px -2px rgba(40, 30, 20, 0.04);">
                                
                                <!-- Elegant Boutique Header -->
                                <tr>
                                    <td style="background-color: #ffffff; padding: 28px 24px 20px 24px; text-align: center; border-bottom: 1px solid #f0ede6;">
                                        <div style="font-family: 'Playfair Display', Georgia, -apple-system, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.16em; color: #292524; text-transform: uppercase;">
                                            myshop boutique
                                        </div>
                                        <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #a8a29e; margin-top: 4px;">
                                            Thời trang & Đồ lót cao cấp
                                        </div>
                                    </td>
                                </tr>

                                <!-- Warm Personalized Greeting -->
                                <tr>
                                    <td style="padding: 24px 28px 12px 28px;">
                                        <p style="font-size: 16px; font-weight: 600; color: #292524; margin: 0 0 10px 0;">
                                            Chào %s,
                                        </p>
                                        <p style="font-size: 14px; line-height: 1.6; color: #57534e; margin: 0 0 8px 0;">
                                            Cảm ơn bạn đã lựa chọn mua sắm tại <strong>myshop Boutique</strong>! Tụi mình đã nhận được đơn hàng và đang tiến hành kiểm tra, đóng gói cẩn thận để gửi đến bạn sớm nhất.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Order Code & Time Bar -->
                                <tr>
                                    <td style="padding: 0 28px 16px 28px;">
                                        <table width="100%%" cellspacing="0" cellpadding="0" style="background-color: #faf9f6; border-radius: 8px; padding: 8px 14px; font-size: 12px;">
                                            <tr>
                                                <td style="color: #78716c;">
                                                    Mã đơn hàng: <strong style="color: #292524; font-family: monospace; font-size: 13px;">#%s</strong>
                                                </td>
                                                <td style="text-align: right; color: #a8a29e;">
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Shipping Address Card -->
                                <tr>
                                    <td style="padding: 0 28px 16px 28px;">
                                        <div style="background-color: #faf9f6; border: 1px solid #ede9e2; border-radius: 12px; padding: 14px 18px;">
                                            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #a8a29e; margin-bottom: 6px;">
                                                Địa chỉ giao hàng
                                            </div>
                                            <div style="font-size: 14px; font-weight: 600; color: #292524;">
                                                %s %s
                                            </div>
                                            <div style="font-size: 13px; color: #57534e; margin-top: 2px;">
                                                %s
                                            </div>
                                            %s
                                        </div>
                                    </td>
                                </tr>

                                <!-- Product Items -->
                                <tr>
                                    <td style="padding: 8px 28px 4px 28px;">
                                        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #a8a29e; margin-bottom: 12px;">
                                            Kiện hàng của bạn
                                        </div>
                                        %s
                                    </td>
                                </tr>

                                <!-- Financial Breakdown -->
                                <tr>
                                    <td style="padding: 8px 28px 20px 28px;">
                                        <table width="100%%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                                            <tr>
                                                <td style="padding: 4px 0; color: #78716c;">Tạm tính:</td>
                                                <td style="padding: 4px 0; text-align: right; color: #292524; font-weight: 500;">%s</td>
                                            </tr>
                                            %s
                                            <tr>
                                                <td style="padding: 4px 0; color: #78716c;">Phí vận chuyển:</td>
                                                <td style="padding: 4px 0; text-align: right; color: #292524; font-weight: 500;">%s</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0 0 0; font-size: 14px; font-weight: 700; color: #292524; border-top: 1px solid #ede9e2;">
                                                    Tổng thanh toán:
                                                </td>
                                                <td style="padding: 12px 0 0 0; text-align: right; font-size: 17px; font-weight: 700; color: #78350f; border-top: 1px solid #ede9e2;">
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Payment Instructions Card -->
                                <tr>
                                    <td style="padding: 0 28px 20px 28px;">
                                        %s
                                    </td>
                                </tr>

                                <!-- Track Order Button -->
                                <tr>
                                    <td style="padding: 0 28px 24px 28px; text-align: center;">
                                        <a href="%s" style="display: inline-block; background-color: #292524; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 9999px; letter-spacing: 0.02em;">
                                            Tra cứu & Theo dõi đơn hàng trực tuyến →
                                        </a>
                                    </td>
                                </tr>

                                <!-- Warm Human Note & Sign-off -->
                                <tr>
                                    <td style="padding: 0 28px 24px 28px;">
                                        <div style="padding-top: 18px; border-top: 1px dashed #e7e5e0; font-size: 13px; color: #57534e; line-height: 1.6;">
                                            <p style="margin: 0 0 8px 0;">
                                                Nếu bạn cần thay đổi địa chỉ nhận hàng, đổi size hoặc có bất kỳ câu hỏi nào về sản phẩm, đừng ngần ngại <strong>trả lời trực tiếp vào email này</strong> hoặc nhắn qua Zalo/Hotline bên dưới nhé. Tụi mình luôn sẵn sàng hỗ trợ bạn.
                                            </p>
                                            <p style="margin: 0 0 12px 0;">Chúc bạn luôn rạng rỡ và có trải nghiệm thật tuyệt vời cùng myshop!</p>
                                            <div style="color: #292524; font-weight: 600;">
                                                Thân mến,<br/>
                                                <span style="font-weight: 400; color: #78716c;">Đội ngũ myshop Boutique</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Authentic Boutique Footer -->
                                <tr>
                                    <td style="background-color: #faf9f6; padding: 22px 24px; text-align: center; border-top: 1px solid #ede9e2; font-size: 11px; color: #78716c; line-height: 1.6;">
                                        <div style="font-weight: 700; color: #292524; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">
                                            myshop boutique
                                        </div>
                                        <div>Hotline / Zalo hỗ trợ: <strong>0987 654 321</strong> (8:30 - 21:30 hàng ngày)</div>
                                        <div>Email hỗ trợ: <strong>cskh@myshop.vn</strong></div>
                                        <div style="margin-top: 8px; color: #a8a29e; font-size: 10px;">
                                            Email này được gửi tự động để cập nhật trạng thái đơn hàng #%s của bạn tại myshop Boutique.
                                        </div>
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
                escapeHtml(customerName),
                order.getOrderCode(),
                formattedDate,
                escapeHtml(customerName),
                customerPhone.isBlank() ? "" : "• " + escapeHtml(customerPhone),
                escapeHtml(fullAddress),
                noteBlockHtml,
                itemsHtml.toString(),
                formatVnd(order.getSubtotalCents()),
                (order.getDiscountCents() > 0 ? String.format("<tr><td style=\"padding: 4px 0; color: #15803d;\">Voucher giảm giá:</td><td style=\"padding: 4px 0; text-align: right; color: #15803d; font-weight: 600;\">-%s</td></tr>", formatVnd(order.getDiscountCents())) : ""),
                (order.getShippingCents() == 0 ? "<span style=\"color:#15803d; font-weight:600;\">Miễn phí giao hàng</span>" : formatVnd(order.getShippingCents())),
                formatVnd(order.getTotalCents()),
                paymentSectionHtml,
                trackingUrl,
                order.getOrderCode()
        );

        return new EmailPayload(html, inlineFiles, inlineBytes);
    }

    private String buildPaymentSectionHtml(Order order, Map<String, byte[]> inlineBytes) {
        if (order.getPaymentMethod() == PaymentMethod.VIETQR) {
            BankInfoDto bankInfo = vietQrService.getBankInfo(order.getTotalCents(), order.getOrderCode());
            String qrUrl = vietQrService.generateQrUrl(order.getTotalCents(), order.getOrderCode());

            String qrImgSrc = qrUrl;
            byte[] qrBytes = fetchImageBytes(qrUrl);
            if (qrBytes != null && qrBytes.length > 0) {
                inlineBytes.put("vietqr_code", qrBytes);
                qrImgSrc = "cid:vietqr_code";
            }

            return String.format("""
                <div style="background-color: #faf9f6; border: 1px solid #ede9e2; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-weight: 700; color: #292524; font-size: 14px; margin-bottom: 4px;">
                        💳 Hướng dẫn chuyển khoản VietQR
                    </div>
                    <div style="font-size: 12px; color: #78716c; margin-bottom: 14px;">
                        Bạn mở ứng dụng ngân hàng bất kỳ để quét mã QR và hoàn tất thanh toán tự động:
                    </div>
                    
                    <div style="background-color: #ffffff; display: inline-block; padding: 10px; border-radius: 10px; border: 1px solid #e7e5e0; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                        <img src="%s" width="200" height="200" style="display: block; margin: 0 auto; border-radius: 4px;" alt="Mã VietQR" />
                    </div>

                    <table width="100%%" cellspacing="0" cellpadding="0" style="margin-top: 14px; font-size: 12px; text-align: left; max-width: 360px; margin-left: auto; margin-right: auto; line-height: 1.7;">
                        <tr><td style="color: #78716c; padding: 2px 0;">Ngân hàng:</td><td style="font-weight: 600; color: #292524; text-align: right; padding: 2px 0;">%s</td></tr>
                        <tr><td style="color: #78716c; padding: 2px 0;">Số tài khoản:</td><td style="font-family: monospace; font-weight: 700; color: #292524; text-align: right; padding: 2px 0; font-size: 13px;">%s</td></tr>
                        <tr><td style="color: #78716c; padding: 2px 0;">Chủ tài khoản:</td><td style="font-weight: 600; color: #292524; text-align: right; padding: 2px 0;">%s</td></tr>
                        <tr><td style="color: #78716c; padding: 2px 0;">Số tiền:</td><td style="font-weight: 700; color: #292524; text-align: right; padding: 2px 0;">%s</td></tr>
                        <tr><td style="color: #78716c; padding: 2px 0;">Nội dung CK:</td><td style="font-family: monospace; font-weight: 700; color: #b45309; text-align: right; padding: 2px 0;">%s</td></tr>
                    </table>

                    <div style="margin-top: 14px; font-size: 12px; color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; line-height: 1.5;">
                        ⏱️ <strong>Lưu ý nhỏ:</strong> Đơn hàng sẽ được chúng mình giữ trong vòng <strong>24 giờ</strong> để chờ bạn hoàn tất chuyển khoản.
                    </div>
                </div>
                """,
                    qrImgSrc,
                    escapeHtml(bankInfo.bankName()),
                    escapeHtml(bankInfo.bankAccount()),
                    escapeHtml(bankInfo.accountHolder()),
                    formatVnd(order.getTotalCents()),
                    escapeHtml(bankInfo.transferContent())
            );
        } else {
            return String.format("""
                <div style="background-color: #faf9f6; border: 1px solid #ede9e2; border-radius: 12px; padding: 16px 20px;">
                    <div style="font-weight: 600; color: #292524; font-size: 13px; margin-bottom: 4px;">
                        📦 Thanh toán khi nhận hàng (COD)
                    </div>
                    <div style="font-size: 13px; line-height: 1.6; color: #57534e;">
                        Bạn vui lòng chuẩn bị số tiền <strong>%s</strong> khi bưu tá giao hàng tới nhé. Bạn hoàn toàn có thể kiểm tra hàng trước khi thanh toán.
                    </div>
                </div>
                """,
                    formatVnd(order.getTotalCents())
            );
        }
    }

    private File resolveLocalImageFile(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        String clean = imageUrl.trim();
        if (clean.startsWith("http://localhost") || clean.startsWith("http://127.0.0.1")) {
            try {
                clean = URI.create(clean).getPath();
            } catch (Exception ignored) {
                // fall through
            }
        }
        if (clean.startsWith("/")) {
            clean = clean.substring(1);
        }

        // Support uploads prefix mapping if uploaded images are stored in data/uploads
        String uploadsSubpath = null;
        if (clean.startsWith("api/v1/uploads/")) {
            uploadsSubpath = clean.substring("api/v1/uploads/".length());
        } else if (clean.startsWith("uploads/")) {
            uploadsSubpath = clean.substring("uploads/".length());
        }

        for (String baseDir : CANDIDATE_IMAGE_DIRS) {
            Path directPath = Paths.get(baseDir, clean).toAbsolutePath().normalize();
            if (Files.isRegularFile(directPath)) {
                return directPath.toFile();
            }
            if (uploadsSubpath != null) {
                Path uploadResolved = Paths.get(baseDir, uploadsSubpath).toAbsolutePath().normalize();
                if (Files.isRegularFile(uploadResolved)) {
                    return uploadResolved.toFile();
                }
            }
        }
        return null;
    }

    private byte[] fetchImageBytes(String urlString) {
        if (urlString == null || !urlString.startsWith("http")) {
            return null;
        }
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(3))
                    .build();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(urlString))
                    .timeout(Duration.ofSeconds(3))
                    .header("User-Agent", "myshop-email-service")
                    .GET()
                    .build();
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() == 200 && response.body() != null && response.body().length > 0) {
                return response.body();
            }
        } catch (Exception e) {
            log.warn("Could not download remote image for email inlining from {}: {}", urlString, e.getMessage());
        }
        return null;
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
