package com.shop.blog.rss;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.blog.Post;
import com.shop.blog.PostCrawlerService;
import com.shop.blog.PostRelatedProductRepository;
import com.shop.blog.PostRepository;
import com.shop.blog.PostStatus;
import com.shop.blog.dto.CrawledPostResponse;
import com.shop.blog.rss.dto.CreateRssSourceRequest;
import com.shop.blog.rss.dto.RssScanResultResponse;
import com.shop.blog.rss.dto.RssSourceResponse;
import com.shop.catalog.Product;
import com.shop.catalog.ProductRepository;
import com.shop.catalog.ProductStatus;
import com.shop.common.web.PagedResponse;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class RssServiceTest {

    @Mock
    private RssSourceRepository rssSources;

    @Mock
    private PostRepository posts;

    @Mock
    private PostRelatedProductRepository postRelatedProducts;

    @Mock
    private ProductRepository products;

    @Mock
    private PostCrawlerService postCrawlerService;

    @Mock
    private RssFeedParser rssFeedParser;

    private RssService rssService;

    @BeforeEach
    void setUp() {
        rssService = new RssService(rssSources, posts, postRelatedProducts, products, postCrawlerService, rssFeedParser);
    }

    @Test
    void listSourcesReturnsPagedList() {
        RssSource s = new RssSource("VnExpress", "https://vnexpress.net/rss/thoi-trang.rss", "Fashion", true);
        s.setId(UUID.randomUUID());
        when(rssSources.findAllByOrderByCreatedAtDesc(any())).thenReturn(new PageImpl<>(List.of(s)));

        PagedResponse<RssSourceResponse> result = rssService.listSources(PageRequest.of(0, 10));

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).name()).isEqualTo("VnExpress");
    }

    @Test
    void createSourceSavesNewSource() {
        CreateRssSourceRequest req = new CreateRssSourceRequest("Kenh14", "https://kenh14.vn/fashion.rss", "Trend", true);
        when(rssSources.existsByUrl("https://kenh14.vn/fashion.rss")).thenReturn(false);
        when(rssSources.save(any(RssSource.class))).thenAnswer(invocation -> {
            RssSource s = invocation.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        RssSourceResponse res = rssService.createSource(req);

        assertThat(res.name()).isEqualTo("Kenh14");
        assertThat(res.url()).isEqualTo("https://kenh14.vn/fashion.rss");
    }

    @Test
    void createSourceThrowsWhenUrlAlreadyExists() {
        CreateRssSourceRequest req = new CreateRssSourceRequest("Kenh14", "https://kenh14.vn/fashion.rss", "Trend", true);
        when(rssSources.existsByUrl("https://kenh14.vn/fashion.rss")).thenReturn(true);

        assertThatThrownBy(() -> rssService.createSource(req))
                .isInstanceOf(RssSourceAlreadyExistsException.class);
    }

    @Test
    void deleteSourceRemovesEntity() {
        UUID id = UUID.randomUUID();
        RssSource s = new RssSource("Name", "https://example.com/rss", null, true);
        s.setId(id);
        when(rssSources.findById(id)).thenReturn(Optional.of(s));

        rssService.deleteSource(id);

        verify(rssSources).delete(s);
    }

    @Test
    void deleteSourceThrowsWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(rssSources.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rssService.deleteSource(id))
                .isInstanceOf(RssSourceNotFoundException.class);
    }

    @Test
    void matchProductsFindsMatchingCatalogProductsByKeywords() {
        UUID p1Id = UUID.randomUUID();
        Product p1 = org.mockito.Mockito.mock(Product.class);
        when(p1.getId()).thenReturn(p1Id);
        when(p1.getName()).thenReturn("Set 3 quần lót su đúc mặt lạnh");

        UUID p2Id = UUID.randomUUID();
        Product p2 = org.mockito.Mockito.mock(Product.class);
        when(p2.getId()).thenReturn(p2Id);
        when(p2.getName()).thenReturn("Đai nịt bụng giảm eo Latex");

        List<Product> catalog = List.of(p1, p2);

        List<UUID> matches1 = rssService.matchProducts("Top 5 quần lót mát lạnh ngày hè", "Đánh giá chất liệu su đúc", catalog);
        assertThat(matches1).contains(p1Id);

        List<UUID> matches2 = rssService.matchProducts("Cách đeo đai nịt bụng hiệu quả", "Kinh nghiệm giảm mỡ bụng với gen latex", catalog);
        assertThat(matches2).contains(p2Id);
    }

    @Test
    void scanSourceCrawlsAndCreatesDraftForMatchingItems() {
        UUID sourceId = UUID.randomUUID();
        RssSource source = new RssSource("VnExpress", "https://vnexpress.net/rss/thoi-trang.rss", "Fashion", true);
        source.setId(sourceId);

        when(rssSources.findById(sourceId)).thenReturn(Optional.of(source));

        UUID p1Id = UUID.randomUUID();
        Product p1 = org.mockito.Mockito.mock(Product.class);
        when(p1.getId()).thenReturn(p1Id);
        when(p1.getName()).thenReturn("Quần lót su đúc mát lạnh");
        when(products.findByStatus(ProductStatus.ACTIVE)).thenReturn(List.of(p1));
        when(products.findById(p1Id)).thenReturn(Optional.of(p1));

        RssFeedParser.RssFeedItem item = new RssFeedParser.RssFeedItem(
                "Cách chọn quần lót mùa hè mát lạnh",
                "https://vnexpress.net/bai-1.html",
                "Chất liệu su đúc rất được ưa chuộng...",
                "2026-10-13"
        );
        when(rssFeedParser.fetchAndParse("https://vnexpress.net/rss/thoi-trang.rss")).thenReturn(List.of(item));
        when(posts.existsBySourceUrl("https://vnexpress.net/bai-1.html")).thenReturn(false);
        when(posts.existsBySlug(any())).thenReturn(false);

        CrawledPostResponse crawled = new CrawledPostResponse(
                "Cách chọn quần lót mùa hè mát lạnh",
                "Chất liệu su đúc...",
                "<p>Nội dung chi tiết bài viết</p>",
                "https://vnexpress.net/thumb.jpg",
                "Biên tập viên",
                "https://vnexpress.net/bai-1.html",
                "cach-chon-quan-lot-mua-he-mat-lanh"
        );
        when(postCrawlerService.crawl("https://vnexpress.net/bai-1.html")).thenReturn(crawled);

        when(posts.save(any(Post.class))).thenAnswer(invocation -> {
            Post p = invocation.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        RssScanResultResponse scanRes = rssService.scanSource(sourceId);

        assertThat(scanRes.sourcesScanned()).isEqualTo(1);
        assertThat(scanRes.newDraftsCreated()).isEqualTo(1);
        assertThat(scanRes.createdPosts()).hasSize(1);
        assertThat(scanRes.createdPosts().get(0).title()).isEqualTo("Cách chọn quần lót mùa hè mát lạnh");
        verify(posts).save(any(Post.class));
        verify(postRelatedProducts).save(any());
    }

    @Test
    void scanSourceSkipsAlreadyExistingArticleUrl() {
        UUID sourceId = UUID.randomUUID();
        RssSource source = new RssSource("VnExpress", "https://vnexpress.net/rss/thoi-trang.rss", "Fashion", true);
        source.setId(sourceId);

        when(rssSources.findById(sourceId)).thenReturn(Optional.of(source));

        RssFeedParser.RssFeedItem item = new RssFeedParser.RssFeedItem(
                "Bài viết cũ",
                "https://vnexpress.net/bai-cu.html",
                "Mô tả",
                "2026-10-13"
        );
        when(rssFeedParser.fetchAndParse(source.getUrl())).thenReturn(List.of(item));
        when(posts.existsBySourceUrl("https://vnexpress.net/bai-cu.html")).thenReturn(true);

        RssScanResultResponse scanRes = rssService.scanSource(sourceId);

        assertThat(scanRes.skippedExisting()).isEqualTo(1);
        assertThat(scanRes.newDraftsCreated()).isEqualTo(0);
        verify(postCrawlerService, never()).crawl(any());
    }
}
