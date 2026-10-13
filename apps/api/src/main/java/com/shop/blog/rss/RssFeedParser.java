package com.shop.blog.rss;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RssFeedParser {

    private static final Logger log = LoggerFactory.getLogger(RssFeedParser.class);
    private static final int TIMEOUT_MS = 15000;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    public record RssFeedItem(
            String title,
            String link,
            String description,
            String pubDate
    ) {}

    public List<RssFeedItem> fetchAndParse(String feedUrl) {
        try {
            Document doc = Jsoup.connect(feedUrl)
                    .parser(Parser.xmlParser())
                    .userAgent(USER_AGENT)
                    .timeout(TIMEOUT_MS)
                    .followRedirects(true)
                    .get();
            return parseDocument(doc);
        } catch (IOException e) {
            log.error("Failed to fetch RSS feed from {}: {}", feedUrl, e.getMessage());
            throw new RuntimeException("Không thể đọc RSS feed từ URL: " + feedUrl + " (" + e.getMessage() + ")", e);
        }
    }

    public List<RssFeedItem> parseDocument(Document doc) {
        List<RssFeedItem> items = new ArrayList<>();

        // Check RSS 2.0 <item>
        Elements itemElements = doc.select("item");
        if (!itemElements.isEmpty()) {
            for (Element el : itemElements) {
                String title = extractText(el, "title");
                String link = extractLink(el);
                String rawDesc = extractText(el, "description");
                String cleanDesc = cleanHtml(rawDesc);
                String pubDate = extractText(el, "pubDate");

                if (!link.isBlank()) {
                    items.add(new RssFeedItem(title, link.trim(), cleanDesc, pubDate));
                }
            }
            return items;
        }

        // Check Atom <entry>
        Elements entryElements = doc.select("entry");
        for (Element el : entryElements) {
            String title = extractText(el, "title");
            String link = extractAtomLink(el);
            String rawDesc = extractText(el, "summary");
            if (rawDesc.isBlank()) {
                rawDesc = extractText(el, "content");
            }
            String cleanDesc = cleanHtml(rawDesc);
            String pubDate = extractText(el, "updated");

            if (!link.isBlank()) {
                items.add(new RssFeedItem(title, link.trim(), cleanDesc, pubDate));
            }
        }

        return items;
    }

    private String extractText(Element parent, String tag) {
        Element child = parent.selectFirst(tag);
        return child == null ? "" : child.text().trim();
    }

    private String extractLink(Element parent) {
        Element linkEl = parent.selectFirst("link");
        if (linkEl == null) return "";
        String text = linkEl.text().trim();
        if (!text.isEmpty()) {
            return text;
        }
        return linkEl.attr("href").trim();
    }

    private String extractAtomLink(Element parent) {
        Element linkEl = parent.selectFirst("link[rel=alternate]");
        if (linkEl == null) {
            linkEl = parent.selectFirst("link");
        }
        if (linkEl == null) return "";
        String href = linkEl.attr("href").trim();
        return href.isEmpty() ? linkEl.text().trim() : href;
    }

    private String cleanHtml(String rawHtml) {
        if (rawHtml == null || rawHtml.isBlank()) return "";
        try {
            return Jsoup.parse(rawHtml).text().trim();
        } catch (Exception e) {
            return rawHtml.trim();
        }
    }
}
