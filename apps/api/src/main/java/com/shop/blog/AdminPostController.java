package com.shop.blog;

import com.shop.blog.dto.AdminCreatePostRequest;
import com.shop.blog.dto.AdminPostDetailResponse;
import com.shop.blog.dto.AdminUpdatePostRequest;
import com.shop.blog.dto.CrawlPostRequest;
import com.shop.blog.dto.CrawledPostResponse;
import com.shop.blog.dto.PostSummaryResponse;
import com.shop.common.web.PagedResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/posts")
@Validated
public class AdminPostController {

    private final PostService postService;
    private final PostCrawlerService crawlerService;

    public AdminPostController(PostService postService, PostCrawlerService crawlerService) {
        this.postService = postService;
        this.crawlerService = crawlerService;
    }

    @GetMapping
    public PagedResponse<PostSummaryResponse> listPosts(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @RequestParam(required = false) PostStatus status,
            @RequestParam(required = false) String q) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return postService.adminList(pageRequest, status, q);
    }

    @GetMapping("/{id}")
    public AdminPostDetailResponse getPost(@PathVariable UUID id) {
        return postService.adminGet(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPostDetailResponse createPost(@Valid @RequestBody AdminCreatePostRequest req) {
        return postService.adminCreate(req);
    }

    @PutMapping("/{id}")
    public AdminPostDetailResponse updatePost(
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdatePostRequest req) {
        return postService.adminUpdate(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@PathVariable UUID id) {
        postService.adminDelete(id);
    }

    @PostMapping("/crawl")
    public CrawledPostResponse crawlPost(@Valid @RequestBody CrawlPostRequest req) {
        return crawlerService.crawl(req.sourceUrl());
    }
}
