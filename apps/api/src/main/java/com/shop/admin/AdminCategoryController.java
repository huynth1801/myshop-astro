package com.shop.admin;

import com.shop.admin.dto.AdminCategoryResponse;
import com.shop.admin.dto.CreateCategoryRequest;
import com.shop.catalog.CatalogAdminService;
import com.shop.catalog.dto.CategoryResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/categories")
public class AdminCategoryController {

    private final CatalogAdminService admin;

    public AdminCategoryController(CatalogAdminService admin) {
        this.admin = admin;
    }

    /** Category options for the product form — includes ids (public list has none). */
    @GetMapping
    public List<AdminCategoryResponse> listCategories() {
        return admin.listCategories();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse createCategory(@Valid @RequestBody CreateCategoryRequest body) {
        return admin.createCategory(body);
    }
}
