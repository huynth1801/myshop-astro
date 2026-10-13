package com.shop.blog;

import com.shop.blog.dto.CrawledPostResponse;
import java.io.IOException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Cleaner;
import org.jsoup.safety.Safelist;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PostCrawlerService {

    private static final Logger log = LoggerFactory.getLogger(PostCrawlerService.class);
    private static final int TIMEOUT_MS = 15000;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    private final Safelist safelist;

    public PostCrawlerService() {
        this.safelist = Safelist.relaxed()
                .addTags("figure", "figcaption", "hr")
                .addAttributes("img", "src", "alt", "title", "loading")
                .addAttributes("a", "href", "title", "target", "rel")
                .addProtocols("img", "src", "http", "https", "data")
                .addProtocols("a", "href", "http", "https");
    }

    public CrawledPostResponse crawl(String sourceUrl) {
        log.info("Crawling article from URL: {}", sourceUrl);
        Document doc;
        try {
            doc = Jsoup.connect(sourceUrl)
                    .userAgent(USER_AGENT)
                    .referrer("https://www.google.com")
                    .timeout(TIMEOUT_MS)
                    .followRedirects(true)
                    .get();
        } catch (IOException e) {
            log.error("Failed to connect or fetch from URL {}: {}", sourceUrl, e.getMessage());
            throw new CrawlFailedException("Failed to fetch article from URL: " + e.getMessage(), e);
        }

        return extract(doc, sourceUrl);
    }

    public CrawledPostResponse extract(Document doc, String sourceUrl) {
        String title = extractTitle(doc);
        String summary = extractSummary(doc);
        String featuredImage = extractFeaturedImage(doc);
        String author = extractAuthor(doc);
        String contentHtml = extractAndCleanContent(doc);

        String suggestedSlug = SlugUtils.toSlug(title);

        return new CrawledPostResponse(
                title,
                summary,
                contentHtml,
                featuredImage,
                author,
                sourceUrl,
                suggestedSlug
        );
    }

    private String extractTitle(Document doc) {
        String ogTitle = doc.select("meta[property=og:title]").attr("content").trim();
        if (!ogTitle.isEmpty()) {
            return cleanTitle(ogTitle);
        }

        String twitterTitle = doc.select("meta[name=twitter:title]").attr("content").trim();
        if (!twitterTitle.isEmpty()) {
            return cleanTitle(twitterTitle);
        }

        Element h1 = doc.select("h1").first();
        if (h1 != null && !h1.text().isBlank()) {
            return cleanTitle(h1.text().trim());
        }

        return cleanTitle(doc.title());
    }

    private String cleanTitle(String rawTitle) {
        // Strip common site suffix like " - Tên Báo" or " | Brand"
        if (rawTitle == null) return "";
        int sepIdx = rawTitle.lastIndexOf(" - ");
        if (sepIdx > 15) {
            return rawTitle.substring(0, sepIdx).trim();
        }
        sepIdx = rawTitle.lastIndexOf(" | ");
        if (sepIdx > 15) {
            return rawTitle.substring(0, sepIdx).trim();
        }
        return rawTitle.trim();
    }

    private String extractSummary(Document doc) {
        String ogDesc = doc.select("meta[property=og:description]").attr("content").trim();
        if (!ogDesc.isEmpty()) {
            return truncate(ogDesc, 500);
        }

        String metaDesc = doc.select("meta[name=description]").attr("content").trim();
        if (!metaDesc.isEmpty()) {
            return truncate(metaDesc, 500);
        }

        return "";
    }

    private String extractFeaturedImage(Document doc) {
        String ogImage = doc.select("meta[property=og:image]").attr("content").trim();
        if (!ogImage.isEmpty()) {
            return resolveUrl(doc, ogImage);
        }

        String twitterImage = doc.select("meta[name=twitter:image]").attr("content").trim();
        if (!twitterImage.isEmpty()) {
            return resolveUrl(doc, twitterImage);
        }

        Element firstImg = doc.select("article img, main img, .content img").first();
        if (firstImg != null) {
            String src = firstImg.attr("abs:src");
            if (src.isEmpty()) {
                src = firstImg.attr("abs:data-src");
            }
            if (!src.isEmpty()) {
                return src;
            }
        }

        return null;
    }

    private String extractAuthor(Document doc) {
        String author = doc.select("meta[name=author]").attr("content").trim();
        if (!author.isEmpty()) {
            return truncate(author, 100);
        }

        author = doc.select("meta[property=article:author]").attr("content").trim();
        if (!author.isEmpty()) {
            return truncate(author, 100);
        }

        Element authorEl = doc.select(".author, [rel=author], .post-author, .article-author").first();
        if (authorEl != null && !authorEl.text().isBlank()) {
            return truncate(authorEl.text().trim(), 100);
        }

        return null;
    }

    private String extractAndCleanContent(Document doc) {
        // Candidate containers in priority order
        String[] selectors = {
                "article",
                "[itemprop=articleBody]",
                ".fck_detail",
                ".article-body",
                ".post-content",
                ".entry-content",
                ".detail-content",
                ".content-detail",
                "main",
                ".content",
                "body"
        };

        Element target = null;
        for (String selector : selectors) {
            Elements found = doc.select(selector);
            if (!found.isEmpty()) {
                // Pick container with substantial text
                for (Element el : found) {
                    if (el.text().length() > 200) {
                        target = el.clone();
                        break;
                    }
                }
                if (target != null) break;
            }
        }

        if (target == null) {
            target = doc.body().clone();
        }

        // Remove junk elements
        target.select("script, style, noscript, iframe, nav, header, footer, aside, form, svg, button, "
                + ".ad, .ads, .advertisement, .social-share, .tags, .comment, .comments, "
                + ".related-posts, .related-articles, .author-bio, [aria-hidden=true]").remove();

        // Fix lazy-loaded image sources: data-src / data-original -> src
        for (Element img : target.select("img")) {
            String dataSrc = img.attr("data-src");
            if (dataSrc.isBlank()) {
                dataSrc = img.attr("data-original");
            }
            if (!dataSrc.isBlank()) {
                img.attr("src", dataSrc);
            }
            // Resolve relative URLs to absolute
            String absSrc = img.absUrl("src");
            if (!absSrc.isBlank()) {
                img.attr("src", absSrc);
            }
        }

        // Clean with Safelist
        Cleaner cleaner = new Cleaner(safelist);
        Document cleanDoc = cleaner.clean(Jsoup.parseBodyFragment(target.html()));

        String cleanedHtml = cleanDoc.body().html();
        if (cleanDoc.body().text().length() < 30) {
            throw new CrawlFailedException("Unable to extract sufficient article content from URL");
        }

        return cleanedHtml;
    }

    private String resolveUrl(Document doc, String url) {
        if (url == null || url.isBlank()) return null;
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        Element dummy = doc.createElement("a").attr("href", url);
        String abs = dummy.absUrl("href");
        return abs.isEmpty() ? url : abs;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max);
    }
}
