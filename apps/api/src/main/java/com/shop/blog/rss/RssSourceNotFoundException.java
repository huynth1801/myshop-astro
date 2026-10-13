package com.shop.blog.rss;

import java.util.UUID;

public class RssSourceNotFoundException extends RuntimeException {

    public RssSourceNotFoundException(UUID id) {
        super("Không tìm thấy nguồn RSS với ID: " + id);
    }
}
