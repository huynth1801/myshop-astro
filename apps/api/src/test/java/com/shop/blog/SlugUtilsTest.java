package com.shop.blog;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SlugUtilsTest {

    @Test
    void convertsVietnameseAccentsProperly() {
        String input = "Xu hướng thời trang Thu Đông 2026: Đỉnh cao phong cách!";
        String slug = SlugUtils.toSlug(input);
        assertThat(slug).isEqualTo("xu-huong-thoi-trang-thu-dong-2026-dinh-cao-phong-cach");
    }

    @Test
    void handlesSpecialCharactersAndRepeatedHyphens() {
        String input = "  Thời trang --- & Phụ kiện ??? HOT 2026   ";
        String slug = SlugUtils.toSlug(input);
        assertThat(slug).isEqualTo("thoi-trang-phu-kien-hot-2026");
    }

    @Test
    void handlesBlankInput() {
        assertThat(SlugUtils.toSlug("")).isEmpty();
        assertThat(SlugUtils.toSlug(null)).isEmpty();
        assertThat(SlugUtils.toSlug("    ")).isEmpty();
    }
}
