package com.shop.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.shop.admin.dto.AdminProductSummaryResponse;
import com.shop.catalog.CatalogAdminService;
import com.shop.catalog.ProductStatus;
import com.shop.common.web.PagedResponse;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminProductControllerTest {

    private final CatalogAdminService admin = mock(CatalogAdminService.class);
    private final AdminProductController controller = new AdminProductController(admin);

    @Test
    void listProductsDelegatesToService() {
        PagedResponse<AdminProductSummaryResponse> expected =
                new PagedResponse<>(List.of(), 0, 20, 0, 0);
        when(admin.listProducts("test", ProductStatus.ACTIVE, null, 0, 20))
                .thenReturn(expected);

        PagedResponse<AdminProductSummaryResponse> actual =
                controller.listProducts(0, 20, "test", ProductStatus.ACTIVE, null);

        assertThat(actual).isSameAs(expected);
    }
}
