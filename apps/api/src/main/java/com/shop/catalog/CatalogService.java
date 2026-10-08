package com.shop.catalog;

import com.shop.catalog.dto.CategoryResponse;
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
    private final ProductVariantRepository variants;
    private final CategoryRepository categories;

    public CatalogService(ProductRepository products, ProductImageRepository images,
            ProductVariantRepository variants, CategoryRepository categories) {
        this.products = products;
        this.images = images;
        this.variants = variants;
        this.categories = categories;
    }

    public PagedResponse<ProductSummaryResponse> listProducts(int page, int size, String sort) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProductSummaryView> result = switch (sort) {
            case "price_asc" -> products.findSummariesOrderByPriceAsc(pageable);
            case "price_desc" -> products.findSummariesOrderByPriceDesc(pageable);
            case "newest" -> products.findSummariesOrderByNewest(pageable);
            default -> throw new IllegalArgumentException("sort must be newest, price_asc or price_desc");
        };
        return toPagedResponse(result);
    }

    public PagedResponse<ProductSummaryResponse> listProductsByCategory(String categorySlug,
            int page, int size, String sort) {
        categories.findBySlug(categorySlug)
                .orElseThrow(() -> new CategoryNotFoundException(categorySlug));
        Pageable pageable = PageRequest.of(page, size);
        Page<ProductSummaryView> result = switch (sort) {
            case "price_asc" -> products.findSummariesByCategoryOrderByPriceAsc(categorySlug, pageable);
            case "price_desc" -> products.findSummariesByCategoryOrderByPriceDesc(categorySlug, pageable);
            case "newest" -> products.findSummariesByCategoryOrderByNewest(categorySlug, pageable);
            default -> throw new IllegalArgumentException("sort must be newest, price_asc or price_desc");
        };
        return toPagedResponse(result);
    }

    public List<CategoryResponse> listCategories() {
        return categories.findAllByOrderByPositionAsc().stream()
                .map(c -> new CategoryResponse(c.getSlug(), c.getName(), c.getParent() != null))
                .toList();
    }

    public ProductDetailResponse getProduct(String slug) {
        Product product = products.findDetailBySlug(slug)
                .orElseThrow(() -> new ProductNotFoundException(slug));
        return ProductMapper.toDetail(product, images.findByProductIdOrderByPositionAsc(product.getId()));
    }

    /**
     * Enriches a whole page in THREE queries total: the page itself, one batched
     * image query (primary + hover), one batched variant query (quick-add
     * default variant + inStock). Never per-row — no N+1 (AGENTS.md).
     */
    private PagedResponse<ProductSummaryResponse> toPagedResponse(Page<ProductSummaryView> result) {
        List<ProductSummaryView> views = result.getContent();
        List<UUID> productIds = views.stream().map(ProductSummaryView::getId).toList();

        Map<UUID, List<ProductImage>> imagesByProduct = new HashMap<>();
        for (ProductImage image : images.findByProductIdInOrderByPositionAsc(productIds)) {
            imagesByProduct.computeIfAbsent(image.getProduct().getId(), k -> new java.util.ArrayList<>())
                    .add(image);
        }

        Map<UUID, List<ProductVariant>> variantsByProduct = new HashMap<>();
        for (ProductVariant variant : variants.findByProductIdInOrderBySkuAsc(productIds)) {
            variantsByProduct.computeIfAbsent(variant.getProduct().getId(), k -> new java.util.ArrayList<>())
                    .add(variant);
        }

        List<ProductSummaryResponse> content = views.stream()
                .map(view -> toSummary(view, imagesByProduct, variantsByProduct))
                .toList();
        return new PagedResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    private ProductSummaryResponse toSummary(ProductSummaryView view,
            Map<UUID, List<ProductImage>> imagesByProduct,
            Map<UUID, List<ProductVariant>> variantsByProduct) {

        List<ProductImage> productImages = imagesByProduct.getOrDefault(view.getId(), List.of());
        ProductImage primary = productImages.isEmpty() ? null : productImages.get(0);
        ProductImage hover = productImages.size() > 1 ? productImages.get(1) : null;

        UUID defaultVariantId = null;
        boolean inStock = false;
        for (ProductVariant variant : variantsByProduct.getOrDefault(view.getId(), List.of())) {
            if (variant.getStock() > 0) {
                inStock = true;
                if (defaultVariantId == null) {
                    defaultVariantId = variant.getId();
                }
            }
        }
        return ProductMapper.toSummary(view, primary, hover, defaultVariantId, inStock);
    }
}
