package com.shop.common.file;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FileStorageTest {

    private static final Path TMP = Path.of("target", "file-storage-test");

    private final FileStorage storage = new FileStorage(TMP.toString());

    @BeforeEach
    void createRoot() { // @PostConstruct does not run for direct construction
        storage.createRoot();
    }

    @AfterAll
    static void cleanUp() throws IOException {
        if (Files.exists(TMP)) {
            try (var walk = Files.walk(TMP)) {
                walk.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
            }
        }
    }

    @Test
    void storesJpegWithGeneratedNameAndServesItBack() {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3};

        String name = storage.store(jpeg, "ảnh sản phẩm.JPG");

        assertThat(name).matches("^[0-9a-f-]{36}\\.jpg$");
        assertThat(storage.resolve(name)).hasValueSatisfying(path -> {
            assertThat(path).exists();
            assertThat(path.getParent()).isEqualTo(TMP.toAbsolutePath().normalize());
        });
    }

    @Test
    void storesPngAndWebp() {
        byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};
        byte[] webp = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 0, 0};

        assertThat(storage.store(png, "x.png")).endsWith(".png");
        assertThat(storage.store(webp, "x.webp")).endsWith(".webp");
    }

    @Test
    void rejectsDisallowedExtensions() {
        assertThatThrownBy(() -> storage.store(new byte[10], "evil.exe"))
                .isInstanceOf(InvalidUploadException.class);
        assertThatThrownBy(() -> storage.store(new byte[10], "noext"))
                .isInstanceOf(InvalidUploadException.class);
    }

    @Test
    void rejectsContentThatLiesAboutItsExtension() {
        byte[] text = "definitely not a jpeg".getBytes();

        assertThatThrownBy(() -> storage.store(text, "fake.jpg"))
                .isInstanceOf(InvalidUploadException.class)
                .hasMessageContaining("does not match");
    }

    @Test
    void resolveRejectsTraversalAndForeignNames() {
        List<String> bad = List.of("../secrets.txt", "..\\..\\x.jpg", "plain.jpg", "a/b.jpg", "..", "");

        for (String name : bad) {
            assertThat(storage.resolve(name)).as("rejects %s", name).isEmpty();
        }
    }
}
