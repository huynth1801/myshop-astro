package com.shop.sepay;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.order.Order;
import com.shop.order.OrderRepository;
import com.shop.order.OrderService;
import com.shop.order.OrderStatus;
import com.shop.order.PaymentMethod;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class SepayPaymentServiceTest {

    private static final String ORDER_CODE = "MS-261020-AB3XK9";

    private OrderRepository orderRepository;
    private OrderService orderService;
    private SepayPaymentService service;

    @BeforeEach
    void setUp() {
        orderRepository = mock(OrderRepository.class);
        orderService = mock(OrderService.class);
        service = new SepayPaymentService(orderRepository, orderService);
    }

    private Order createOrder(OrderStatus status, PaymentMethod method, long totalCents) {
        Order order = Order.create(
                ORDER_CODE,
                UUID.randomUUID(),
                method,
                totalCents,
                0L,
                3_000_00L,
                totalCents + 3_000_00L,
                Map.of("name", "Trần Thị B", "phone", "0909123456"),
                null);
        order.updateStatus(status);
        return order;
    }

    private SepayWebhookRequest transfer(long amountVnd, String content) {
        return new SepayWebhookRequest(content, amountVnd, "in");
    }

    @Test
    void confirmsPendingVietqrOrderWhenAmountMatchesExactly() {
        Order order = createOrder(OrderStatus.PENDING, PaymentMethod.VIETQR, 330_000_00L);
        when(orderRepository.findByOrderCode(ORDER_CODE)).thenReturn(Optional.of(order));

        SepayMatchResult result = service.reconcile(
                transfer(330_000L + 3_000L, "Chuyen tien TU NGUYEN VAN A THANH TOAN " + ORDER_CODE));

        assertThat(result.status()).isEqualTo(SepayMatchResult.CONFIRMED);
        assertThat(result.orderCode()).isEqualTo(ORDER_CODE);
        // total_cents includes shipping; the customer transfers the full total
        verify(orderService).updateOrderStatus(order.getId(), OrderStatus.CONFIRMED);
    }

    @Test
    void looksUpCodeCaseInsensitively() {
        Order order = createOrder(OrderStatus.PENDING, PaymentMethod.VIETQR, 100_000_00L);
        when(orderRepository.findByOrderCode(ORDER_CODE)).thenReturn(Optional.of(order));

        SepayMatchResult result = service.reconcile(transfer(103_000L, "thanh toan " + ORDER_CODE.toLowerCase()));

        assertThat(result.status()).isEqualTo(SepayMatchResult.CONFIRMED);
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(orderRepository).findByOrderCode(code.capture());
        assertThat(code.getValue()).isEqualTo(ORDER_CODE);
    }

    @Test
    void ignoresMoneyLeavingTheAccount() {
        SepayMatchResult result = service.reconcile(
                new SepayWebhookRequest("THANH TOAN " + ORDER_CODE, 500_000L, "out"));

        assertThat(result.status()).isEqualTo(SepayMatchResult.IGNORED);
        verify(orderRepository, never()).findByOrderCode(any());
        verify(orderService, never()).updateOrderStatus(any(), any());
    }

    @Test
    void ignoresTransferWithoutOrderCode() {
        SepayMatchResult result = service.reconcile(transfer(500_000L, "Tien thuong thang 10"));

        assertThat(result.status()).isEqualTo(SepayMatchResult.IGNORED);
        verify(orderRepository, never()).findByOrderCode(any());
    }

    @Test
    void reportsUnknownOrderCode() {
        when(orderRepository.findByOrderCode("MS-261020-ZZZZZZ")).thenReturn(Optional.empty());

        SepayMatchResult result = service.reconcile(transfer(500_000L, "THANH TOAN MS-261020-ZZZZZZ"));

        assertThat(result.status()).isEqualTo(SepayMatchResult.ORDER_NOT_FOUND);
        verify(orderService, never()).updateOrderStatus(any(), any());
    }

    @Test
    void refusesToConfirmWhenAmountDiffers() {
        Order order = createOrder(OrderStatus.PENDING, PaymentMethod.VIETQR, 330_000_00L);
        when(orderRepository.findByOrderCode(ORDER_CODE)).thenReturn(Optional.of(order));

        SepayMatchResult result = service.reconcile(transfer(100_000L, "THANH TOAN " + ORDER_CODE));

        assertThat(result.status()).isEqualTo(SepayMatchResult.AMOUNT_MISMATCH);
        verify(orderService, never()).updateOrderStatus(any(), any());
    }

    @Test
    void isIdempotentForAlreadyProcessedOrders() {
        Order order = createOrder(OrderStatus.CONFIRMED, PaymentMethod.VIETQR, 330_000_00L);
        when(orderRepository.findByOrderCode(ORDER_CODE)).thenReturn(Optional.of(order));

        SepayMatchResult result = service.reconcile(transfer(330_000L, "THANH TOAN " + ORDER_CODE));

        assertThat(result.status()).isEqualTo(SepayMatchResult.ALREADY_PROCESSED);
        verify(orderService, never()).updateOrderStatus(any(), any());
    }

    @Test
    void flagsCancelledOrderForManualReview() {
        Order order = createOrder(OrderStatus.CANCELLED, PaymentMethod.VIETQR, 330_000_00L);
        when(orderRepository.findByOrderCode(ORDER_CODE)).thenReturn(Optional.of(order));

        SepayMatchResult result = service.reconcile(transfer(330_000L, "THANH TOAN " + ORDER_CODE));

        assertThat(result.status()).isEqualTo(SepayMatchResult.MANUAL_REVIEW);
        verify(orderService, never()).updateOrderStatus(any(), any());
    }

    @Test
    void flagsBankTransferForCodOrderForManualReview() {
        Order order = createOrder(OrderStatus.PENDING, PaymentMethod.COD, 330_000_00L);
        when(orderRepository.findByOrderCode(ORDER_CODE)).thenReturn(Optional.of(order));

        SepayMatchResult result = service.reconcile(transfer(333_000L, "THANH TOAN " + ORDER_CODE));

        assertThat(result.status()).isEqualTo(SepayMatchResult.MANUAL_REVIEW);
        verify(orderService, never()).updateOrderStatus(any(), any());
    }
}
