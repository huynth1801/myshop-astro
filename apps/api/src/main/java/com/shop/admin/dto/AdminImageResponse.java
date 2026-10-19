package com.shop.admin.dto;

/** Admin image row: carries the id the reorder/alt/delete endpoints need. */
public record AdminImageResponse(java.util.UUID id, String url, String alt, int position) {
}
