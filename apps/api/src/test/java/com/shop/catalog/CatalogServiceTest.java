package com.shop.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.shop.catalog.dto.ProductDetailResponse;
import com.shop.catalog.dto.ProductSummaryResponse;
import com.shop.common.web.PagedResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    @Mock
    private ProductRepository products;

    @Mock
    private ProductImageRepository images;

    @Mock
    private ProductVariantRepository variants;

    @Mock
    private CategoryRepository categories;

    @Mock
    private RelatedProductRepository relatedProducts;

    @InjectMocks
    private CatalogService catalogService;

    @Test
    void listProductsMapsSummariesWithImagesVariantsAndPageMetadata() {
        UUID teeId = UUID.randomUUID();
        UUID teeDefaultVariant = UUID.randomUUID();
        ProductSummaryView tee = view(teeId, "classic-tee", "Classic Tee", "A tee", 45_000_000L, "apparel", "Apparel");
        ProductSummaryView cap = view(UUID.randomUUID(), "field-cap", "Field Cap", null, null, "accessories", "Accessories");

        ProductImage teePrimary = image("https://img/tee.jpg", "Tee front", 0, teeId);
        ProductImage teeHover = image("https://img/tee-2.jpg", "Tee back", 1, teeId);
        ProductVariant teeVariant = variant(teeDefaultVariant, teeId, 42);

        when(products.findSummariesOrderByNewest(PageRequest.of(0, 12)))
                .thenReturn(new PageImpl<>(List.of(tee, cap), PageRequest.of(0, 12), 2));
        when(images.findByProductIdInOrderByPositionAsc(any())).thenReturn(List.of(teePrimary, teeHover));
        when(variants.findByProductIdInOrderBySkuAsc(any())).thenReturn(List.of(teeVariant));

        PagedResponse<ProductSummaryResponse> result = catalogService.listProducts(0, 12, "newest");

        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.page()).isZero();

        ProductSummaryResponse teeResponse = result.content().get(0);
        assertThat(teeResponse.slug()).isEqualTo("classic-tee");
        assertThat(teeResponse.priceFromCents()).isEqualTo(45_000_000L);
        assertThat(teeResponse.compareAtFromCents()).isNull();
        assertThat(teeResponse.image().url()).isEqualTo("https://img/tee.jpg");
        assertThat(teeResponse.hoverImage().url()).isEqualTo("https://img/tee-2.jpg");
        assertThat(teeResponse.defaultVariantId()).isEqualTo(teeDefaultVariant);
        assertThat(teeResponse.inStock()).isTrue();
        assertThat(teeResponse.createdAt()).isNotNull();

        ProductSummaryResponse capResponse = result.content().get(1);
        assertThat(capResponse.image()).isNull();
        assertThat(capResponse.hoverImage()).isNull();
        assertThat(capResponse.defaultVariantId()).isNull(); // no variants
        assertThat(capResponse.inStock()).isFalse();
        assertThat(capResponse.priceFromCents()).isNull(); // no variants → null, never 0
    }

    @Test
    void listProductsRejectsUnknownSort() {
        assertThatThrownBy(() -> catalogService.listProducts(0, 12, "garbage"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void listProductsByCategoryValidatesSlugThenQueries() {
        UUID id = UUID.randomUUID();
        ProductSummaryView tee = view(id, "classic-tee", "Classic Tee", "A tee", 45_000_000L, "apparel", "Apparel");
        Category apparel = mock(Category.class);

        when(categories.findBySlug("apparel")).thenReturn(Optional.of(apparel));
        when(products.findSummariesByCategoryOrderByNewest("apparel", PageRequest.of(0, 12)))
                .thenReturn(new PageImpl<>(List.of(tee), PageRequest.of(0, 12), 1));
        when(images.findByProductIdInOrderByPositionAsc(any())).thenReturn(List.of());
        when(variants.findByProductIdInOrderBySkuAsc(any())).thenReturn(List.of());

        PagedResponse<ProductSummaryResponse> result =
                catalogService.listProductsByCategory("apparel", 0, 12, "newest");

        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.content().get(0).inStock()).isFalse();
    }

    @Test
    void listProductsByCategoryThrowsForUnknownSlug() {
        when(categories.findBySlug("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogService.listProductsByCategory("missing", 0, 12, "newest"))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void getProductReturnsDetailWithVariantsImagesAndStockFlag() {
        Product product = mock(Product.class);
        Category category = mock(Category.class);
        ProductVariant variant = mock(ProductVariant.class);

        UUID productId = UUID.randomUUID();
        when(product.getId()).thenReturn(productId);
        when(product.getSlug()).thenReturn("classic-tee");
        when(product.getName()).thenReturn("Classic Tee");
        when(product.getDescription()).thenReturn("Long description");
        when(product.getShortDescription()).thenReturn("Short description");
        when(product.getCategory()).thenReturn(category);
        when(category.getSlug()).thenReturn("apparel");
        when(category.getName()).thenReturn("Apparel");
        when(product.getVariants()).thenReturn(List.of(variant));
        when(variant.getId()).thenReturn(UUID.randomUUID());
        when(variant.getSku()).thenReturn("TEE-CLS-M");
        when(variant.getPriceCents()).thenReturn(45_000_000L);
        when(variant.getCompareAtPriceCents()).thenReturn(59_000_000L);
        when(variant.getStock()).thenReturn(35);
        when(variant.getAttributes()).thenReturn(Map.of("size", "M"));

        List<ProductImage> productImages =
                List.of(image("https://img/tee.jpg", "Tee front", 0, productId));
        when(products.findDetailBySlug("classic-tee")).thenReturn(Optional.of(product));
        when(images.findByProductIdOrderByPositionAsc(productId)).thenReturn(productImages);

        ProductDetailResponse detail = catalogService.getProduct("classic-tee");

        assertThat(detail.slug()).isEqualTo("classic-tee");
        assertThat(detail.inStock()).isTrue();
        assertThat(detail.variants()).hasSize(1);
        assertThat(detail.variants().get(0).priceCents()).isEqualTo(45_000_000L);
        assertThat(detail.variants().get(0).attributes()).containsEntry("size", "M");
        assertThat(detail.images()).hasSize(1);
    }

    @Test
    void getProductThrowsForUnknownSlug() {
        when(products.findDetailBySlug("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogService.getProduct("missing"))
                .isInstanceOf(ProductNotFoundException.class)
                .hasMessageContaining("missing");
    }

    // --- recommendations ---

    @Test
    void listRecommendationsKeepsCuratedOrderAndLimits() {
        UUID teeId = UUID.randomUUID();
        UUID mugId = UUID.randomUUID();
        UUID capId = UUID.randomUUID();
        // curated order: mug, cap — repo returns them newest-first (reversed)
        ProductSummaryView mug = view(mugId, "enamel-camp-mug", "Mug", null, 29_000_000L, "accessories", "Accessories");
        ProductSummaryView cap = view(capId, "field-cap", "Cap", null, 65_000_000L, "accessories", "Accessories");

        when(products.findIdBySlugAndStatus("classic-tee")).thenReturn(Optional.of(teeId));
        List<RelatedProduct> curated = List.of(related(mugId), related(capId)); // build trước (Mockito)
        when(relatedProducts.findByProductIdAndTypeOrderByRelatedProductIdAsc(teeId, RelatedType.CROSS_SELL))
                .thenReturn(curated);
        when(products.findSummariesByIdIn(any())).thenReturn(List.of(cap, mug)); // thứ tự khác mapping
        when(images.findByProductIdInOrderByPositionAsc(any())).thenReturn(List.of());
        when(variants.findByProductIdInOrderBySkuAsc(any())).thenReturn(List.of());

        List<ProductSummaryResponse> result =
                catalogService.listRecommendations("classic-tee", RelatedType.CROSS_SELL, 1);

        assertThat(result).hasSize(1); // limit áp sau khi đúng thứ tự
        assertThat(result.get(0).slug()).isEqualTo("enamel-camp-mug"); // theo curated mapping
    }

    @Test
    void listRecommendationsReturnsAllWhenUnderLimit() {
        UUID teeId = UUID.randomUUID();
        UUID mugId = UUID.randomUUID();
        ProductSummaryView mug = view(mugId, "enamel-camp-mug", "Mug", null, 29_000_000L, "accessories", "Accessories");

        when(products.findIdBySlugAndStatus("classic-tee")).thenReturn(Optional.of(teeId));
        List<RelatedProduct> curated = List.of(related(mugId)); // build trước (Mockito)
        when(relatedProducts.findByProductIdAndTypeOrderByRelatedProductIdAsc(teeId, RelatedType.CROSS_SELL))
                .thenReturn(curated);
        when(products.findSummariesByIdIn(any())).thenReturn(List.of(mug));
        when(images.findByProductIdInOrderByPositionAsc(any())).thenReturn(List.of());
        when(variants.findByProductIdInOrderBySkuAsc(any())).thenReturn(List.of());

        assertThat(catalogService.listRecommendations("classic-tee", RelatedType.CROSS_SELL, 3))
                .extracting(ProductSummaryResponse::slug)
                .containsExactly("enamel-camp-mug");
    }

    @Test
    void listRecommendationsEmptyWhenNothingCurated() {
        when(products.findIdBySlugAndStatus("field-cap")).thenReturn(Optional.of(UUID.randomUUID()));
        when(relatedProducts.findByProductIdAndTypeOrderByRelatedProductIdAsc(any(UUID.class), any(RelatedType.class)))
                .thenReturn(List.of());

        assertThat(catalogService.listRecommendations("field-cap", RelatedType.UPSELL, 3)).isEmpty();
    }

    @Test
    void listRecommendationsThrowsForUnknownSlug() {
        when(products.findIdBySlugAndStatus("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogService.listRecommendations("missing", RelatedType.CROSS_SELL, 3))
                .isInstanceOf(ProductNotFoundException.class);
    }

    private static RelatedProduct related(UUID relatedProductId) {
        RelatedProduct rp = mock(RelatedProduct.class);
        lenient().when(rp.getRelatedProductId()).thenReturn(relatedProductId);
        return rp;
    }

    private static ProductSummaryView view(UUID id, String slug, String name, String shortDescription,
            Long priceFromCents, String categorySlug, String categoryName) {
        return new ProductSummaryView() {
            @Override
            public UUID getId() {
                return id;
            }

            @Override
            public String getSlug() {
                return slug;
            }

            @Override
            public String getName() {
                return name;
            }

            @Override
            public String getShortDescription() {
                return shortDescription;
            }

            @Override
            public Long getPriceFromCents() {
                return priceFromCents;
            }

            @Override
            public Long getCompareAtFromCents() {
                return null;
            }

            @Override
            public Instant getCreatedAt() {
                return Instant.EPOCH;
            }

            @Override
            public String getCategorySlug() {
                return categorySlug;
            }

            @Override
            public String getCategoryName() {
                return categoryName;
            }
        };
    }

    private static ProductImage image(String url, String alt, int position, UUID productId) {
        ProductImage image = mock(ProductImage.class);
        Product product = mock(Product.class);
        lenient().when(product.getId()).thenReturn(productId);
        lenient().when(image.getProduct()).thenReturn(product);
        lenient().when(image.getUrl()).thenReturn(url);
        lenient().when(image.getAlt()).thenReturn(alt);
        lenient().when(image.getPosition()).thenReturn(position);
        return image;
    }

    private static ProductVariant variant(UUID id, UUID productId, int stock) {
        ProductVariant variant = mock(ProductVariant.class);
        Product product = mock(Product.class);
        lenient().when(product.getId()).thenReturn(productId);
        lenient().when(variant.getProduct()).thenReturn(product);
        lenient().when(variant.getId()).thenReturn(id);
        lenient().when(variant.getStock()).thenReturn(stock);
        return variant;
    }
}
