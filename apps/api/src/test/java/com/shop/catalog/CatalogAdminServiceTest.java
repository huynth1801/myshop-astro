package com.shop.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.admin.dto.AdminProductSummaryResponse;
import com.shop.admin.dto.CreateCategoryRequest;
import com.shop.admin.dto.CreateProductRequest;
import com.shop.admin.dto.CreateVariantRequest;
import com.shop.admin.dto.UpdateProductRequest;
import com.shop.admin.dto.UpdateVariantRequest;
import com.shop.catalog.dto.CategoryResponse;
import com.shop.catalog.dto.VariantResponse;
import com.shop.common.file.FileStorage;
import com.shop.common.file.InvalidUploadException;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class CatalogAdminServiceTest {

    @Mock
    private ProductRepository products;

    @Mock
    private ProductVariantRepository variants;

    @Mock
    private ProductImageRepository images;

    @Mock
    private CategoryRepository categories;

    @Mock
    private FileStorage storage;

    @InjectMocks
    private CatalogAdminService service;

    private final Category apparel = Category.newCategory("Đồ mặc", "apparel", null);

    @Test
    void listProductsAppliesImageThumbnailAndPriceRange() throws Exception {
        Product product = Product.newProduct("Áo", "ao", "mô tả", "ngắn", ProductStatus.ACTIVE, apparel);
        UUID productId = UUID.randomUUID();
        giveId(product, productId);
        ProductVariant cheap = ProductVariant.newVariant(product, "SKU-1", 100_000L, null, 2, Map.of());
        ProductVariant pricey = ProductVariant.newVariant(product, "SKU-2", 250_000L, null, 0, Map.of());
        ProductImage hero = ProductImage.newImage(product, "/images/ao-1.jpg", "Áo", 0);
        ProductImage hover = ProductImage.newImage(product, "/images/ao-2.jpg", "Áo lưng", 1);

        when(products.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(product), PageRequest.of(0, 20), 1));
        when(variants.findByProductIdInOrderBySkuAsc(any())).thenReturn(List.of(cheap, pricey));
        when(images.findByProductIdInOrderByPositionAsc(any())).thenReturn(List.of(hero, hover));

        PagedResponse<AdminProductSummaryResponse> page =
                service.listProducts("áo", ProductStatus.ACTIVE, null, 0, 20);

        var row = page.content().get(0);
        assertThat(row.priceFromCents()).isEqualTo(100_000L);
        assertThat(row.priceToCents()).isEqualTo(250_000L);
        assertThat(row.image().url()).isEqualTo("/images/ao-1.jpg"); // primary = position 0
        assertThat(row.variants()).hasSize(2);
    }

    @Test
    void addImageByUrlAppendsAtNextPosition() throws Exception {
        Product product = Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel);
        UUID productId = UUID.randomUUID();
        giveId(product, productId);
        when(products.findById(productId)).thenReturn(Optional.of(product));
        ProductImage last = mock(ProductImage.class);
        when(last.getPosition()).thenReturn(1);
        when(images.findFirstByProductIdOrderByPositionDesc(productId)).thenReturn(Optional.of(last));
        when(images.save(any(ProductImage.class))).thenAnswer(inv -> inv.getArgument(0));
        when(images.findByProductIdOrderByPositionAsc(productId)).thenReturn(List.of());

        service.addImageByUrl(productId, "/images/new.jpg", "Ảnh mới");

        ArgumentCaptor<ProductImage> saved = ArgumentCaptor.forClass(ProductImage.class);
        verify(images).save(saved.capture());
        assertThat(saved.getValue().getUrl()).isEqualTo("/images/new.jpg");
        assertThat(saved.getValue().getPosition()).isEqualTo(2);
        assertThat(saved.getValue().getAlt()).isEqualTo("Ảnh mới");
    }

    @Test
    void reorderImagesReassignsPositionsInGivenOrder() throws Exception {
        Product product = Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel);
        UUID productId = UUID.randomUUID();
        giveId(product, productId);
        when(products.findById(productId)).thenReturn(Optional.of(product));
        when(products.findDetailById(productId)).thenReturn(Optional.of(product));

        UUID firstId = UUID.randomUUID();
        UUID secondId = UUID.randomUUID();
        ProductImage a = ProductImage.newImage(product, "/a.jpg", "a", 0);
        ProductImage b = ProductImage.newImage(product, "/b.jpg", "b", 1);
        giveImageIds(Map.of(a, firstId, b, secondId));
        when(images.findByProductIdOrderByPositionAsc(productId)).thenReturn(List.of(a, b));

        service.reorderImages(productId, List.of(secondId, firstId)); // b lên làm ảnh chính

        assertThat(a.getPosition()).isEqualTo(1);
        assertThat(b.getPosition()).isEqualTo(0);
    }

    @Test
    void reorderImagesRejectsMismatchedIdSet() throws Exception {
        Product product = Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel);
        UUID productId = UUID.randomUUID();
        giveId(product, productId);
        when(products.findById(productId)).thenReturn(Optional.of(product));
        ProductImage a = ProductImage.newImage(product, "/a.jpg", "a", 0);
        ProductImage b = ProductImage.newImage(product, "/b.jpg", "b", 1);
        when(images.findByProductIdOrderByPositionAsc(productId)).thenReturn(List.of(a, b));

        assertThatThrownBy(() -> service.reorderImages(productId,
                List.of(UUID.randomUUID()))) // không khớp bộ ảnh
                .isInstanceOf(ImageSetMismatchException.class);
    }

    @Test
    void deleteImageIsScopedToTheProduct() throws Exception {
        Product product = Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel);
        UUID productId = UUID.randomUUID();
        giveId(product, productId);
        UUID imageId = UUID.randomUUID();
        when(products.findById(productId)).thenReturn(Optional.of(product));
        when(images.findByIdAndProductId(imageId, productId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteImage(productId, imageId))
                .isInstanceOf(ImageNotFoundException.class);
    }

    @Test
    void deleteVariantTranslatesFkViolationToInUse() {
        ProductVariant variant = ProductVariant.newVariant(
                Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel),
                "SKU-1", 100_000L, null, 5, Map.of());
        UUID variantId = UUID.randomUUID();
        when(variants.findById(variantId)).thenReturn(Optional.of(variant));
        doThrow(new DataIntegrityViolationException("cart_items FK"))
                .when(variants).flush();

        assertThatThrownBy(() -> service.deleteVariant(variantId))
                .isInstanceOf(VariantInUseException.class);
    }

    @Test
    void deleteVariantRemovesWhenNothingReferencesIt() {
        ProductVariant variant = ProductVariant.newVariant(
                Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel),
                "SKU-1", 100_000L, null, 5, Map.of());
        UUID variantId = UUID.randomUUID();
        when(variants.findById(variantId)).thenReturn(Optional.of(variant));

        service.deleteVariant(variantId);

        verify(variants).delete(variant);
        verify(variants).flush();
    }

    @Test
    void uploadImageStoresFileAndAttachesServedUrl() throws Exception {
        Product product = Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel);
        UUID productId = UUID.randomUUID();
        giveId(product, productId);
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1, 2});
        when(products.findById(productId)).thenReturn(Optional.of(product));
        when(storage.store(any(), anyString())).thenReturn("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg");
        when(images.findFirstByProductIdOrderByPositionDesc(productId)).thenReturn(Optional.empty());
        when(images.save(any(ProductImage.class))).thenAnswer(inv -> inv.getArgument(0));
        when(images.findByProductIdOrderByPositionAsc(productId)).thenReturn(List.of());

        service.uploadImage(productId, file, "Ảnh upload");

        ArgumentCaptor<ProductImage> saved = ArgumentCaptor.forClass(ProductImage.class);
        verify(images).save(saved.capture());
        assertThat(saved.getValue().getUrl())
                .isEqualTo("/api/v1/files/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg");
        assertThat(saved.getValue().getPosition()).isZero(); // ảnh đầu tiên
        assertThat(saved.getValue().getAlt()).isEqualTo("Ảnh upload");
    }

    @Test
    void uploadImageRejectsFilesOver5Mb() throws Exception {
        UUID productId = UUID.randomUUID();
        byte[] tooBig = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile("file", "big.jpg", "image/jpeg", tooBig);

        assertThatThrownBy(() -> service.uploadImage(productId, file, null))
                .isInstanceOf(InvalidUploadException.class)
                .hasMessageContaining("5 MB");
        verify(storage, never()).store(any(), anyString());
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
        when(images.findByProductIdOrderByPositionAsc(id)).thenReturn(List.of());

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
        when(images.findByProductIdOrderByPositionAsc(id)).thenReturn(List.of());

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
                new UpdateVariantRequest(null, 120_000L, null, null, null));

        assertThat(updated.priceCents()).isEqualTo(120_000L);
        assertThat(updated.compareAtPriceCents()).isEqualTo(150_000L); // unchanged
        assertThat(updated.stock()).isEqualTo(5); // unchanged
        assertThat(updated.sku()).isEqualTo("SKU-1"); // unchanged
        assertThat(updated.attributes()).containsEntry("size", "M"); // unchanged
    }

    @Test
    void updateVariantUpdatesSkuAndAttributes() {
        ProductVariant stored = ProductVariant.newVariant(
                Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel),
                "SKU-OLD", 100_000L, 150_000L, 5, Map.of("size", "M"));
        UUID variantId = UUID.randomUUID();
        when(variants.findById(variantId)).thenReturn(Optional.of(stored));
        when(variants.existsBySku("SKU-NEW")).thenReturn(false);

        VariantResponse updated = service.updateVariant(variantId,
                new UpdateVariantRequest("SKU-NEW", 120_000L, null, 10, Map.of("size", "L", "color", "Đen")));

        assertThat(updated.sku()).isEqualTo("SKU-NEW");
        assertThat(updated.priceCents()).isEqualTo(120_000L);
        assertThat(updated.stock()).isEqualTo(10);
        assertThat(updated.attributes()).containsEntry("size", "L").containsEntry("color", "Đen");
    }

    @Test
    void updateVariantRejectsTakenSku() {
        ProductVariant stored = ProductVariant.newVariant(
                Product.newProduct("Áo", "ao", null, null, ProductStatus.ACTIVE, apparel),
                "SKU-OLD", 100_000L, null, 5, Map.of());
        UUID variantId = UUID.randomUUID();
        when(variants.findById(variantId)).thenReturn(Optional.of(stored));
        when(variants.existsBySku("SKU-TAKEN")).thenReturn(true);

        assertThatThrownBy(() -> service.updateVariant(variantId,
                new UpdateVariantRequest("SKU-TAKEN", null, null, null, null)))
                .isInstanceOf(SkuTakenException.class);
    }

    @Test
    void updateVariantThrowsWhenMissing() {
        UUID variantId = UUID.randomUUID();
        when(variants.findById(variantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateVariant(variantId,
                new UpdateVariantRequest(null, 1L, null, null, null)))
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

    private static void giveImageIds(Map<ProductImage, UUID> ids) throws Exception {
        Field field = ProductImage.class.getDeclaredField("id");
        field.setAccessible(true);
        for (Map.Entry<ProductImage, UUID> entry : ids.entrySet()) {
            field.set(entry.getKey(), entry.getValue());
        }
    }
}
