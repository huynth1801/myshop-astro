package com.shop.catalog;

import com.shop.catalog.dto.CategoryRefResponse;
import com.shop.catalog.dto.ImageResponse;
import com.shop.catalog.dto.ProductDetailResponse;
import com.shop.catalog.dto.ProductSummaryResponse;
import com.shop.catalog.dto.VariantResponse;
import java.util.List;
import java.util.Map;

/** Explicit entity/projection → DTO mapping (PLAN.md §7: never leak entities). */
public final class ProductMapper {

    private ProductMapper() {
    }

    public static ProductSummaryResponse toSummary(ProductSummaryView view, ProductImage primaryImage) {
        ImageResponse image = primaryImage == null
                ? null
                : new ImageResponse(primaryImage.getUrl(), primaryImage.getAlt(), primaryImage.getPosition());
        return new ProductSummaryResponse(view.getId(), view.getSlug(), view.getName(),
                view.getShortDescription(), view.getPriceFromCents(), image,
                new CategoryRefResponse(view.getCategorySlug(), view.getCategoryName()));
    }

    public static ProductDetailResponse toDetail(Product product, List<ProductImage> images) {
        List<ImageResponse> imageDtos = images.stream()
                .map(img -> new ImageResponse(img.getUrl(), img.getAlt(), img.getPosition()))
                .toList();
        List<VariantResponse> variantDtos = product.getVariants().stream()
                .map(v -> new VariantResponse(v.getId(), v.getSku(), v.getPriceCents(),
                        v.getCompareAtPriceCents(), v.getStock(),
                        v.getAttributes() == null ? Map.of() : v.getAttributes()))
                .toList();
        boolean inStock = product.getVariants().stream().anyMatch(v -> v.getStock() > 0);
        return new ProductDetailResponse(product.getId(), product.getSlug(), product.getName(),
                product.getDescription(), product.getShortDescription(),
                new CategoryRefResponse(product.getCategory().getSlug(), product.getCategory().getName()),
                imageDtos, variantDtos, inStock);
    }
}
