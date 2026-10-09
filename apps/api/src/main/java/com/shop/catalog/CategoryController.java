package com.shop.catalog;

import com.shop.catalog.dto.CategoryResponse;
import com.shop.catalog.dto.ProductSummaryResponse;
import com.shop.common.web.PagedResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/categories")
@Validated
public class CategoryController {

    private static final String SORT_PATTERN = "newest|price_asc|price_desc";

    private final CatalogService catalog;

    public CategoryController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public List<CategoryResponse> listCategories() {
        return catalog.listCategories();
    }

    @GetMapping("/{slug}/products")
    public PagedResponse<ProductSummaryResponse> listProducts(
            @PathVariable @Size(min = 1) String slug,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "12") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "newest") @Pattern(regexp = SORT_PATTERN) String sort) {
        return catalog.listProductsByCategory(slug, page, size, sort);
    }
}
