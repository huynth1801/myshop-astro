package com.shop.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    @EntityGraph(attributePaths = "parent")
    List<Category> findAllByOrderByPositionAsc();

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);
}
