package com.shop.order.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.HashMap;
import java.util.Map;

public record CustomerAddressDto(
        @NotBlank(message = "Full name is required") String fullName,
        @NotBlank(message = "Phone number is required") String phone,
        String email,
        @NotBlank(message = "Address line is required") String line1,
        @NotBlank(message = "City / Province is required") String city,
        String district,
        String ward,
        String postalCode,
        String countryCode
) {
    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        map.put("fullName", fullName);
        map.put("phone", phone);
        if (email != null) map.put("email", email);
        map.put("line1", line1);
        map.put("city", city);
        if (district != null) map.put("district", district);
        if (ward != null) map.put("ward", ward);
        if (postalCode != null) map.put("postalCode", postalCode);
        map.put("countryCode", countryCode != null ? countryCode : "VN");
        return map;
    }

    public static CustomerAddressDto fromMap(Map<String, Object> map) {
        if (map == null) return null;
        return new CustomerAddressDto(
                (String) map.getOrDefault("fullName", ""),
                (String) map.getOrDefault("phone", ""),
                (String) map.get("email"),
                (String) map.getOrDefault("line1", ""),
                (String) map.getOrDefault("city", ""),
                (String) map.get("district"),
                (String) map.get("ward"),
                (String) map.get("postalCode"),
                (String) map.getOrDefault("countryCode", "VN")
        );
    }
}
