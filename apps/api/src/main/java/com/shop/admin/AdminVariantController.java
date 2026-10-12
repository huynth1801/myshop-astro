package com.shop.admin;

import com.shop.admin.dto.UpdateVariantRequest;
import com.shop.catalog.CatalogAdminService;
import com.shop.catalog.dto.VariantResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/variants")
public class AdminVariantController {

    private final CatalogAdminService admin;

    public AdminVariantController(CatalogAdminService admin) {
        this.admin = admin;
    }

    @PatchMapping("/{variantId}")
    public VariantResponse updateVariant(@PathVariable UUID variantId,
            @Valid @RequestBody UpdateVariantRequest body) {
        return admin.updateVariant(variantId, body);
    }

    @DeleteMapping("/{variantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVariant(@PathVariable UUID variantId) {
        admin.deleteVariant(variantId);
    }
}
