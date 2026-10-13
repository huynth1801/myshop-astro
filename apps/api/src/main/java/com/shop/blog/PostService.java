package com.shop.blog;

import com.shop.blog.dto.AdminCreatePostRequest;
import com.shop.blog.dto.AdminPostDetailResponse;
import com.shop.blog.dto.AdminUpdatePostRequest;
import com.shop.blog.dto.PostDetailResponse;
import com.shop.blog.dto.PostSummaryResponse;
import com.shop.catalog.CatalogService;
import com.shop.catalog.Product;
import com.shop.catalog.ProductRepository;
import com.shop.catalog.SlugTakenException;
import com.shop.catalog.dto.ProductSummaryResponse;
import com.shop.common.web.PagedResponse;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostService {

    private final PostRepository posts;
    private final PostRelatedProductRepository postRelatedProducts;
    private final ProductRepository products;
    private final CatalogService catalogService;

    public PostService(PostRepository posts, PostRelatedProductRepository postRelatedProducts,
            ProductRepository products, CatalogService catalogService) {
        this.posts = posts;
        this.postRelatedProducts = postRelatedProducts;
        this.products = products;
        this.catalogService = catalogService;
    }

    @Transactional(readOnly = true)
    public PagedResponse<PostSummaryResponse> listPublished(Pageable pageable, String tag, String q) {
        Specification<Post> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), PostStatus.PUBLISHED));
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("summary")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Post> page = posts.findAll(spec, pageable);
        return new PagedResponse<>(
                page.getContent().stream().map(PostMapper::toSummary).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional
    public PostDetailResponse getBySlug(String slug) {
        Post post = posts.findBySlugAndStatus(slug, PostStatus.PUBLISHED)
                .orElseThrow(() -> new PostNotFoundException(slug));

        posts.incrementViewCount(post.getId());

        List<UUID> relatedIds = postRelatedProducts.findProductIdsByPostId(post.getId());
        List<ProductSummaryResponse> relatedSummaries = catalogService.getSummariesByIds(relatedIds);

        return PostMapper.toDetail(post, relatedSummaries);
    }

    @Transactional(readOnly = true)
    public PagedResponse<PostSummaryResponse> adminList(Pageable pageable, PostStatus status, String q) {
        Specification<Post> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("summary")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Post> page = posts.findAll(spec, pageable);
        return new PagedResponse<>(
                page.getContent().stream().map(PostMapper::toSummary).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public AdminPostDetailResponse adminGet(UUID id) {
        Post post = posts.findById(id).orElseThrow(() -> new PostNotFoundException(id));
        List<UUID> relatedIds = postRelatedProducts.findProductIdsByPostId(post.getId());
        return PostMapper.toAdminDetail(post, relatedIds);
    }

    @Transactional
    public AdminPostDetailResponse adminCreate(AdminCreatePostRequest req) {
        String slug = req.slug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(req.title());
        } else {
            slug = SlugUtils.toSlug(slug);
        }

        if (posts.existsBySlug(slug)) {
            throw new SlugTakenException(slug);
        }

        Post post = new Post();
        String t = req.title().trim();
        post.setTitle(t.length() > 255 ? t.substring(0, 255) : t);
        post.setSlug(slug.length() > 255 ? slug.substring(0, 255) : slug);
        String s = req.summary() == null ? "" : req.summary().trim();
        post.setSummary(s.length() > 500 ? s.substring(0, 500) : s);
        post.setContent(req.content());
        post.setFeaturedImage(req.featuredImage());
        post.setAuthor(req.author());
        post.setStatus(req.status() == null ? PostStatus.DRAFT : req.status());
        if (req.seoTitle() != null) {
            String st = req.seoTitle().trim();
            post.setSeoTitle(st.length() > 255 ? st.substring(0, 255) : st);
        }
        if (req.seoDescription() != null) {
            String sd = req.seoDescription().trim();
            post.setSeoDescription(sd.length() > 500 ? sd.substring(0, 500) : sd);
        }

        if (post.getStatus() == PostStatus.PUBLISHED) {
            post.setPublishedAt(Instant.now());
        }

        post = posts.save(post);

        List<UUID> savedRelatedIds = updateRelatedProducts(post, req.relatedProductIds());

        return PostMapper.toAdminDetail(post, savedRelatedIds);
    }

    @Transactional
    public AdminPostDetailResponse adminUpdate(UUID id, AdminUpdatePostRequest req) {
        Post post = posts.findById(id).orElseThrow(() -> new PostNotFoundException(id));

        if (req.slug() != null && !req.slug().isBlank()) {
            String newSlug = SlugUtils.toSlug(req.slug());
            if (!newSlug.equals(post.getSlug())) {
                if (posts.existsBySlugAndIdNot(newSlug, id)) {
                    throw new SlugTakenException(newSlug);
                }
                post.setSlug(newSlug);
            }
        }

        if (req.title() != null) {
            String t = req.title().trim();
            post.setTitle(t.length() > 255 ? t.substring(0, 255) : t);
        }
        if (req.summary() != null) {
            String s = req.summary().trim();
            post.setSummary(s.length() > 500 ? s.substring(0, 500) : s);
        }
        if (req.content() != null) {
            post.setContent(req.content());
        }
        if (req.featuredImage() != null) {
            post.setFeaturedImage(req.featuredImage());
        }
        if (req.author() != null) {
            post.setAuthor(req.author());
        }
        if (req.status() != null) {
            post.setStatus(req.status());
            if (req.status() == PostStatus.PUBLISHED && post.getPublishedAt() == null) {
                post.setPublishedAt(Instant.now());
            }
        }
        if (req.seoTitle() != null) {
            String st = req.seoTitle().trim();
            post.setSeoTitle(st.length() > 255 ? st.substring(0, 255) : st);
        }
        if (req.seoDescription() != null) {
            String sd = req.seoDescription().trim();
            post.setSeoDescription(sd.length() > 500 ? sd.substring(0, 500) : sd);
        }

        post = posts.save(post);

        List<UUID> savedRelatedIds;
        if (req.relatedProductIds() != null) {
            savedRelatedIds = updateRelatedProducts(post, req.relatedProductIds());
        } else {
            savedRelatedIds = postRelatedProducts.findProductIdsByPostId(post.getId());
        }

        return PostMapper.toAdminDetail(post, savedRelatedIds);
    }

    @Transactional
    public void adminDelete(UUID id) {
        Post post = posts.findById(id).orElseThrow(() -> new PostNotFoundException(id));
        postRelatedProducts.deleteByPostId(id);
        posts.delete(post);
    }

    @Transactional
    public int adminBulkDelete(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        for (UUID id : ids) {
            postRelatedProducts.deleteByPostId(id);
        }
        List<Post> targets = posts.findAllById(ids);
        posts.deleteAll(targets);
        return targets.size();
    }

    @Transactional
    public int adminBulkUpdateStatus(List<UUID> ids, PostStatus status) {
        if (ids == null || ids.isEmpty() || status == null) {
            return 0;
        }
        List<Post> targets = posts.findAllById(ids);
        for (Post post : targets) {
            post.setStatus(status);
            if (status == PostStatus.PUBLISHED && post.getPublishedAt() == null) {
                post.setPublishedAt(Instant.now());
            }
        }
        posts.saveAll(targets);
        return targets.size();
    }

    private List<UUID> updateRelatedProducts(Post post, List<UUID> productIds) {
        postRelatedProducts.deleteByPostId(post.getId());
        if (productIds == null || productIds.isEmpty()) {
            return List.of();
        }

        List<UUID> validIds = new ArrayList<>();
        int position = 0;
        for (UUID prodId : productIds) {
            Product prod = products.findById(prodId).orElse(null);
            if (prod != null) {
                PostRelatedProduct rel = new PostRelatedProduct(post, prod, position++);
                postRelatedProducts.save(rel);
                validIds.add(prodId);
            }
        }
        return validIds;
    }
}
