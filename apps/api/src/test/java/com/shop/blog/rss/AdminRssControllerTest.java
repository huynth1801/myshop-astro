package com.shop.blog.rss;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.blog.rss.dto.CreateRssSourceRequest;
import com.shop.blog.rss.dto.RssScanResultResponse;
import com.shop.blog.rss.dto.RssSourceResponse;
import com.shop.common.web.PagedResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

class AdminRssControllerTest {

    private final RssService rssService = mock(RssService.class);
    private final AdminRssController controller = new AdminRssController(rssService);

    @Test
    void listSourcesDelegatesToService() {
        PagedResponse<RssSourceResponse> expected = new PagedResponse<>(List.of(), 0, 20, 0, 0);
        when(rssService.listSources(any(Pageable.class))).thenReturn(expected);

        PagedResponse<RssSourceResponse> actual = controller.listSources(0, 20);
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void createSourceDelegatesToService() {
        CreateRssSourceRequest req = new CreateRssSourceRequest("VnExpress", "https://vnexpress.net/rss.rss", "Fashion", true);
        RssSourceResponse expected = new RssSourceResponse(UUID.randomUUID(), "VnExpress", "https://vnexpress.net/rss.rss", "Fashion", true, null, Instant.now());
        when(rssService.createSource(req)).thenReturn(expected);

        RssSourceResponse actual = controller.createSource(req);
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void deleteSourceDelegatesToService() {
        UUID id = UUID.randomUUID();
        controller.deleteSource(id);
        verify(rssService).deleteSource(id);
    }

    @Test
    void scanAllDelegatesToService() {
        RssScanResultResponse expected = new RssScanResultResponse(2, 10, 3, 5, List.of());
        when(rssService.scanAll()).thenReturn(expected);

        RssScanResultResponse actual = controller.scanAll();
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void scanSourceDelegatesToService() {
        UUID id = UUID.randomUUID();
        RssScanResultResponse expected = new RssScanResultResponse(1, 5, 2, 1, List.of());
        when(rssService.scanSource(id)).thenReturn(expected);

        RssScanResultResponse actual = controller.scanSource(id);
        assertThat(actual).isSameAs(expected);
    }
}
