package com.shop.blog;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRelatedProductRepository extends JpaRepository<PostRelatedProduct, PostRelatedProductId> {

    @Query("select prp.product.id from PostRelatedProduct prp where prp.post.id = :postId order by prp.position asc")
    List<UUID> findProductIdsByPostId(@Param("postId") UUID postId);

    void deleteByPostId(UUID postId);
}
