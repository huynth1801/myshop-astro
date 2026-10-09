package com.shop.cart;

public class CouponMinOrderNotMetException extends RuntimeException {

    public CouponMinOrderNotMetException(String code, long minOrderCents, long subtotalCents) {
        super("Coupon " + code + " needs a minimum order of " + minOrderCents
                + " (minor units), cart subtotal is " + subtotalCents);
    }
}
