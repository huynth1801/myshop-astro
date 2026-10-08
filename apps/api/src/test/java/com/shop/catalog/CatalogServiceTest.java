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
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

    @Mock
    private ProductRepository products;

    @Mock
    private ProductImageRepository images;

    @InjectMocks
    private CatalogService catalogService;

    @Test
    void listProductsMapsSummariesWithPrimaryImageAndPageMetadata() {
        UUID teeId = UUID.randomUUID();
        UUID capId = UUID.randomUUID();
        ProductSummaryView tee = view(teeId, "classic-tee", "Classic Tee", "A tee", 1900L, "apparel", "Apparel");
        ProductSummaryView cap = view(capId, "field-cap", "Field Cap", null, null, "accessories", "Accessories");

        ProductImage teeImage = image("https://img/tee.jpg", "Tee front", 0, teeId);
        ProductImage teeImageSecondary = image("https://img/tee-2.jpg", "Tee back", 1, teeId);

        when(products.findSummariesOrderByNewest(PageRequest.of(0, 12)))
                .thenReturn(new PageImpl<>(List.of(tee, cap), PageRequest.of(0, 12), 2));
        when(images.findByProductIdInOrderByPositionAsc(any()))
                .thenReturn(List.of(teeImage, teeImageSecondary)); // position order; first per product wins

        PagedResponse<ProductSummaryResponse> result = catalogService.listProducts(0, 12, "newest");

        assertThat(result.totalElements()).isEqualTo(2);
        assertThat(result.page()).isZero();
        assertThat(result.content()).hasSize(2);

        ProductSummaryResponse teeResponse = result.content().get(0);
        assertThat(teeResponse.slug()).isEqualTo("classic-tee");
        assertThat(teeResponse.priceFromCents()).isEqualTo(1900L);
        assertThat(teeResponse.image().url()).isEqualTo("https://img/tee.jpg");
        assertThat(teeResponse.category().slug()).isEqualTo("apparel");

        ProductSummaryResponse capResponse = result.content().get(1);
        assertThat(capResponse.image()).isNull(); // no images for the cap
        assertThat(capResponse.priceFromCents()).isNull(); // no variants → null, never 0
    }

    @Test
    void listProductsRejectsUnknownSort() {
        assertThatThrownBy(() -> catalogService.listProducts(0, 12, "garbage"))
                .isInstanceOf(IllegalArgumentException.class);
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
        when(variant.getPriceCents()).thenReturn(1900L);
        when(variant.getCompareAtPriceCents()).thenReturn(2400L);
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
        assertThat(detail.variants().get(0).priceCents()).isEqualTo(1900L);
        assertThat(detail.variants().get(0).attributes()).containsEntry("size", "M");
        assertThat(detail.images()).hasSize(1);
        assertThat(detail.images().get(0).alt()).isEqualTo("Tee front");
    }

    @Test
    void getProductThrowsForUnknownSlug() {
        when(products.findDetailBySlug("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogService.getProduct("missing"))
                .isInstanceOf(ProductNotFoundException.class)
                .hasMessageContaining("missing");
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

    /**
     * All stubs are lenient: list tests read getProduct() but not the fields when
     * the image is skipped by putIfAbsent; the detail test reads fields but never
     * getProduct(). Strictness still applies to the @Mock fields.
     */
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
}
