package com.shop.catalog;

import java.time.Instant;
import java.util.UUID;

/**
 * Interface projection for the product list query — one aggregated SQL query
 * (min variant price per product) instead of loading entities and lazy-loading
 * variants per row.
 */
public interface ProductSummaryView {

    UUID getId();

    String getSlug();

    String getName();

    String getShortDescription();

    Long getPriceFromCents();

    Instant getCreatedAt();

    String getCategorySlug();

    String getCategoryName();
}
