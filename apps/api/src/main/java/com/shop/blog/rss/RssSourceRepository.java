package com.shop.blog.rss;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RssSourceRepository extends JpaRepository<RssSource, UUID> {

    Page<RssSource> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<RssSource> findAllByIsActiveTrue();

    boolean existsByUrl(String url);

    Optional<RssSource> findByUrl(String url);
}
