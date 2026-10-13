package com.shop.blog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.blog.dto.AdminCreatePostRequest;
import com.shop.blog.dto.AdminPostDetailResponse;
import com.shop.blog.dto.AdminUpdatePostRequest;
import com.shop.blog.dto.CrawlPostRequest;
import com.shop.blog.dto.CrawledPostResponse;
import com.shop.blog.dto.PostSummaryResponse;
import com.shop.common.web.PagedResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

class AdminPostControllerTest {

    private final PostService postService = mock(PostService.class);
    private final PostCrawlerService crawlerService = mock(PostCrawlerService.class);
    private final AdminPostController controller = new AdminPostController(postService, crawlerService);

    @Test
    void listPostsDelegatesToService() {
        PagedResponse<PostSummaryResponse> expected = new PagedResponse<>(List.of(), 0, 10, 0, 0);
        when(postService.adminList(any(Pageable.class), eq(PostStatus.DRAFT), eq("q"))).thenReturn(expected);

        PagedResponse<PostSummaryResponse> actual = controller.listPosts(0, 10, PostStatus.DRAFT, "q");
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void getPostDelegatesToService() {
        UUID id = UUID.randomUUID();
        AdminPostDetailResponse expected = new AdminPostDetailResponse(
                id, "Title", "slug", "Summary", "<p>Content</p>",
                null, "Author", PostStatus.DRAFT, null, null, 0,
                null, null, null, List.of()
        );
        when(postService.adminGet(id)).thenReturn(expected);

        AdminPostDetailResponse actual = controller.getPost(id);
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void createPostDelegatesToService() {
        AdminCreatePostRequest req = new AdminCreatePostRequest(
                "Title", "slug", "Summary", "<p>Content</p>",
                null, null, PostStatus.DRAFT, null, null, null
        );
        AdminPostDetailResponse expected = new AdminPostDetailResponse(
                UUID.randomUUID(), "Title", "slug", "Summary", "<p>Content</p>",
                null, null, PostStatus.DRAFT, null, null, 0,
                null, null, null, List.of()
        );
        when(postService.adminCreate(req)).thenReturn(expected);

        AdminPostDetailResponse actual = controller.createPost(req);
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void updatePostDelegatesToService() {
        UUID id = UUID.randomUUID();
        AdminUpdatePostRequest req = new AdminUpdatePostRequest(
                "Title", "slug", "Summary", "<p>Content</p>",
                null, null, PostStatus.PUBLISHED, null, null, null
        );
        AdminPostDetailResponse expected = new AdminPostDetailResponse(
                id, "Title", "slug", "Summary", "<p>Content</p>",
                null, null, PostStatus.PUBLISHED, null, null, 0,
                null, null, null, List.of()
        );
        when(postService.adminUpdate(id, req)).thenReturn(expected);

        AdminPostDetailResponse actual = controller.updatePost(id, req);
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void deletePostDelegatesToService() {
        UUID id = UUID.randomUUID();
        controller.deletePost(id);
        verify(postService).adminDelete(id);
    }

    @Test
    void crawlPostDelegatesToCrawlerService() {
        CrawlPostRequest req = new CrawlPostRequest("https://example.com/post");
        CrawledPostResponse expected = new CrawledPostResponse(
                "Crawled Title", "Summary", "<p>Body</p>", "https://example.com/img.jpg",
                "Author", "https://example.com/post", "crawled-title"
        );
        when(crawlerService.crawl("https://example.com/post")).thenReturn(expected);

        CrawledPostResponse actual = controller.crawlPost(req);
        assertThat(actual).isSameAs(expected);
    }
}
