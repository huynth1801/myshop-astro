package com.shop.catalog;

import com.shop.admin.dto.AdminProductDetailResponse;
import com.shop.admin.dto.AdminProductSummaryResponse;
import com.shop.admin.dto.CreateCategoryRequest;
import com.shop.admin.dto.CreateProductRequest;
import com.shop.admin.dto.CreateVariantRequest;
import com.shop.admin.dto.UpdateProductRequest;
import com.shop.admin.dto.UpdateVariantRequest;
import com.shop.catalog.dto.CategoryRefResponse;
import com.shop.catalog.dto.CategoryResponse;
import com.shop.catalog.dto.VariantResponse;
import com.shop.common.web.PagedResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Admin mutations for the catalog (Phase 2). Lives in the catalog package so it
 * holds the package-private entity factories/mutators; the HTTP surface is
 * com.shop.admin. All money is long cents; slugs are immutable after create.
 */
@Service
public class CatalogAdminService {

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final CategoryRepository categories;

    public CatalogAdminService(ProductRepository products, ProductVariantRepository variants,
            CategoryRepository categories) {
        this.products = products;
        this.variants = variants;
        this.categories = categories;
    }

    /** Any-status paged list — two queries total (products + all their variants). */
    @Transactional(readOnly = true)
    public PagedResponse<AdminProductSummaryResponse> listProducts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> productPage = products.findAll(pageable);

        List<UUID> ids = productPage.getContent().stream().map(Product::getId).toList();
        Map<UUID, List<ProductVariant>> byProduct = ids.isEmpty() ? Map.of()
                : variants.findByProductIdInOrderBySkuAsc(ids).stream()
                        .collect(Collectors.groupingBy(v -> v.getProduct().getId()));

        List<AdminProductSummaryResponse> content = productPage.getContent().stream()
                .map(p -> toSummary(p, byProduct.getOrDefault(p.getId(), List.of())))
                .toList();
        return new PagedResponse<>(content, productPage.getNumber(), productPage.getSize(),
                productPage.getTotalElements(), productPage.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AdminProductDetailResponse getProduct(UUID id) {
        return toDetail(products.findDetailById(id).orElseThrow(() -> new ProductNotFoundException(id)));
    }

    @Transactional
    public AdminProductDetailResponse createProduct(CreateProductRequest request) {
        if (products.existsBySlug(request.slug())) {
            throw new SlugTakenException(request.slug());
        }
        Category category = categories.findById(request.categoryId())
                .orElseThrow(() -> new CategoryNotFoundException(request.categoryId()));
        Product saved = products.save(Product.newProduct(request.name(), request.slug(),
                request.description(), request.shortDescription(), request.status(), category));
        return toDetail(saved);
    }

    @Transactional
    public AdminProductDetailResponse updateProduct(UUID id, UpdateProductRequest request) {
        Product product = products.findDetailById(id).orElseThrow(() -> new ProductNotFoundException(id));
        Category category = request.categoryId() == null ? null : resolveCategory(request.categoryId());
        product.update(
                request.name() != null ? request.name() : product.getName(),
                request.description() != null ? request.description() : product.getDescription(),
                request.shortDescription() != null ? request.shortDescription()
                        : product.getShortDescription(),
                request.status() != null ? request.status() : product.getStatus(),
                category != null ? category : product.getCategory());
        return toDetail(product);
    }

    @Transactional
    public AdminProductDetailResponse addVariant(UUID productId, CreateVariantRequest request) {
        Product product = products.findDetailById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        if (variants.existsBySku(request.sku())) {
            throw new SkuTakenException(request.sku());
        }
        variants.save(ProductVariant.newVariant(product, request.sku(), request.priceCents(),
                request.compareAtPriceCents(), request.stock(),
                request.attributes() == null ? Map.of() : request.attributes()));
        return toDetail(product);
    }

    @Transactional
    public VariantResponse updateVariant(UUID variantId, UpdateVariantRequest request) {
        ProductVariant variant = variants.findById(variantId)
                .orElseThrow(() -> new VariantNotFoundException(variantId));
        variant.updatePriceStock(
                request.priceCents() != null ? request.priceCents() : variant.getPriceCents(),
                request.compareAtPriceCents() != null ? request.compareAtPriceCents()
                        : variant.getCompareAtPriceCents(),
                request.stock() != null ? request.stock() : variant.getStock());
        return toVariantDto(variant);
    }

    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request) {
        if (categories.existsBySlug(request.slug())) {
            throw new SlugTakenException(request.slug());
        }
        Category parent = request.parentId() == null ? null : resolveCategory(request.parentId());
        Category saved = categories.save(Category.newCategory(request.name(), request.slug(), parent));
        return new CategoryResponse(saved.getSlug(), saved.getName(), saved.getParent() != null);
    }

    /** For the admin product form — the public endpoint has no ids. */
    @Transactional(readOnly = true)
    public List<com.shop.admin.dto.AdminCategoryResponse> listCategories() {
        return categories.findAllByOrderByPositionAsc().stream()
                .map(c -> new com.shop.admin.dto.AdminCategoryResponse(c.getId(), c.getSlug(),
                        c.getName(), c.getParent() != null))
                .toList();
    }

    private Category resolveCategory(UUID id) {
        return categories.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
    }

    private static AdminProductSummaryResponse toSummary(Product product, List<ProductVariant> variants) {
        return new AdminProductSummaryResponse(product.getId(), product.getSlug(), product.getName(),
                product.getStatus(), toCategoryRef(product), priceFrom(variants), variants.size(),
                variants.stream().mapToInt(ProductVariant::getStock).sum(),
                variants.stream().anyMatch(v -> v.getStock() > 0), product.getCreatedAt());
    }

    private static AdminProductDetailResponse toDetail(Product product) {
        return new AdminProductDetailResponse(product.getId(), product.getSlug(), product.getName(),
                product.getDescription(), product.getShortDescription(), product.getStatus(),
                toCategoryRef(product),
                product.getVariants().stream().map(CatalogAdminService::toVariantDto).toList(),
                product.getCreatedAt());
    }

    private static VariantResponse toVariantDto(ProductVariant variant) {
        return new VariantResponse(variant.getId(), variant.getSku(), variant.getPriceCents(),
                variant.getCompareAtPriceCents(), variant.getStock(),
                variant.getAttributes() == null ? Map.of() : variant.getAttributes());
    }

    private static CategoryRefResponse toCategoryRef(Product product) {
        return new CategoryRefResponse(product.getCategory().getSlug(),
                product.getCategory().getName());
    }

    /** Cheapest variant price, or null when the product has no variants yet. */
    private static Long priceFrom(List<ProductVariant> variants) {
        return variants.isEmpty()
                ? null
                : variants.stream().mapToLong(ProductVariant::getPriceCents).min().orElseThrow();
    }
}
