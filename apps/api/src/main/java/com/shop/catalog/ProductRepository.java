package com.shop.catalog;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    String SUMMARIES_SELECT = """
            select p.id as id,
                   p.slug as slug,
                   p.name as name,
                   p.shortDescription as shortDescription,
                   p.createdAt as createdAt,
                   min(v.priceCents) as priceFromCents,
                   c.slug as categorySlug,
                   c.name as categoryName
            from Product p
              join p.category c
              left join p.variants v
            where p.status = com.shop.catalog.ProductStatus.ACTIVE
            group by p.id, p.slug, p.name, p.shortDescription, p.createdAt, c.slug, c.name
            """;

    String COUNT_ACTIVE = """
            select count(p) from Product p
            where p.status = com.shop.catalog.ProductStatus.ACTIVE
            """;

    @Query(value = SUMMARIES_SELECT + "order by min(v.priceCents) asc, p.id asc", countQuery = COUNT_ACTIVE)
    Page<ProductSummaryView> findSummariesOrderByPriceAsc(Pageable pageable);

    @Query(value = SUMMARIES_SELECT + "order by min(v.priceCents) desc, p.id asc", countQuery = COUNT_ACTIVE)
    Page<ProductSummaryView> findSummariesOrderByPriceDesc(Pageable pageable);

    @Query(value = SUMMARIES_SELECT + "order by p.createdAt desc, p.id asc", countQuery = COUNT_ACTIVE)
    Page<ProductSummaryView> findSummariesOrderByNewest(Pageable pageable);

    /**
     * Detail fetch: one collection (variants) join-fetched — images are loaded
     * separately by ProductImageRepository to avoid a multi-bag cartesian fetch.
     */
    @Query("""
            select distinct p from Product p
              join fetch p.category c
              left join fetch p.variants v
            where p.slug = :slug and p.status = com.shop.catalog.ProductStatus.ACTIVE
            """)
    Optional<Product> findDetailBySlug(@Param("slug") String slug);
}
