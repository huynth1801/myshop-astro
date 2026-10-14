package com.shop.order;

import com.shop.catalog.ProductVariant;
import com.shop.catalog.ProductVariantRepository;
import com.shop.order.dto.AdminOrderMetricsResponse;
import com.shop.order.dto.AdminOrderSummaryResponse;
import com.shop.order.dto.BankInfoDto;
import com.shop.order.dto.CustomerAddressDto;
import com.shop.order.dto.OrderDetailResponse;
import com.shop.order.dto.OrderItemResponse;
import com.shop.order.dto.PagedAdminOrdersResponse;
import jakarta.persistence.criteria.Predicate;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductVariantRepository productVariantRepository;
    private final VietQrService vietQrService;
    private final long unpaidExpirationHours;

    @Autowired
    public OrderService(
            OrderRepository orderRepository,
            ProductVariantRepository productVariantRepository,
            VietQrService vietQrService,
            @Value("${app.order.unpaid-expiration-hours:24}") long unpaidExpirationHours
    ) {
        this.orderRepository = orderRepository;
        this.productVariantRepository = productVariantRepository;
        this.vietQrService = vietQrService;
        this.unpaidExpirationHours = unpaidExpirationHours;
    }

    public OrderService(
            OrderRepository orderRepository,
            ProductVariantRepository productVariantRepository,
            VietQrService vietQrService
    ) {
        this(orderRepository, productVariantRepository, vietQrService, 24);
    }

    @Transactional
    public OrderDetailResponse getOrderDetail(String identifier) {
        Order order = findByIdentifier(identifier)
                .orElseThrow(() -> new OrderNotFoundException(identifier));

        if (order.getStatus() == OrderStatus.PENDING && isOrderExpired(order)) {
            log.info("Order {} is older than {}h and unpaid. Auto-cancelling on access.",
                    order.getOrderCode(), unpaidExpirationHours);
            cancelOrderInternal(order);
        }

        return toDetailResponse(order);
    }

    @Transactional(readOnly = true)
    public PagedAdminOrdersResponse getAdminOrders(Pageable pageable, OrderStatus status, String search) {
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                Predicate codeMatch = cb.like(cb.lower(root.get("orderCode")), term);
                predicates.add(codeMatch);
            }

            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Order> page = orderRepository.findAll(spec, pageable);
        List<AdminOrderSummaryResponse> content = page.getContent().stream()
                .map(this::toAdminSummaryResponse)
                .toList();

        return new PagedAdminOrdersResponse(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional
    public OrderDetailResponse updateOrderStatus(UUID id, OrderStatus newStatus) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException(id.toString()));

        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Đơn hàng đã hủy không thể thay đổi trạng thái");
        }

        // If cancelling order, return items back to inventory stock
        if (newStatus == OrderStatus.CANCELLED) {
            restoreStockForOrder(order);
        }

        order.updateStatus(newStatus);
        Order saved = orderRepository.save(order);
        log.info("Updated order {} status to {}", saved.getOrderCode(), newStatus);
        return toDetailResponse(saved);
    }

    @Transactional
    public OrderDetailResponse cancelOrder(UUID id) {
        return updateOrderStatus(id, OrderStatus.CANCELLED);
    }

    @Transactional
    public int cancelUnpaidOrdersOlderThan(Duration duration) {
        Instant cutoff = Instant.now().minus(duration);
        int totalCancelled = 0;
        int pageSize = 50;

        while (true) {
            // Because cancelling changes status from PENDING to CANCELLED,
            // query page 0 repeatedly until empty.
            Page<Order> pendingExpiredPage = orderRepository.findByStatusAndCreatedAtBefore(
                    OrderStatus.PENDING,
                    cutoff,
                    PageRequest.of(0, pageSize)
            );

            if (pendingExpiredPage.isEmpty()) {
                break;
            }

            for (Order order : pendingExpiredPage.getContent()) {
                cancelOrderInternal(order);
                totalCancelled++;
            }

            if (!pendingExpiredPage.hasNext()) {
                break;
            }
        }

        return totalCancelled;
    }

    public boolean isOrderExpired(Order order) {
        if (order == null || order.getStatus() != OrderStatus.PENDING) {
            return false;
        }
        if (order.getCreatedAt() == null) {
            return false;
        }
        Instant cutoff = Instant.now().minus(Math.max(1, unpaidExpirationHours), ChronoUnit.HOURS);
        return order.getCreatedAt().isBefore(cutoff);
    }

    private void restoreStockForOrder(Order order) {
        log.info("Restoring stock for cancelled order {}", order.getOrderCode());
        for (OrderItem item : order.getItems()) {
            Optional<ProductVariant> variantOpt = productVariantRepository.findBySku(item.getSku());
            variantOpt.ifPresent(variant -> {
                variant.incrementStock(item.getQty());
                productVariantRepository.save(variant);
                log.info("Restored {} items to stock for SKU {}", item.getQty(), item.getSku());
            });
        }
    }

    private void cancelOrderInternal(Order order) {
        restoreStockForOrder(order);
        order.updateStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        log.info("Order {} cancelled due to unpaid expiration", order.getOrderCode());
    }

    @Transactional(readOnly = true)
    public AdminOrderMetricsResponse getOrderMetrics() {
        long total = orderRepository.count();
        long pending = orderRepository.countByStatus(OrderStatus.PENDING);
        long confirmed = orderRepository.countByStatus(OrderStatus.CONFIRMED);
        long shipping = orderRepository.countByStatus(OrderStatus.SHIPPING);
        long fulfilled = orderRepository.countByStatus(OrderStatus.FULFILLED);
        long cancelled = orderRepository.countByStatus(OrderStatus.CANCELLED);
        long totalRevenueCents = orderRepository.calculateTotalRevenueCents();

        return new AdminOrderMetricsResponse(
                total,
                pending,
                confirmed,
                shipping,
                fulfilled,
                cancelled,
                totalRevenueCents
        );
    }

    private Optional<Order> findByIdentifier(String identifier) {
        try {
            UUID id = UUID.fromString(identifier);
            Optional<Order> byId = orderRepository.findById(id);
            if (byId.isPresent()) {
                return byId;
            }
        } catch (IllegalArgumentException ignored) {
            // Not a UUID, look up by order code
        }
        return orderRepository.findByOrderCode(identifier);
    }

    public OrderDetailResponse toDetailResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getProductName(),
                        item.getSku(),
                        item.getUnitPriceCents(),
                        item.getQty(),
                        item.getUnitPriceCents() * item.getQty(),
                        item.getImageUrl()
                ))
                .toList();

        String vietQrUrl = null;
        BankInfoDto bankInfo = null;

        if (order.getPaymentMethod() == PaymentMethod.VIETQR && order.getStatus() == OrderStatus.PENDING) {
            vietQrUrl = vietQrService.generateQrUrl(order.getTotalCents(), order.getOrderCode());
            bankInfo = vietQrService.getBankInfo(order.getTotalCents(), order.getOrderCode());
        }

        return new OrderDetailResponse(
                order.getId(),
                order.getOrderCode(),
                order.getStatus().name(),
                order.getSubtotalCents(),
                order.getDiscountCents(),
                order.getShippingCents(),
                order.getTotalCents(),
                order.getPaymentMethod(),
                CustomerAddressDto.fromMap(order.getShippingAddress()),
                order.getCustomerNote(),
                vietQrUrl,
                bankInfo,
                itemResponses,
                order.getCreatedAt()
        );
    }

    public AdminOrderSummaryResponse toAdminSummaryResponse(Order order) {
        Map<String, Object> addr = order.getShippingAddress();
        String customerName = addr != null ? (String) addr.getOrDefault("fullName", "Khách hàng") : "Khách hàng";
        String customerPhone = addr != null ? (String) addr.getOrDefault("phone", "") : "";
        String customerCity = addr != null ? (String) addr.getOrDefault("city", "") : "";

        int itemCount = order.getItems().stream().mapToInt(OrderItem::getQty).sum();

        return new AdminOrderSummaryResponse(
                order.getId(),
                order.getOrderCode(),
                order.getStatus().name(),
                customerName,
                customerPhone,
                customerCity,
                order.getTotalCents(),
                itemCount,
                order.getPaymentMethod(),
                order.getCreatedAt()
        );
    }
}
