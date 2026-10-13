package com.shop.blog;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class PostRelatedProductId implements Serializable {

    private UUID post;
    private UUID product;

    public PostRelatedProductId() {
    }

    public PostRelatedProductId(UUID post, UUID product) {
        this.post = post;
        this.product = product;
    }

    public UUID getPost() {
        return post;
    }

    public void setPost(UUID post) {
        this.post = post;
    }

    public UUID getProduct() {
        return product;
    }

    public void setProduct(UUID product) {
        this.product = product;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PostRelatedProductId that = (PostRelatedProductId) o;
        return Objects.equals(post, that.post) && Objects.equals(product, that.product);
    }

    @Override
    public int hashCode() {
        return Objects.hash(post, product);
    }
}
