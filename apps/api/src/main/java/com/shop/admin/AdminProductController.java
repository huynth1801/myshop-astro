package com.shop.admin;

import com.shop.admin.dto.AddImageRequest;
import com.shop.admin.dto.AdminProductDetailResponse;
import com.shop.admin.dto.AdminProductSummaryResponse;
import com.shop.admin.dto.CreateProductRequest;
import com.shop.admin.dto.CreateVariantRequest;
import com.shop.admin.dto.ReorderImagesRequest;
import com.shop.admin.dto.UpdateImageRequest;
import com.shop.admin.dto.UpdateProductRequest;
import com.shop.catalog.CatalogAdminService;
import com.shop.catalog.ProductStatus;
import com.shop.common.web.PagedResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) UUID categoryId) {
        return admin.listProducts(q, status, categoryId, page, size);
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

    @PostMapping("/{id}/images")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDetailResponse addImage(@PathVariable UUID id,
            @Valid @RequestBody AddImageRequest body) {
        return admin.addImageByUrl(id, body.url(), body.alt());
    }

    @PostMapping("/{id}/images/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminProductDetailResponse uploadImage(@PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String alt) {
        return admin.uploadImage(id, file, alt);
    }

    @PutMapping("/{id}/images/order")
    public AdminProductDetailResponse reorderImages(@PathVariable UUID id,
            @Valid @RequestBody ReorderImagesRequest body) {
        return admin.reorderImages(id, body.imageIds());
    }

    @PatchMapping("/{id}/images/{imageId}")
    public AdminProductDetailResponse updateImage(@PathVariable UUID id, @PathVariable UUID imageId,
            @Valid @RequestBody UpdateImageRequest body) {
        return admin.updateImage(id, imageId, body.url(), body.alt());
    }

    @PostMapping("/{id}/images/{imageId}/upload")
    public AdminProductDetailResponse replaceImageUpload(@PathVariable UUID id, @PathVariable UUID imageId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String alt) {
        return admin.replaceImageUpload(id, imageId, file, alt);
    }

    @DeleteMapping("/{id}/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteImage(@PathVariable UUID id, @PathVariable UUID imageId) {
        admin.deleteImage(id, imageId);
    }
}
