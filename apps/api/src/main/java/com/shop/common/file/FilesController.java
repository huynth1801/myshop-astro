package com.shop.common.file;

import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Serves uploaded files — public + immutable (names are UUIDs, ADR 0005). */
@RestController
@RequestMapping("/api/v1/files")
public class FilesController {

    private static final MediaType WEBP = MediaType.parseMediaType("image/webp");

    private final FileStorage storage;

    public FilesController(FileStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/{name:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String name) {
        java.util.Optional<Path> resolved = storage.resolve(name);
        if (resolved.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        MediaType type = name.endsWith(".png") ? MediaType.IMAGE_PNG
                : name.endsWith(".webp") ? WEBP : MediaType.IMAGE_JPEG;
        Resource body = new FileSystemResource(resolved.get());
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .body(body);
    }
}
