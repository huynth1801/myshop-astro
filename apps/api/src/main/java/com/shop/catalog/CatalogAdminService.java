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
import com.shop.catalog.dto.ImageResponse;
import com.shop.catalog.dto.VariantResponse;
import com.shop.common.file.FileStorage;
import com.shop.common.file.InvalidUploadException;
import com.shop.common.web.PagedResponse;
import jakarta.persistence.criteria.Predicate;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Admin mutations for the catalog (Phase 2). Lives in the catalog package so it
 * holds the package-private entity factories/mutators; the HTTP surface is
 * com.shop.admin. All money is long cents; slugs are immutable after create.
 */
@Service
public class CatalogAdminService {

    private static final long MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;
    private final CategoryRepository categories;
    private final FileStorage storage;

    public CatalogAdminService(ProductRepository products, ProductVariantRepository variants,
            ProductImageRepository images, CategoryRepository categories, FileStorage storage) {
        this.products = products;
        this.variants = variants;
        this.images = images;
        this.categories = categories;
        this.storage = storage;
    }

    /** Any-status paged list with optional q/status/category filters (Specifications, ADR none needed). */
    @Transactional(readOnly = true)
    public PagedResponse<AdminProductSummaryResponse> listProducts(String q, ProductStatus status,
            UUID categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Product> productPage = products.findAll(filter(q, status, categoryId), pageable);

        List<UUID> ids = productPage.getContent().stream().map(Product::getId).toList();
        Map<UUID, List<ProductVariant>> variantsByProduct = ids.isEmpty() ? Map.of()
                : variants.findByProductIdInOrderBySkuAsc(ids).stream()
                        .collect(Collectors.groupingBy(v -> v.getProduct().getId()));
        Map<UUID, List<ProductImage>> imagesByProduct = ids.isEmpty() ? Map.of()
                : images.findByProductIdInOrderByPositionAsc(ids).stream()
                        .collect(Collectors.groupingBy(i -> i.getProduct().getId()));

        List<AdminProductSummaryResponse> content = productPage.getContent().stream()
                .map(p -> toSummary(p, variantsByProduct.getOrDefault(p.getId(), List.of()),
                        imagesByProduct.getOrDefault(p.getId(), List.of())))
                .toList();
        return new PagedResponse<>(content, productPage.getNumber(), productPage.getSize(),
                productPage.getTotalElements(), productPage.getTotalPages());
    }

    private static Specification<Product> filter(String q, ProductStatus status, UUID categoryId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String needle = "%" + escapeLike(q.trim().toLowerCase()) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), needle),
                        cb.like(cb.lower(root.get("slug")), needle)));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static String escapeLike(String input) {
        return input.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    @Transactional(readOnly = true)
    public AdminProductDetailResponse getProduct(UUID id) {
        Product product = products.findDetailById(id).orElseThrow(() -> new ProductNotFoundException(id));
        return toDetail(product, images.findByProductIdOrderByPositionAsc(id));
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
        return toDetail(saved, List.of());
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
        return toDetail(product, images.findByProductIdOrderByPositionAsc(id));
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
        return toDetail(product, images.findByProductIdOrderByPositionAsc(productId));
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

    /** Flushed eagerly so the cart_items FK violation surfaces here, not at commit. */
    @Transactional
    public void deleteVariant(UUID variantId) {
        ProductVariant variant = variants.findById(variantId)
                .orElseThrow(() -> new VariantNotFoundException(variantId));
        try {
            variants.delete(variant);
            variants.flush();
        } catch (DataIntegrityViolationException e) {
            throw new VariantInUseException();
        }
    }

    @Transactional
    public AdminProductDetailResponse addImageByUrl(UUID productId, String url, String alt) {
        Product product = products.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        appendImage(product, url, alt);
        return toDetail(product, images.findByProductIdOrderByPositionAsc(productId));
    }

    /** Upload path (ADR 0005): file lands in the API's upload dir, the row stores /api/v1/files/{name}. */
    @Transactional
    public AdminProductDetailResponse uploadImage(UUID productId, MultipartFile file, String alt) {
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new InvalidUploadException("Cannot read the uploaded file");
        }
        if (content.length == 0) {
            throw new InvalidUploadException("The uploaded file is empty");
        }
        if (content.length > MAX_UPLOAD_BYTES) {
            throw new InvalidUploadException("Images must be at most 5 MB");
        }
        Product product = products.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        String name = storage.store(content, file.getOriginalFilename());
        appendImage(product, "/api/v1/files/" + name, alt);
        return toDetail(product, images.findByProductIdOrderByPositionAsc(productId));
    }

    @Transactional
    public AdminProductDetailResponse updateImageAlt(UUID productId, UUID imageId, String alt) {
        products.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        ProductImage image = images.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ImageNotFoundException(imageId));
        image.update(alt);
        return toDetailWithId(productId);
    }

    /** Reassigns positions 0..n from the given order; the id set must match the product exactly. */
    @Transactional
    public AdminProductDetailResponse reorderImages(UUID productId, List<UUID> imageIds) {
        products.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        List<ProductImage> current = images.findByProductIdOrderByPositionAsc(productId);
        Set<UUID> currentIds = current.stream().map(ProductImage::getId).collect(Collectors.toSet());
        Set<UUID> requested = new HashSet<>(imageIds);
        if (requested.size() != imageIds.size() || !requested.equals(currentIds)) {
            throw new ImageSetMismatchException(productId);
        }
        Map<UUID, ProductImage> byId = current.stream()
                .collect(Collectors.toMap(ProductImage::getId, i -> i, (a, b) -> a, LinkedHashMap::new));
        for (int position = 0; position < imageIds.size(); position++) {
            byId.get(imageIds.get(position)).reposition(position);
        }
        return toDetailWithId(productId);
    }

    @Transactional
    public void deleteImage(UUID productId, UUID imageId) {
        products.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        ProductImage image = images.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ImageNotFoundException(imageId));
        images.delete(image);
        // the file itself stays (orphan-safe, ADR 0005) — rows are the source of truth
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

    private void appendImage(Product product, String url, String alt) {
        int nextPosition = images.findFirstByProductIdOrderByPositionDesc(product.getId())
                .map(ProductImage::getPosition)
                .orElse(-1) + 1;
        images.save(ProductImage.newImage(product, url, alt, nextPosition));
    }

    private AdminProductDetailResponse toDetailWithId(UUID productId) {
        return toDetail(products.findDetailById(productId).orElseThrow(),
                images.findByProductIdOrderByPositionAsc(productId));
    }

    private Category resolveCategory(UUID id) {
        return categories.findById(id).orElseThrow(() -> new CategoryNotFoundException(id));
    }

    private static AdminProductSummaryResponse toSummary(Product product, List<ProductVariant> variants,
            List<ProductImage> productImages) {
        Long priceFrom = variants.isEmpty() ? null
                : variants.stream().mapToLong(ProductVariant::getPriceCents).min().orElseThrow();
        Long priceTo = variants.size() < 2 ? null
                : variants.stream().mapToLong(ProductVariant::getPriceCents).max().orElseThrow();
        ProductImage primary = productImages.isEmpty() ? null : productImages.get(0);
        return new AdminProductSummaryResponse(product.getId(), product.getSlug(), product.getName(),
                product.getStatus(), toCategoryRef(product), priceFrom, priceTo, variants.size(),
                variants.stream().mapToInt(ProductVariant::getStock).sum(),
                variants.stream().anyMatch(v -> v.getStock() > 0),
                primary == null ? null : new ImageResponse(primary.getUrl(), primary.getAlt(), primary.getPosition()),
                product.getCreatedAt());
    }

    private static AdminProductDetailResponse toDetail(Product product, List<ProductImage> productImages) {
        return new AdminProductDetailResponse(product.getId(), product.getSlug(), product.getName(),
                product.getDescription(), product.getShortDescription(), product.getStatus(),
                toCategoryRef(product),
                product.getVariants().stream().map(CatalogAdminService::toVariantDto).toList(),
                productImages.stream()
                        .map(i -> new ImageResponse(i.getUrl(), i.getAlt(), i.getPosition())).toList(),
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
}
