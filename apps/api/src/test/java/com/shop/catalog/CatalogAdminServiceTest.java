package com.shop.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.admin.dto.CreateCategoryRequest;
import com.shop.admin.dto.CreateProductRequest;
import com.shop.admin.dto.CreateVariantRequest;
import com.shop.admin.dto.UpdateProductRequest;
import com.shop.admin.dto.UpdateVariantRequest;
import com.shop.catalog.dto.CategoryResponse;
import com.shop.catalog.dto.VariantResponse;
import com.shop.common.web.PagedResponse;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class CatalogAdminServiceTest {

    @Mock
    private ProductRepository products;

    @Mock
    private ProductVariantRepository variants;

    @Mock
    private CategoryRepository categories;

    @InjectMocks
    private CatalogAdminService service;

    private final Category apparel = Category.newCategory("Đồ mặc", "apparel", null);

    @Test
    void listProductsAggregatesVariantStats() throws Exception {
        Product withVariants = Product.newProduct("Áo", "ao", "mô tả", "ngắn",
                ProductStatus.ACTIVE, apparel);
        giveId(withVariants, UUID.randomUUID());
        Product bare = Product.newProduct("Túi", "tui", null, null, ProductStatus.DRAFT, apparel);
        giveId(bare, UUID.randomUUID());
        ProductVariant cheap = ProductVariant.newVariant(withVariants, "SKU-1", 100_000L, null, 2, Map.of());
        ProductVariant pricey = ProductVariant.newVariant(withVariants, "SKU-2", 250_000L, 300_000L, 0, Map.of());

        when(products.findAll(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(withVariants, bare), PageRequest.of(0, 20), 2));
        when(variants.findByProductIdInOrderBySkuAsc(any())).thenReturn(List.of(cheap, pricey));

        PagedResponse<com.shop.admin.dto.AdminProductSummaryResponse> page = service.listProducts(0, 20);

        assertThat(page.totalElements()).isEqualTo(2);
        var first = page.content().get(0);
        assertThat(first.priceFromCents()).isEqualTo(100_000L);
        assertThat(first.variantCount()).isEqualTo(2);
        assertThat(first.totalStock()).isEqualTo(2);
        assertThat(first.inStock()).isTrue();
        var second = page.content().get(1);
        assertThat(second.priceFromCents()).isNull();
        assertThat(second.variantCount()).isZero();
        assertThat(second.inStock()).isFalse();
    }

    @Test
    void createProductRejectsTakenSlug() {
        when(products.existsBySlug("ao")).thenReturn(true);

        assertThatThrownBy(() -> service.createProduct(
                new CreateProductRequest("Áo", "ao", null, null, ProductStatus.DRAFT, UUID.randomUUID())))
                .isInstanceOf(SlugTakenException.class);
        verify(products, never()).save(any(Product.class));
    }

    @Test
    void createProductRejectsUnknownCategory() {
        UUID categoryId = UUID.randomUUID();
        when(products.existsBySlug("ao")).thenReturn(false);
        when(categories.findById(categoryId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createProduct(
                new CreateProductRequest("Áo", "ao", null, null, ProductStatus.DRAFT, categoryId)))
                .isInstanceOf(CategoryNotFoundException.class);
    }

    @Test
    void createProductFillsNotNullDefaults() {
        UUID categoryId = UUID.randomUUID();
        when(products.existsBySlug("ao")).thenReturn(false);
        when(categories.findById(categoryId)).thenReturn(Optional.of(apparel));
        when(products.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createProduct(new CreateProductRequest("Áo", "ao", null, null, ProductStatus.DRAFT, categoryId));

        ArgumentCaptor<Product> saved = ArgumentCaptor.forClass(Product.class);
        verify(products).save(saved.capture());
        assertThat(saved.getValue().getDescription()).isEmpty(); // NOT NULL column, never null
        assertThat(saved.getValue().getShortDescription()).isEmpty();
        assertThat(saved.getValue().getStatus()).isEqualTo(ProductStatus.DRAFT);
        assertThat(saved.getValue().getCategory()).isSameAs(apparel);
    }

    @Test
    void updateProductAppliesOnlyProvidedFields() throws Exception {
        Product stored = Product.newProduct("Áo cũ", "ao", "mô tả cũ", "ngắn cũ",
                ProductStatus.DRAFT, apparel);
        UUID id = UUID.randomUUID();
        when(products.findDetailById(id)).thenReturn(Optional.of(stored));

        service.updateProduct(id, new UpdateProductRequest(null, null, null, ProductStatus.ACTIVE, null));

        assertThat(stored.getStatus()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(stored.getName()).isEqualTo("Áo cũ"); // absent → unchanged
        assertThat(stored.getDescription()).isEqualTo("mô tả cũ");
        verify(products, never()).save(any(Product.class)); // dirty checking, no explicit save
    }

    @Test
    void updateProductThrowsWhenMissing() {
        UUID id = UUID.randomUUID();
        when(products.findDetailById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateProduct(id,
                new UpdateProductRequest("x", null, null, null, null)))
                .isInstanceOf(ProductNotFoundException.class);
    }

    @Test
    void addVariantRejectsTakenSku() throws Exception {
        Product stored = Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel);
        UUID id = UUID.randomUUID();
        when(products.findDetailById(id)).thenReturn(Optional.of(stored));
        when(variants.existsBySku("SKU-1")).thenReturn(true);

        assertThatThrownBy(() -> service.addVariant(id,
                new CreateVariantRequest("SKU-1", 100_000L, null, 5, null)))
                .isInstanceOf(SkuTakenException.class);
        verify(variants, never()).save(any(ProductVariant.class));
    }

    @Test
    void addVariantDefaultsAttributesAndAppearsInDetail() throws Exception {
        Product stored = Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel);
        UUID id = UUID.randomUUID();
        when(products.findDetailById(id)).thenReturn(Optional.of(stored));
        when(variants.existsBySku("SKU-9")).thenReturn(false);
        when(variants.save(any(ProductVariant.class))).thenAnswer(inv -> inv.getArgument(0));

        var detail = service.addVariant(id, new CreateVariantRequest("SKU-9", 199_000L, 249_000L, 7, null));

        ArgumentCaptor<ProductVariant> saved = ArgumentCaptor.forClass(ProductVariant.class);
        verify(variants).save(saved.capture());
        assertThat(saved.getValue().getAttributes()).isEmpty(); // jsonb NOT NULL default '{}'
        assertThat(saved.getValue().getPriceCents()).isEqualTo(199_000L);
        assertThat(detail.variants()).hasSize(1); // association wired on both sides
        assertThat(detail.variants().get(0).sku()).isEqualTo("SKU-9");
    }

    @Test
    void updateVariantTouchesOnlyProvidedFields() {
        ProductVariant stored = ProductVariant.newVariant(
                Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel),
                "SKU-1", 100_000L, 150_000L, 5, Map.of("size", "M"));
        UUID variantId = UUID.randomUUID();
        when(variants.findById(variantId)).thenReturn(Optional.of(stored));

        VariantResponse updated = service.updateVariant(variantId,
                new UpdateVariantRequest(120_000L, null, null));

        assertThat(updated.priceCents()).isEqualTo(120_000L);
        assertThat(updated.compareAtPriceCents()).isEqualTo(150_000L); // unchanged
        assertThat(updated.stock()).isEqualTo(5); // unchanged
    }

    @Test
    void updateVariantThrowsWhenMissing() {
        UUID variantId = UUID.randomUUID();
        when(variants.findById(variantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateVariant(variantId,
                new UpdateVariantRequest(1L, null, null)))
                .isInstanceOf(VariantNotFoundException.class);
    }

    @Test
    void createCategoryRejectsTakenSlug() {
        when(categories.existsBySlug("do-mac")).thenReturn(true);

        assertThatThrownBy(() -> service.createCategory(new CreateCategoryRequest("Đồ mặc", "do-mac", null)))
                .isInstanceOf(SlugTakenException.class);
    }

    @Test
    void createCategoryResolvesParent() {
        UUID parentId = UUID.randomUUID();
        Category parent = Category.newCategory("Đồ mặc", "do-mac", null);
        when(categories.existsBySlug("ao")).thenReturn(false);
        when(categories.findById(parentId)).thenReturn(Optional.of(parent));
        when(categories.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        CategoryResponse created = service.createCategory(new CreateCategoryRequest("Áo", "ao", parentId));

        assertThat(created.hasParent()).isTrue();
    }

    /** Entities get ids from @PrePersist at persist time — tests assign them directly. */
    private static void giveId(Product product, UUID id) throws Exception {
        Field field = Product.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(product, id);
    }
}
