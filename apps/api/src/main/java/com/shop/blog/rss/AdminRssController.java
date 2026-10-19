package com.shop.blog.rss;

import com.shop.blog.rss.dto.CreateRssSourceRequest;
import com.shop.blog.rss.dto.RssScanResultResponse;
import com.shop.blog.rss.dto.RssSourceResponse;
import com.shop.common.web.PagedResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/rss-sources")
@Validated
public class AdminRssController {

    private final RssService rssService;

    public AdminRssController(RssService rssService) {
        this.rssService = rssService;
    }

    @GetMapping
    public PagedResponse<RssSourceResponse> listSources(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return rssService.listSources(PageRequest.of(page, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RssSourceResponse createSource(@Valid @RequestBody CreateRssSourceRequest request) {
        return rssService.createSource(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSource(@PathVariable UUID id) {
        rssService.deleteSource(id);
    }

    @PostMapping("/scan-all")
    public RssScanResultResponse scanAll() {
        return rssService.scanAll();
    }

    @PostMapping("/{id}/scan")
    public RssScanResultResponse scanSource(@PathVariable UUID id) {
        return rssService.scanSource(id);
    }
}
