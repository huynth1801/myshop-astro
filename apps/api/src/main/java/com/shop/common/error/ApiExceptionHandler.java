package com.shop.common.error;

import com.shop.catalog.ProductNotFoundException;
import jakarta.validation.ConstraintViolationException;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Global error handling — every error leaves the API as application/problem+json
 * with a stable `code`, a human `message`, and a `traceId` (PLAN.md §7).
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ProductNotFoundException.class)
    public ProblemDetail handleNotFound(ProductNotFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler({com.shop.cart.VariantNotFoundException.class,
            com.shop.cart.CartNotFoundException.class,
            com.shop.cart.CartItemNotFoundException.class})
    public ProblemDetail handleCartNotFound(RuntimeException ex) {
        String code = ex instanceof com.shop.cart.VariantNotFoundException ? "VARIANT_NOT_FOUND"
                : ex instanceof com.shop.cart.CartNotFoundException ? "CART_NOT_FOUND"
                : "CART_ITEM_NOT_FOUND";
        return problem(HttpStatus.NOT_FOUND, code, ex.getMessage());
    }

    @ExceptionHandler(com.shop.cart.OutOfStockException.class)
    public ProblemDetail handleOutOfStock(com.shop.cart.OutOfStockException ex) {
        return problem(HttpStatus.CONFLICT, "OUT_OF_STOCK", ex.getMessage());
    }

    @ExceptionHandler({ConstraintViolationException.class, MethodArgumentTypeMismatchException.class})
    public ProblemDetail handleValidation(Exception ex) {
        String detail = ex instanceof ConstraintViolationException cve
                ? cve.getConstraintViolations().stream()
                        .map(v -> v.getPropertyPath() + " " + v.getMessage())
                        .collect(Collectors.joining("; "))
                : ex.getMessage();
        return problem(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", detail);
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        String traceId = newTraceId();
        log.error("Unhandled error traceId={}", traceId, ex);
        ProblemDetail pd = problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred. Quote this traceId when reporting: " + traceId);
        pd.setProperty("traceId", traceId);
        return pd;
    }

    private ProblemDetail problem(HttpStatus status, String code, String detail) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setProperty("code", code);
        pd.setProperty("traceId", newTraceId());
        return pd;
    }

    private String newTraceId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
