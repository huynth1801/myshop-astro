package com.shop.blog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.shop.blog.dto.CrawledPostResponse;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PostCrawlerServiceTest {

    private PostCrawlerService crawlerService;

    @BeforeEach
    void setUp() {
        crawlerService = new PostCrawlerService();
    }

    @Test
    void extractsArticleDataFromHtmlDocument() {
        String html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>5 Mẹo Phối Đồ Vintage Cực Chất | StyleMag</title>
                    <meta property="og:title" content="5 Mẹo Phối Đồ Vintage Cực Chất - StyleMag" />
                    <meta property="og:description" content="Hướng dẫn chi tiết cách phối đồ vintage phong cách boutique..." />
                    <meta property="og:image" content="https://example.com/images/cover.jpg" />
                    <meta name="author" content="Nguyen Van A" />
                </head>
                <body>
                    <header><nav>Navigation</nav></header>
                    <article>
                        <h1>5 Mẹo Phối Đồ Vintage Cực Chất</h1>
                        <p class="intro">Phong cách vintage đang quay trở lại mạnh mẽ trong năm 2026 với nhiều biến tấu độc đáo.</p>
                        <div class="ad">Quảng cáo không mong muốn</div>
                        <p>Hãy chọn những gam màu trung tính như beige, nâu đất hoặc trắng ngà để tạo cảm giác hoài cổ và sang trọng.</p>
                        <figure>
                            <img src="https://example.com/images/item1.jpg" alt="Phối đồ vintage" />
                            <figcaption>Set đồ phong cách vintage</figcaption>
                        </figure>
                        <p>Đừng quên kết hợp các phụ kiện như thắt lưng da và mũ beret để hoàn thiện tổng thể trang phục của bạn.</p>
                        <script>console.log('malicious script');</script>
                    </article>
                    <footer>Footer info</footer>
                </body>
                </html>
                """;

        Document doc = Jsoup.parse(html, "https://example.com/fashion/5-meo-phoi-do");
        CrawledPostResponse response = crawlerService.extract(doc, "https://example.com/fashion/5-meo-phoi-do");

        assertThat(response.title()).isEqualTo("5 Mẹo Phối Đồ Vintage Cực Chất");
        assertThat(response.summary()).contains("Hướng dẫn chi tiết");
        assertThat(response.featuredImage()).isEqualTo("https://example.com/images/cover.jpg");
        assertThat(response.author()).isEqualTo("Nguyen Van A");
        assertThat(response.suggestedSlug()).isEqualTo("5-meo-phoi-do-vintage-cuc-chat");

        // Verify content sanitization
        assertThat(response.content()).contains("<p>Phong cách vintage đang quay trở lại");
        assertThat(response.content()).contains("<img");
        assertThat(response.content()).doesNotContain("<script>");
        assertThat(response.content()).doesNotContain("console.log");
        assertThat(response.content()).doesNotContain("Quảng cáo không mong muốn");
    }

    @Test
    void throwsCrawlFailedExceptionWhenContentIsTooShort() {
        String html = """
                <html>
                <head><title>Too Short</title></head>
                <body><article><p>Ngắn</p></article></body>
                </html>
                """;

        Document doc = Jsoup.parse(html, "https://example.com/short");
        assertThatThrownBy(() -> crawlerService.extract(doc, "https://example.com/short"))
                .isInstanceOf(CrawlFailedException.class)
                .hasMessageContaining("Unable to extract sufficient article content");
    }
}
