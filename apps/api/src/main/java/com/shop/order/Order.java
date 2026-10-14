package com.shop.order;

import com.shop.common.uuid.Ids;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    private UUID id;

    @Column(name = "order_code", unique = true, nullable = false)
    private String orderCode;

    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 50)
    private PaymentMethod paymentMethod;

    @Column(name = "subtotal_cents", nullable = false)
    private long subtotalCents;

    @Column(name = "discount_cents", nullable = false)
    private long discountCents;

    @Column(name = "shipping_cents", nullable = false)
    private long shippingCents;

    @Column(name = "total_cents", nullable = false)
    private long totalCents;

    @Column(name = "payment_intent_id")
    private String paymentIntentId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "shipping_address", columnDefinition = "jsonb")
    private Map<String, Object> shippingAddress;

    @Column(name = "customer_note")
    private String customerNote;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = Ids.newId();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public static Order create(
            String orderCode,
            UUID userId,
            PaymentMethod paymentMethod,
            long subtotalCents,
            long discountCents,
            long shippingCents,
            long totalCents,
            Map<String, Object> shippingAddress,
            String customerNote
    ) {
        Order order = new Order();
        order.id = Ids.newId();
        order.orderCode = orderCode;
        order.userId = userId;
        order.status = OrderStatus.PENDING;
        order.paymentMethod = paymentMethod;
        order.subtotalCents = subtotalCents;
        order.discountCents = discountCents;
        order.shippingCents = shippingCents;
        order.totalCents = totalCents;
        order.shippingAddress = shippingAddress;
        order.customerNote = customerNote;
        order.createdAt = Instant.now();
        return order;
    }

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void updateStatus(OrderStatus newStatus) {
        this.status = newStatus;
    }

    public UUID getId() {
        return id;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public UUID getUserId() {
        return userId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public long getSubtotalCents() {
        return subtotalCents;
    }

    public long getDiscountCents() {
        return discountCents;
    }

    public long getShippingCents() {
        return shippingCents;
    }

    public long getTotalCents() {
        return totalCents;
    }

    public String getPaymentIntentId() {
        return paymentIntentId;
    }

    public void setPaymentIntentId(String paymentIntentId) {
        this.paymentIntentId = paymentIntentId;
    }

    public Map<String, Object> getShippingAddress() {
        return shippingAddress;
    }

    public String getCustomerNote() {
        return customerNote;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }
}
