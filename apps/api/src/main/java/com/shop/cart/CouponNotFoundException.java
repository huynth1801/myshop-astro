package com.shop.cart;

public class CouponNotFoundException extends RuntimeException {

    public CouponNotFoundException(String code) {
        super("No active coupon with code '" + code + "'");
    }
}
