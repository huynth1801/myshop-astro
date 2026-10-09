package com.shop.catalog;

import com.shop.catalog.dto.ProductDetailResponse;
import com.shop.catalog.dto.ProductSummaryResponse;
import com.shop.common.web.PagedResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/products")
@Validated
public class ProductController {

    private static final String SORT_PATTERN = "newest|price_asc|price_desc";

    private final CatalogService catalog;

    public ProductController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public PagedResponse<ProductSummaryResponse> listProducts(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "newest") @Pattern(regexp = SORT_PATTERN) String sort) {
        return catalog.listProducts(page, size, sort);
    }

    @GetMapping("/{slug}")
    public ProductDetailResponse getProduct(@PathVariable String slug) {
        return catalog.getProduct(slug);
    }

    @GetMapping("/{slug}/recommendations")
    public List<ProductSummaryResponse> recommendations(
            @PathVariable String slug,
            @RequestParam(defaultValue = "CROSS_SELL") RelatedType type,
            @RequestParam(defaultValue = "3") @Min(1) @Max(10) int limit) {
        return catalog.listRecommendations(slug, type, limit);
    }
}
