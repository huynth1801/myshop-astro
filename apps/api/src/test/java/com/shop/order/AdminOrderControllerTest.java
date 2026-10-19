package com.shop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.shop.order.dto.AdminOrderMetricsResponse;
import com.shop.order.dto.OrderDetailResponse;
import com.shop.order.dto.PagedAdminOrdersResponse;
import com.shop.order.dto.UpdateOrderStatusRequest;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

class AdminOrderControllerTest {

    private final OrderService orderService = mock(OrderService.class);
    private final AdminOrderController controller = new AdminOrderController(orderService);

    @Test
    void listOrders_delegatesToService() {
        PagedAdminOrdersResponse expected = new PagedAdminOrdersResponse(List.of(), 0, 20, 0, 0);
        when(orderService.getAdminOrders(any(Pageable.class), eq(OrderStatus.PENDING), eq("search"))).thenReturn(expected);

        PagedAdminOrdersResponse actual = controller.listOrders(0, 20, "PENDING", "search");
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void getMetrics_delegatesToService() {
        AdminOrderMetricsResponse expected = new AdminOrderMetricsResponse(10, 2, 3, 2, 2, 1, 100_000_00L);
        when(orderService.getOrderMetrics()).thenReturn(expected);

        AdminOrderMetricsResponse actual = controller.getMetrics();
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void getOrder_delegatesToService() {
        UUID id = UUID.randomUUID();
        OrderDetailResponse expected = new OrderDetailResponse(
                id, "MS-001", "PENDING", 100_00L, 0L, 30_00L, 130_00L,
                PaymentMethod.COD, null, null, null, null, List.of(), Instant.now()
        );
        when(orderService.getOrderDetail(id.toString())).thenReturn(expected);

        OrderDetailResponse actual = controller.getOrder(id);
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void updateStatus_delegatesToService() {
        UUID id = UUID.randomUUID();
        UpdateOrderStatusRequest req = new UpdateOrderStatusRequest(OrderStatus.SHIPPING);
        OrderDetailResponse expected = new OrderDetailResponse(
                id, "MS-001", "SHIPPING", 100_00L, 0L, 30_00L, 130_00L,
                PaymentMethod.COD, null, null, null, null, List.of(), Instant.now()
        );
        when(orderService.updateOrderStatus(id, OrderStatus.SHIPPING)).thenReturn(expected);

        OrderDetailResponse actual = controller.updateStatus(id, req);
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void cancelOrder_delegatesToService() {
        UUID id = UUID.randomUUID();
        OrderDetailResponse expected = new OrderDetailResponse(
                id, "MS-001", "CANCELLED", 100_00L, 0L, 30_00L, 130_00L,
                PaymentMethod.COD, null, null, null, null, List.of(), Instant.now()
        );
        when(orderService.cancelOrder(id)).thenReturn(expected);

        OrderDetailResponse actual = controller.cancelOrder(id);
        assertThat(actual).isSameAs(expected);
    }
}
