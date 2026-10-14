package com.shop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.shop.order.dto.OrderDetailResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OrderControllerTest {

    private final OrderService orderService = mock(OrderService.class);
    private final OrderController controller = new OrderController(orderService);

    @Test
    void getOrder_delegatesToService() {
        UUID id = UUID.randomUUID();
        OrderDetailResponse expected = new OrderDetailResponse(
                id, "MS-001", "PENDING", 100_00L, 0L, 30_00L, 130_00L,
                PaymentMethod.COD, null, null, null, null, List.of(), Instant.now()
        );
        when(orderService.getOrderDetail("MS-001")).thenReturn(expected);

        OrderDetailResponse actual = controller.getOrder("MS-001");
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void cancelOrder_delegatesToService() {
        UUID id = UUID.randomUUID();
        OrderDetailResponse expected = new OrderDetailResponse(
                id, "MS-001", "CANCELLED", 100_00L, 0L, 30_00L, 130_00L,
                PaymentMethod.COD, null, null, null, null, List.of(), Instant.now()
        );
        when(orderService.cancelCustomerOrder("MS-001")).thenReturn(expected);

        OrderDetailResponse actual = controller.cancelOrder("MS-001");
        assertThat(actual).isSameAs(expected);
    }
}
