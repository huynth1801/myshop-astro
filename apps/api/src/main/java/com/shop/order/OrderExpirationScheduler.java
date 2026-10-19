package com.shop.order;

import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OrderExpirationScheduler {

    private static final Logger log = LoggerFactory.getLogger(OrderExpirationScheduler.class);

    private final OrderService orderService;
    private final Duration unpaidExpiration;

    public OrderExpirationScheduler(
            OrderService orderService,
            @Value("${app.order.unpaid-expiration-hours:24}") long expirationHours
    ) {
        this.orderService = orderService;
        this.unpaidExpiration = Duration.ofHours(Math.max(1, expirationHours));
    }

    /**
     * Periodically check and auto-cancel pending orders older than 24 hours.
     * Runs every 15 minutes by default (configurable via app.order.auto-cancel-interval-ms).
     */
    @Scheduled(fixedDelayString = "${app.order.auto-cancel-interval-ms:900000}", initialDelayString = "60000")
    public void autoCancelUnpaidOrders() {
        log.debug("Running scheduled task to cancel unpaid orders older than {}", unpaidExpiration);
        try {
            int cancelledCount = orderService.cancelUnpaidOrdersOlderThan(unpaidExpiration);
            if (cancelledCount > 0) {
                log.info("Auto-cancelled {} expired unpaid orders", cancelledCount);
            }
        } catch (Exception e) {
            log.error("Error while auto-cancelling expired unpaid orders", e);
        }
    }
}
