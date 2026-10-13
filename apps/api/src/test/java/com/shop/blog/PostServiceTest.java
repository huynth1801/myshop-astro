package com.shop.blog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.shop.blog.dto.AdminCreatePostRequest;
import com.shop.blog.dto.AdminPostDetailResponse;
import com.shop.blog.dto.AdminUpdatePostRequest;
import com.shop.blog.dto.PostDetailResponse;
import com.shop.blog.dto.PostSummaryResponse;
import com.shop.catalog.CatalogService;
import com.shop.catalog.Product;
import com.shop.catalog.ProductRepository;
import com.shop.catalog.SlugTakenException;
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
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository posts;

    @Mock
    private PostRelatedProductRepository postRelatedProducts;

    @Mock
    private ProductRepository products;

    @Mock
    private CatalogService catalogService;

    private PostService postService;

    @BeforeEach
    void setUp() {
        postService = new PostService(posts, postRelatedProducts, products, catalogService);
    }

    @Test
    void listPublishedReturnsPagedPosts() {
        Post post = new Post();
        post.setId(UUID.randomUUID());
        post.setTitle("Test Title");
        post.setSlug("test-title");
        post.setStatus(PostStatus.PUBLISHED);

        when(posts.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(post)));

        PagedResponse<PostSummaryResponse> result =
                postService.listPublished(PageRequest.of(0, 10), null, null);

        assertThat(result.content()).hasSize(1);
        assertThat(result.content().get(0).title()).isEqualTo("Test Title");
    }

    @Test
    void getBySlugIncrementsViewAndReturnsDetail() {
        UUID id = UUID.randomUUID();
        Post post = new Post();
        post.setId(id);
        post.setTitle("Fashion Post");
        post.setSlug("fashion-post");
        post.setContent("<p>Content</p>");
        post.setStatus(PostStatus.PUBLISHED);

        when(posts.findBySlugAndStatus("fashion-post", PostStatus.PUBLISHED))
                .thenReturn(Optional.of(post));
        when(postRelatedProducts.findProductIdsByPostId(id)).thenReturn(List.of());
        when(catalogService.getSummariesByIds(List.of())).thenReturn(List.of());

        PostDetailResponse response = postService.getBySlug("fashion-post");

        assertThat(response.title()).isEqualTo("Fashion Post");
        verify(posts).incrementViewCount(id);
    }

    @Test
    void getBySlugThrowsWhenNotFound() {
        when(posts.findBySlugAndStatus("missing", PostStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> postService.getBySlug("missing"))
                .isInstanceOf(PostNotFoundException.class)
                .hasMessageContaining("No post found with slug 'missing'");
    }

    @Test
    void adminCreateSavesPostAndReturnsDetail() {
        AdminCreatePostRequest req = new AdminCreatePostRequest(
                "Mẹo mặc đẹp mùa đông",
                "",
                "Tóm tắt bài viết",
                "<p>Nội dung chi tiết</p>",
                "https://example.com/img.jpg",
                "Admin",
                PostStatus.DRAFT,
                "SEO Title",
                "SEO Desc",
                List.of()
        );

        when(posts.existsBySlug("meo-mac-dep-mua-dong")).thenReturn(false);
        when(posts.save(any(Post.class))).thenAnswer(invocation -> {
            Post p = invocation.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        AdminPostDetailResponse response = postService.adminCreate(req);

        assertThat(response.title()).isEqualTo("Mẹo mặc đẹp mùa đông");
        assertThat(response.slug()).isEqualTo("meo-mac-dep-mua-dong");
        assertThat(response.status()).isEqualTo(PostStatus.DRAFT);
    }

    @Test
    void adminCreateThrowsWhenSlugTaken() {
        AdminCreatePostRequest req = new AdminCreatePostRequest(
                "Duplicate Title",
                "duplicate-title",
                "",
                "<p>Content</p>",
                null,
                null,
                PostStatus.DRAFT,
                null,
                null,
                null
        );

        when(posts.existsBySlug("duplicate-title")).thenReturn(true);

        assertThatThrownBy(() -> postService.adminCreate(req))
                .isInstanceOf(SlugTakenException.class);
    }

    @Test
    void adminUpdateUpdatesFields() {
        UUID id = UUID.randomUUID();
        Post post = new Post();
        post.setId(id);
        post.setTitle("Old Title");
        post.setSlug("old-slug");
        post.setStatus(PostStatus.DRAFT);

        when(posts.findById(id)).thenReturn(Optional.of(post));
        when(posts.save(any(Post.class))).thenReturn(post);

        AdminUpdatePostRequest req = new AdminUpdatePostRequest(
                "New Title",
                "new-slug",
                "New summary",
                "<p>New content</p>",
                null,
                null,
                PostStatus.PUBLISHED,
                null,
                null,
                null
        );

        when(posts.existsBySlugAndIdNot("new-slug", id)).thenReturn(false);

        AdminPostDetailResponse response = postService.adminUpdate(id, req);

        assertThat(response.title()).isEqualTo("New Title");
        assertThat(response.slug()).isEqualTo("new-slug");
        assertThat(response.status()).isEqualTo(PostStatus.PUBLISHED);
    }

    @Test
    void adminDeleteDeletesPost() {
        UUID id = UUID.randomUUID();
        Post post = new Post();
        post.setId(id);

        when(posts.findById(id)).thenReturn(Optional.of(post));

        postService.adminDelete(id);

        verify(posts).delete(post);
    }
}
