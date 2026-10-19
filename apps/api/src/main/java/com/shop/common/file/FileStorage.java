package com.shop.common.file;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Local upload storage (ADR 0005): files land under shop.uploads.dir with a
 * generated UUID name; /api/v1/files/{name} serves them back. Swap this class
 * for S3/Cloudinary later — callers only see the stored name.
 */
@Component
public class FileStorage {

    /** Generated names only — this pattern is also the path-traversal guard. */
    private static final Pattern NAME_PATTERN = Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png|webp)$");

    private final Path root;

    public FileStorage(@Value("${shop.uploads.dir:./data/uploads}") String dir) {
        this.root = Path.of(dir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void createRoot() {
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create upload dir " + root, e);
        }
    }

    /**
     * Validates content and extension, writes the file, returns its generated name.
     *
     * @throws InvalidUploadException wrong extension or content is not a real jpg/png/webp
     */
    public String store(byte[] content, String originalFilename) {
        String ext = extensionOf(originalFilename);
        if (!hasMagicBytes(content, ext)) {
            throw new InvalidUploadException("File content does not match a " + ext + " image");
        }
        String name = UUID.randomUUID() + "." + ext;
        try {
            Files.write(root.resolve(name), content);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot write upload " + name, e);
        }
        return name;
    }

    /** @return the absolute path for a generated name, or empty for anything else */
    public java.util.Optional<Path> resolve(String name) {
        if (!NAME_PATTERN.matcher(name.toLowerCase(Locale.ROOT)).matches()) {
            return java.util.Optional.empty();
        }
        Path path = root.resolve(name).normalize();
        return path.startsWith(root) ? java.util.Optional.of(path) : java.util.Optional.empty();
    }

    private static String extensionOf(String originalFilename) {
        int dot = originalFilename == null ? -1 : originalFilename.lastIndexOf('.');
        String ext = dot < 0 ? "" : originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case "jpg", "jpeg" -> "jpg";
            case "png" -> "png";
            case "webp" -> "webp";
            default -> throw new InvalidUploadException("Only jpg, png and webp are accepted");
        };
    }

    /** Cheap magic-byte check so a renamed .txt cannot pass as an image. */
    private static boolean hasMagicBytes(byte[] content, String ext) {
        return switch (ext) {
            case "jpg" -> content.length > 3
                    && (content[0] & 0xFF) == 0xFF && (content[1] & 0xFF) == 0xD8 && (content[2] & 0xFF) == 0xFF;
            case "png" -> content.length > 8 && (content[0] & 0xFF) == 0x89 && content[1] == 0x50
                    && content[2] == 0x4E && content[3] == 0x47;
            case "webp" -> content.length > 12 && content[0] == 0x52 && content[1] == 0x49
                    && content[2] == 0x46 && content[3] == 0x46 && content[8] == 0x57 && content[9] == 0x45;
            default -> false;
        };
    }
}
