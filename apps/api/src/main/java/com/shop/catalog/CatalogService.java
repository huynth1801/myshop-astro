package com.shop.catalog;

import com.shop.catalog.dto.ProductDetailResponse;
import com.shop.catalog.dto.ProductSummaryResponse;
import com.shop.common.web.PagedResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {

    private final ProductRepository products;
    private final ProductImageRepository images;

    public CatalogService(ProductRepository products, ProductImageRepository images) {
        this.products = products;
        this.images = images;
    }

    public PagedResponse<ProductSummaryResponse> listProducts(int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProductSummaryView> result = switch (sort) {
            case "price_asc" -> products.findSummariesOrderByPriceAsc(pageable);
            case "price_desc" -> products.findSummariesOrderByPriceDesc(pageable);
            case "newest" -> products.findSummariesOrderByNewest(pageable);
            default -> throw new IllegalArgumentException("sort must be newest, price_asc or price_desc");
        };

        List<ProductSummaryView> views = result.getContent();
        Map<UUID, ProductImage> primaryImageByProduct = primaryImages(
                views.stream().map(ProductSummaryView::getId).toList());

        List<ProductSummaryResponse> content = views.stream()
                .map(view -> ProductMapper.toSummary(view, primaryImageByProduct.get(view.getId())))
                .toList();
        return new PagedResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    public ProductDetailResponse getProduct(String slug) {
        Product product = products.findDetailBySlug(slug)
                .orElseThrow(() -> new ProductNotFoundException(slug));
        return ProductMapper.toDetail(product, images.findByProductIdOrderByPositionAsc(product.getId()));
    }

    /**
     * First image (lowest position) per product — one query for the whole page,
     * no per-row lazy loading.
     */
    private Map<UUID, ProductImage> primaryImages(List<UUID> productIds) {
        Map<UUID, ProductImage> byProduct = new HashMap<>();
        for (ProductImage image : images.findByProductIdInOrderByPositionAsc(productIds)) {
            byProduct.putIfAbsent(image.getProduct().getId(), image);
        }
        return byProduct;
    }
}
