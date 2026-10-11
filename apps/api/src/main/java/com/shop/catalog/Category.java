package com.shop.catalog;

import com.shop.common.uuid.Ids;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    private UUID id;

    private String name;

    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    private Integer position;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = Ids.newId();
        }
    }

    /** Admin create — position 0 (head of the list) matches the column default. */
    static Category newCategory(String name, String slug, Category parent) {
        Category category = new Category();
        category.name = name;
        category.slug = slug;
        category.parent = parent;
        category.position = 0;
        return category;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public Category getParent() {
        return parent;
    }

    public Integer getPosition() {
        return position;
    }
}
