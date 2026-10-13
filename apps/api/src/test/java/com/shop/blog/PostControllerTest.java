package com.shop.blog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.shop.blog.dto.PostDetailResponse;
import com.shop.blog.dto.PostSummaryResponse;
import com.shop.common.web.PagedResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

class PostControllerTest {

    private final PostService postService = mock(PostService.class);
    private final PostController controller = new PostController(postService);

    @Test
    void listPostsDelegatesToService() {
        PagedResponse<PostSummaryResponse> expected = new PagedResponse<>(List.of(), 0, 10, 0, 0);
        when(postService.listPublished(any(Pageable.class), eq(null), eq("search"))).thenReturn(expected);

        PagedResponse<PostSummaryResponse> actual = controller.listPosts(0, 10, null, "search");
        assertThat(actual).isSameAs(expected);
    }

    @Test
    void getPostDelegatesToService() {
        PostDetailResponse expected = new PostDetailResponse(
                UUID.randomUUID(), "Title", "slug", "Summary", "<p>Content</p>",
                null, "Author", PostStatus.PUBLISHED, null, null, 10,
                null, null, List.of()
        );
        when(postService.getBySlug("slug")).thenReturn(expected);

        PostDetailResponse actual = controller.getPost("slug");
        assertThat(actual).isSameAs(expected);
    }
}
