package com.shop.admin;

import com.shop.admin.dto.AdminProductDetailResponse;
import com.shop.admin.dto.AdminProductSummaryResponse;
import com.shop.admin.dto.CreateProductRequest;
import com.shop.admin.dto.CreateVariantRequest;
import com.shop.admin.dto.UpdateProductRequest;
import com.shop.catalog.CatalogAdminService;
import com.shop.common.web.PagedResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin product CRUD — every route sits behind SecurityConfig's
 * /api/v1/admin/** hasRole(ADMIN) check; a non-admin gets 403 problem+json.
 */
@RestController
@RequestMapping("/api/v1/admin/products")
@Validated
public class AdminProductController {

    private final CatalogAdminService admin;

    public AdminProductController(CatalogAdminService admin) {
        this.admin = admin;
    }

    @GetMapping
    public PagedResponse<AdminProductSummaryResponse> listProducts(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return admin.listProducts(page, size);
    }

    @GetMapping("/{id}")
    public AdminProductDetailResponse getProduct(@PathVariable UUID id) {
        return admin.getProduct(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDetailResponse createProduct(@Valid @RequestBody CreateProductRequest body) {
        return admin.createProduct(body);
    }

    @PatchMapping("/{id}")
    public AdminProductDetailResponse updateProduct(@PathVariable UUID id,
            @Valid @RequestBody UpdateProductRequest body) {
        return admin.updateProduct(id, body);
    }

    @PostMapping("/{id}/variants")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDetailResponse addVariant(@PathVariable UUID id,
            @Valid @RequestBody CreateVariantRequest body) {
        return admin.addVariant(id, body);
    }
}
