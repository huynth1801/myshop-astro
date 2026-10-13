package com.shop.blog.rss;

public class RssSourceAlreadyExistsException extends RuntimeException {

    public RssSourceAlreadyExistsException(String url) {
        super("URL nguồn RSS này đã tồn tại trong hệ thống: " + url);
    }
}
