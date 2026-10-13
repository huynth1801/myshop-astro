package com.shop.blog;

import com.shop.catalog.Product;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "post_related_products")
@IdClass(PostRelatedProductId.class)
public class PostRelatedProduct {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id")
    private Post post;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private int position;

    public PostRelatedProduct() {
    }

    public PostRelatedProduct(Post post, Product product, int position) {
        this.post = post;
        this.product = product;
        this.position = position;
    }

    public Post getPost() {
        return post;
    }

    public Product getProduct() {
        return product;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
