package com.shop.blog.rss;

import com.shop.blog.Post;
import com.shop.blog.PostCrawlerService;
import com.shop.blog.PostMapper;
import com.shop.blog.PostRelatedProduct;
import com.shop.blog.PostRelatedProductRepository;
import com.shop.blog.PostRepository;
import com.shop.blog.PostStatus;
import com.shop.blog.SlugUtils;
import com.shop.blog.dto.CrawledPostResponse;
import com.shop.blog.dto.PostSummaryResponse;
import com.shop.blog.rss.dto.CreateRssSourceRequest;
import com.shop.blog.rss.dto.RssScanResultResponse;
import com.shop.blog.rss.dto.RssSourceResponse;
import com.shop.catalog.Product;
import com.shop.catalog.ProductRepository;
import com.shop.catalog.ProductStatus;
import com.shop.common.web.PagedResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RssService {

    private static final Logger log = LoggerFactory.getLogger(RssService.class);
    private static final int MAX_DRAFTS_PER_SOURCE = 5;

    private static final Set<String> STOPWORDS = Set.of(
            "set", "túi", "và", "của", "cho", "các", "những", "một", "với", "trong",
            "1", "2", "3", "4", "5", "6", "hộp", "mini", "kèm", "cao", "cấp", "bán",
            "chạy", "giá", "rẻ", "đẹp", "hàng", "loại"
    );

    private final RssSourceRepository rssSources;
    private final PostRepository posts;
    private final PostRelatedProductRepository postRelatedProducts;
    private final ProductRepository products;
    private final PostCrawlerService postCrawlerService;
    private final RssFeedParser rssFeedParser;

    public RssService(RssSourceRepository rssSources,
                      PostRepository posts,
                      PostRelatedProductRepository postRelatedProducts,
                      ProductRepository products,
                      PostCrawlerService postCrawlerService,
                      RssFeedParser rssFeedParser) {
        this.rssSources = rssSources;
        this.posts = posts;
        this.postRelatedProducts = postRelatedProducts;
        this.products = products;
        this.postCrawlerService = postCrawlerService;
        this.rssFeedParser = rssFeedParser;
    }

    @Transactional(readOnly = true)
    public PagedResponse<RssSourceResponse> listSources(Pageable pageable) {
        Page<RssSource> page = rssSources.findAllByOrderByCreatedAtDesc(pageable);
        return new PagedResponse<>(
                page.getContent().stream().map(this::toResponse).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional
    public RssSourceResponse createSource(CreateRssSourceRequest request) {
        String cleanUrl = request.url().trim();
        if (rssSources.existsByUrl(cleanUrl)) {
            throw new RssSourceAlreadyExistsException(cleanUrl);
        }

        RssSource source = new RssSource(
                request.name().trim(),
                cleanUrl,
                request.category() != null ? request.category().trim() : null,
                request.active()
        );
        RssSource saved = rssSources.save(source);
        log.info("Created new RSS source: {} ({})", saved.getName(), saved.getUrl());
        return toResponse(saved);
    }

    @Transactional
    public void deleteSource(UUID id) {
        RssSource source = rssSources.findById(id)
                .orElseThrow(() -> new RssSourceNotFoundException(id));
        rssSources.delete(source);
        log.info("Deleted RSS source id: {}", id);
    }

    @Transactional
    public RssScanResultResponse scanAll() {
        List<RssSource> activeSources = rssSources.findAllByIsActiveTrue();
        return doScanSources(activeSources);
    }

    @Transactional
    public RssScanResultResponse scanSource(UUID sourceId) {
        RssSource source = rssSources.findById(sourceId)
                .orElseThrow(() -> new RssSourceNotFoundException(sourceId));
        return doScanSources(List.of(source));
    }

    private RssScanResultResponse doScanSources(List<RssSource> sourcesList) {
        int sourcesScanned = 0;
        int articlesScanned = 0;
        int newDraftsCreated = 0;
        int skippedExisting = 0;
        List<PostSummaryResponse> createdPosts = new ArrayList<>();

        List<Product> activeProducts = products.findByStatus(ProductStatus.ACTIVE);

        for (RssSource source : sourcesList) {
            sourcesScanned++;
            List<RssFeedParser.RssFeedItem> items;
            try {
                items = rssFeedParser.fetchAndParse(source.getUrl());
            } catch (Exception e) {
                log.warn("Failed to fetch RSS from source {}: {}", source.getName(), e.getMessage());
                continue;
            }

            source.setLastFetchedAt(Instant.now());
            rssSources.save(source);

            int draftsFromThisSource = 0;
            for (RssFeedParser.RssFeedItem item : items) {
                if (draftsFromThisSource >= MAX_DRAFTS_PER_SOURCE) {
                    break;
                }

                articlesScanned++;
                String link = item.link();
                if (posts.existsBySourceUrl(link)) {
                    skippedExisting++;
                    continue;
                }

                String initialSlug = SlugUtils.toSlug(item.title());
                if (posts.existsBySlug(initialSlug)) {
                    skippedExisting++;
                    continue;
                }

                // Match with catalog products
                List<UUID> matchedProductIds = matchProducts(item.title(), item.description(), activeProducts);
                if (matchedProductIds.isEmpty()) {
                    // Not related enough to store topics, skip to preserve blog focus
                    continue;
                }

                // Crawl full article content
                CrawledPostResponse crawled;
                try {
                    crawled = postCrawlerService.crawl(link);
                } catch (Exception e) {
                    log.debug("Skipping article crawl for {}: {}", link, e.getMessage());
                    continue;
                }

                String slug = SlugUtils.toSlug(crawled.title());
                if (slug.isBlank()) {
                    slug = "bai-viet-" + System.currentTimeMillis();
                }
                if (posts.existsBySlug(slug)) {
                    slug = slug + "-" + (System.currentTimeMillis() % 10000);
                }

                Post post = new Post();
                post.setTitle(crawled.title());
                post.setSlug(slug);
                post.setSummary(crawled.summary());
                post.setContent(crawled.content());
                post.setFeaturedImage(crawled.featuredImage());
                post.setAuthor(crawled.author());
                post.setSourceUrl(link);
                post.setStatus(PostStatus.DRAFT);
                Post savedPost = posts.save(post);

                int pos = 0;
                for (UUID prodId : matchedProductIds) {
                    Product prod = products.findById(prodId).orElse(null);
                    if (prod != null) {
                        PostRelatedProduct rel = new PostRelatedProduct(savedPost, prod, pos++);
                        postRelatedProducts.save(rel);
                    }
                }

                newDraftsCreated++;
                draftsFromThisSource++;
                createdPosts.add(PostMapper.toSummary(savedPost));
                log.info("Auto-crawled draft article: '{}' linked to {} products", savedPost.getTitle(), matchedProductIds.size());
            }
        }

        return new RssScanResultResponse(
                sourcesScanned,
                articlesScanned,
                newDraftsCreated,
                skippedExisting,
                createdPosts
        );
    }

    public List<UUID> matchProducts(String title, String description, List<Product> activeProducts) {
        if (activeProducts == null || activeProducts.isEmpty()) {
            return List.of();
        }

        String combinedText = ((title != null ? title : "") + " " + (description != null ? description : ""))
                .toLowerCase(Locale.ROOT);

        record ScoredProduct(Product product, int score) {}
        List<ScoredProduct> scored = new ArrayList<>();

        for (Product product : activeProducts) {
            int score = computeScore(combinedText, product);
            if (score > 0) {
                scored.add(new ScoredProduct(product, score));
            }
        }

        if (scored.isEmpty()) {
            // Check broad lifestyle / fashion keywords to attach top products if appropriate
            if (containsBroadKeywords(combinedText)) {
                return activeProducts.stream().limit(2).map(Product::getId).toList();
            }
            return List.of();
        }

        scored.sort(Comparator.comparingInt(ScoredProduct::score).reversed());
        return scored.stream().limit(3).map(sp -> sp.product().getId()).toList();
    }

    private int computeScore(String text, Product product) {
        int score = 0;
        String prodName = product.getName() != null ? product.getName().toLowerCase(Locale.ROOT) : "";

        // Check key phrases
        String[] keywords = {
                "quần lót", "áo ngực", "áo lót", "nội y", "đồ lót", "su đúc", "mặt lạnh",
                "mát lạnh", "nâng mông", "nịt bụng", "đai nịt bụng", "gen nịt bụng", "giảm eo",
                "chống nắng", "khẩu trang", "silicone", "dán ti", "dán ngực", "thạch tan",
                "thun lạnh", "thun lụa", "không gọng", "kháng khuẩn", "latex", "tàng hình",
                "tất", "vớ", "croptop", "áo khoác", "thể thao"
        };

        for (String kw : keywords) {
            if (prodName.contains(kw) && text.contains(kw)) {
                score += 5;
            }
        }

        // Token match
        String[] tokens = prodName.split("\\s+");
        for (String token : tokens) {
            String cleanToken = token.replaceAll("[^\\p{L}\\p{Nd}]", "").trim();
            if (cleanToken.length() >= 3 && !STOPWORDS.contains(cleanToken) && text.contains(cleanToken)) {
                score += 1;
            }
        }

        return score;
    }

    private boolean containsBroadKeywords(String text) {
        String[] broad = {"thời trang", "làm đẹp", "mặc đẹp", "phối đồ", "outfit", "vóc dáng", "sức khỏe", "body"};
        for (String b : broad) {
            if (text.contains(b)) return true;
        }
        return false;
    }

    private RssSourceResponse toResponse(RssSource source) {
        return new RssSourceResponse(
                source.getId(),
                source.getName(),
                source.getUrl(),
                source.getCategory(),
                source.isActive(),
                source.getLastFetchedAt(),
                source.getCreatedAt()
        );
    }
}
