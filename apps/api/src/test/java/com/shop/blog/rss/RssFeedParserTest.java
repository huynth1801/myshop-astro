package com.shop.blog.rss;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;
import org.junit.jupiter.api.Test;

class RssFeedParserTest {

    private final RssFeedParser parser = new RssFeedParser();

    @Test
    void parseDocumentParsesRss2Correctly() {
        String rssXml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0">
                    <channel>
                        <title>Demo RSS Feed</title>
                        <item>
                            <title><![CDATA[Bí quyết chọn đồ lót su đúc thoải mái]]></title>
                            <link>https://example.com/bai-viet-1</link>
                            <description><![CDATA[<a href="https://example.com"><img src="thumb.jpg"/></a> Hướng dẫn chọn quần lót và áo ngực phù hợp mùa hè.]]></description>
                            <pubDate>Mon, 13 Oct 2026 09:00:00 +0700</pubDate>
                        </item>
                        <item>
                            <title>Mẹo giảm mỡ bụng với đai nịt bụng</title>
                            <link>https://example.com/bai-viet-2</link>
                            <description>Cách sử dụng gen nịt bụng hiệu quả mà an toàn.</description>
                            <pubDate>Mon, 13 Oct 2026 10:00:00 +0700</pubDate>
                        </item>
                    </channel>
                </rss>
                """;

        Document doc = Jsoup.parse(rssXml, "", Parser.xmlParser());
        List<RssFeedParser.RssFeedItem> items = parser.parseDocument(doc);

        assertThat(items).hasSize(2);
        assertThat(items.get(0).title()).isEqualTo("Bí quyết chọn đồ lót su đúc thoải mái");
        assertThat(items.get(0).link()).isEqualTo("https://example.com/bai-viet-1");
        assertThat(items.get(0).description()).isEqualTo("Hướng dẫn chọn quần lót và áo ngực phù hợp mùa hè.");
        assertThat(items.get(1).title()).isEqualTo("Mẹo giảm mỡ bụng với đai nịt bụng");
    }

    @Test
    void parseDocumentParsesAtomCorrectly() {
        String atomXml = """
                <?xml version="1.0" encoding="utf-8"?>
                <feed xmlns="http://www.w3.org/2005/Atom">
                    <title>Atom Demo Feed</title>
                    <entry>
                        <title>Xu hướng thời trang nội y hè 2026</title>
                        <link href="https://example.com/atom-1" rel="alternate"/>
                        <summary>Các mẫu áo lót su đúc mát lạnh đang dẫn đầu xu hướng.</summary>
                        <updated>2026-10-13T08:00:00Z</updated>
                    </entry>
                </feed>
                """;

        Document doc = Jsoup.parse(atomXml, "", Parser.xmlParser());
        List<RssFeedParser.RssFeedItem> items = parser.parseDocument(doc);

        assertThat(items).hasSize(1);
        assertThat(items.get(0).title()).isEqualTo("Xu hướng thời trang nội y hè 2026");
        assertThat(items.get(0).link()).isEqualTo("https://example.com/atom-1");
        assertThat(items.get(0).description()).isEqualTo("Các mẫu áo lót su đúc mát lạnh đang dẫn đầu xu hướng.");
    }
}
