package com.shop.sepay;

/**
 * Outcome of matching one bank transfer against an order. Machine-readable
 * status so SePay delivery logs (and the shop owner) can tell exactly what
 * happened without decoding logs.
 */
public record SepayMatchResult(String status, String orderCode, String message) {

    public static final String CONFIRMED = "CONFIRMED";
    public static final String IGNORED = "IGNORED";
    public static final String ORDER_NOT_FOUND = "ORDER_NOT_FOUND";
    public static final String ALREADY_PROCESSED = "ALREADY_PROCESSED";
    public static final String AMOUNT_MISMATCH = "AMOUNT_MISMATCH";
    public static final String MANUAL_REVIEW = "MANUAL_REVIEW";

    public static SepayMatchResult confirmed(String orderCode) {
        return new SepayMatchResult(CONFIRMED, orderCode, "Đã xác nhận thanh toán tự động");
    }

    public static SepayMatchResult ignored(String message) {
        return new SepayMatchResult(IGNORED, null, message);
    }

    public static SepayMatchResult notFound(String orderCode) {
        return new SepayMatchResult(ORDER_NOT_FOUND, orderCode, "Không tìm thấy đơn hàng với mã này");
    }

    public static SepayMatchResult alreadyProcessed(String orderCode) {
        return new SepayMatchResult(ALREADY_PROCESSED, orderCode, "Đơn đã được xử lý trước đó — bỏ qua");
    }

    public static SepayMatchResult amountMismatch(String orderCode, String message) {
        return new SepayMatchResult(AMOUNT_MISMATCH, orderCode, message);
    }

    public static SepayMatchResult manualReview(String orderCode, String message) {
        return new SepayMatchResult(MANUAL_REVIEW, orderCode, message);
    }
}
