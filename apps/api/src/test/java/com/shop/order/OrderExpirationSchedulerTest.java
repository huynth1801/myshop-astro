package com.shop.order;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrderExpirationSchedulerTest {

    @Mock
    private OrderService orderService;

    @Test
    void autoCancelUnpaidOrders_calls_orderService() {
        OrderExpirationScheduler scheduler = new OrderExpirationScheduler(orderService, 24);
        when(orderService.cancelUnpaidOrdersOlderThan(any(Duration.class))).thenReturn(3);

        scheduler.autoCancelUnpaidOrders();

        verify(orderService).cancelUnpaidOrdersOlderThan(Duration.ofHours(24));
    }
}
