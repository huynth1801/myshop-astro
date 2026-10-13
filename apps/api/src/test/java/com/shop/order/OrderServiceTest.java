package com.shop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.catalog.Product;
import com.shop.catalog.ProductVariant;
import com.shop.catalog.ProductVariantRepository;
import com.shop.order.dto.AdminOrderMetricsResponse;
import com.shop.order.dto.CustomerAddressDto;
import com.shop.order.dto.OrderDetailResponse;
import com.shop.order.dto.PagedAdminOrdersResponse;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    private VietQrService vietQrService;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        vietQrService = new VietQrService("MB", "0987654321", "MYSHOP BOUTIQUE");
        orderService = new OrderService(orderRepository, productVariantRepository, vietQrService);
    }

    private CustomerAddressDto sampleAddress() {
        return new CustomerAddressDto(
                "Trần Thị B",
                "0909123456",
                "thib@example.com",
                "456 Nguyễn Huệ",
                "Đà Nẵng",
                "Hải Châu",
                "Thạch Thang",
                "550000",
                "VN"
        );
    }

    private Order createSampleOrder(String code, OrderStatus status) {
        Order order = Order.create(
                code,
                UUID.randomUUID(),
                PaymentMethod.COD,
                300_000_00L,
                0L,
                3_000_000L,
                330_000_00L,
                sampleAddress().toMap(),
                "Gọi trước khi giao"
        );
        order.updateStatus(status);

        OrderItem item = OrderItem.create("Quần lót su", "QL-SU-M", 150_000_00L, 2, "http://img/1.jpg");
        order.addItem(item);
        return order;
    }

    @Test
    void getOrderDetail_found_by_order_code() {
        Order order = createSampleOrder("MS-261013-ABCD", OrderStatus.PENDING);
        when(orderRepository.findByOrderCode("MS-261013-ABCD")).thenReturn(Optional.of(order));

        OrderDetailResponse response = orderService.getOrderDetail("MS-261013-ABCD");

        assertThat(response).isNotNull();
        assertThat(response.orderCode()).isEqualTo("MS-261013-ABCD");
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).sku()).isEqualTo("QL-SU-M");
    }

    @Test
    void getOrderDetail_notFound_throws_exception() {
        when(orderRepository.findByOrderCode("MS-NOT-FOUND")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.getOrderDetail("MS-NOT-FOUND"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void updateOrderStatus_transitions_status() {
        UUID orderId = UUID.randomUUID();
        Order order = createSampleOrder("MS-261013-CONF", OrderStatus.PENDING);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDetailResponse updated = orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED);

        assertThat(updated.status()).isEqualTo("CONFIRMED");
        verify(orderRepository).save(order);
    }

    @Test
    void cancelOrder_restores_inventory_stock() {
        UUID orderId = UUID.randomUUID();
        Order order = createSampleOrder("MS-261013-CANCEL", OrderStatus.CONFIRMED);

        Product p = Product.newProduct("Quần lót su", "quan-lot-su", "Desc", "Short", com.shop.catalog.ProductStatus.ACTIVE, null);
        ProductVariant variant = ProductVariant.newVariant(p, "QL-SU-M", 150_000_00L, null, 10, Map.of());

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(productVariantRepository.findBySku("QL-SU-M")).thenReturn(Optional.of(variant));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDetailResponse response = orderService.cancelOrder(orderId);

        assertThat(response.status()).isEqualTo("CANCELLED");
        // Stock should be increased by 2 (from 10 to 12)
        assertThat(variant.getStock()).isEqualTo(12);
        verify(productVariantRepository).save(variant);
        verify(orderRepository).save(order);
    }

    @Test
    void updateOrderStatus_fails_when_already_cancelled() {
        UUID orderId = UUID.randomUUID();
        Order order = createSampleOrder("MS-261013-ALREADY", OrderStatus.CANCELLED);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Đơn hàng đã hủy không thể thay đổi trạng thái");
    }

    @Test
    void getOrderMetrics_calculates_counts_and_revenue() {
        when(orderRepository.count()).thenReturn(20L);
        when(orderRepository.countByStatus(OrderStatus.PENDING)).thenReturn(5L);
        when(orderRepository.countByStatus(OrderStatus.CONFIRMED)).thenReturn(8L);
        when(orderRepository.countByStatus(OrderStatus.SHIPPING)).thenReturn(3L);
        when(orderRepository.countByStatus(OrderStatus.FULFILLED)).thenReturn(4L);
        when(orderRepository.countByStatus(OrderStatus.CANCELLED)).thenReturn(2L);
        when(orderRepository.calculateTotalRevenueCents()).thenReturn(50_000_000_00L);

        AdminOrderMetricsResponse metrics = orderService.getOrderMetrics();

        assertThat(metrics.totalOrders()).isEqualTo(20L);
        assertThat(metrics.pendingCount()).isEqualTo(5L);
        assertThat(metrics.confirmedCount()).isEqualTo(8L);
        assertThat(metrics.shippingCount()).isEqualTo(3L);
        assertThat(metrics.fulfilledCount()).isEqualTo(4L);
        assertThat(metrics.cancelledCount()).isEqualTo(2L);
        assertThat(metrics.totalRevenueCents()).isEqualTo(50_000_000_00L);
    }
}
