package com.shop.order.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.HashMap;
import java.util.Map;

public record CustomerAddressDto(
        @NotBlank(message = "Full name is required") @Size(max = 255) String fullName,
        @NotBlank(message = "Phone number is required") @Size(max = 32) String phone,
        @NotBlank(message = "Email is required") @Email(message = "Invalid email format") @Size(max = 255) String email,
        @NotBlank(message = "Address line is required") @Size(max = 255) String line1,
        @NotBlank(message = "City / Province is required") @Size(max = 255) String city,
        @Size(max = 255) String district,
        @Size(max = 255) String ward,
        @Size(max = 32) String postalCode,
        @Size(max = 2) String countryCode
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
                (String) map.getOrDefault("email", ""),
                (String) map.getOrDefault("line1", ""),
                (String) map.getOrDefault("city", ""),
                (String) map.get("district"),
                (String) map.get("ward"),
                (String) map.get("postalCode"),
                (String) map.getOrDefault("countryCode", "VN")
        );
    }
}
