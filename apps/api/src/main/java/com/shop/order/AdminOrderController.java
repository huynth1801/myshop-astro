package com.shop.order;

import com.shop.order.dto.AdminOrderMetricsResponse;
import com.shop.order.dto.OrderDetailResponse;
import com.shop.order.dto.PagedAdminOrdersResponse;
import com.shop.order.dto.UpdateOrderStatusRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class AdminOrderController {

    private final OrderService orderService;

    public AdminOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public PagedAdminOrdersResponse listOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        OrderStatus orderStatus = null;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            try {
                orderStatus = OrderStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Ignore invalid status filter
            }
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        return orderService.getAdminOrders(pageable, orderStatus, search);
    }

    @GetMapping("/metrics")
    public AdminOrderMetricsResponse getMetrics() {
        return orderService.getOrderMetrics();
    }

    @GetMapping("/{id}")
    public OrderDetailResponse getOrder(@PathVariable UUID id) {
        return orderService.getOrderDetail(id.toString());
    }

    @PatchMapping("/{id}/status")
    public OrderDetailResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrderStatusRequest request
    ) {
        return orderService.updateOrderStatus(id, request.status());
    }

    @PostMapping("/{id}/cancel")
    public OrderDetailResponse cancelOrder(@PathVariable UUID id) {
        return orderService.cancelOrder(id);
    }
}
