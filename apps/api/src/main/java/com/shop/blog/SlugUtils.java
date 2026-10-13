package com.shop.blog;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class SlugUtils {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9]+");

    private SlugUtils() {
    }

    public static String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }

        // Replace specific Vietnamese characters before diacritics stripping
        String text = input.replace("đ", "d").replace("Đ", "d");

        // Decompose diacritics & strip marks
        text = Normalizer.normalize(text, Normalizer.Form.NFD);
        text = DIACRITICS.matcher(text).replaceAll("");

        // Lowercase & replace non-alphanumerics with hyphens
        text = text.toLowerCase(Locale.ROOT);
        text = NON_ALPHANUMERIC.matcher(text).replaceAll("-");

        // Strip leading and trailing hyphens
        text = text.replaceAll("^-+|-+$", "");

        if (text.length() > 200) {
            text = text.substring(0, 200).replaceAll("-+$", "");
        }

        return text;
    }
}
