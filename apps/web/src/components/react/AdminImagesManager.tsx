import { useRef, useState } from 'react';
import {
  addImageByUrl,
  AdminError,
  deleteImage,
  reorderImages,
  updateImageAlt,
  uploadImage,
  type AdminProductDetail,
} from '../../lib/api/admin';
import { resolveImageUrl } from '../../lib/api/urls';

interface Props {
  detail: AdminProductDetail;
  onChanged: () => void;
}

/** Section "Hình ảnh" — grid with reorder/alt/delete + add by upload or URL (ADR 0005). */
export default function AdminImagesManager({ detail, onChanged }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Không thực hiện được thao tác với ảnh.');
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: -1 | 1) {
    const ids = detail.images.map((i) => i.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(() => reorderImages(detail.id, ids));
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const ids = detail.images.map((i) => i.id);
    const [selected] = ids.splice(index, 1);
    ids.unshift(selected);
    void run(() => reorderImages(detail.id, ids));
  }

  async function handleFile(file: File) {
    await run(() => uploadImage(detail.id, file, alt.trim() || undefined));
    setAlt('');
    if (fileInput.current) fileInput.current.value = '';
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Hình ảnh sản phẩm ({detail.images.length})</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ảnh vị trí đầu tiên (#1) sẽ là ảnh đại diện hiển thị ngoài danh mục &amp; giỏ hàng.
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {detail.images.map((image, index) => {
          const src = resolveImageUrl(image.url);
          return (
            <figure key={image.id} className="group relative overflow-hidden rounded-xl border border-border bg-muted/20">
              <div className="relative aspect-[4/5] bg-muted">
                {src ? (
                  <img
                    src={src}
                    alt={image.alt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Lỗi tải ảnh
                  </div>
                )}
                <div className="absolute left-2 top-2 flex items-center gap-1">
                  <span className="rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-mono font-bold backdrop-blur">
                    #{index + 1}
                  </span>
                  {index === 0 && (
                    <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                      Ảnh chính
                    </span>
                  )}
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => makePrimary(index)}
                    title="Đặt ảnh này làm ảnh chính"
                    className="absolute right-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground opacity-90 shadow-sm backdrop-blur transition hover:bg-background hover:opacity-100 disabled:opacity-40"
                  >
                    ⭐ Đặt ảnh chính
                  </button>
                )}
              </div>
              <figcaption className="space-y-2 p-2.5">
                {editingId === image.id ? (
                  <>
                    <input
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      aria-label={`Mô tả ảnh ${index + 1}`}
                      maxLength={255}
                      placeholder="Mô tả cho SEO (alt)..."
                      className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    />
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await updateImageAlt(detail.id, image.id, editAlt);
                            setEditingId(null);
                          })
                        }
                        className="rounded-full bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Huỷ
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="line-clamp-1 text-xs text-muted-foreground" title={image.alt}>
                      {image.alt || '— Chưa có mô tả alt —'}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs pt-1 border-t border-border/50">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={`Chuyển ảnh ${index + 1} lên trước`}
                          title="Chuyển lên trước"
                          className="rounded-md border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === detail.images.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={`Chuyển ảnh ${index + 1} xuống sau`}
                          title="Chuyển xuống sau"
                          className="rounded-md border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(image.id);
                            setEditAlt(image.alt);
                          }}
                          className="text-xs text-foreground hover:underline"
                        >
                          Sửa Alt
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (confirm(`Xóa ảnh #${index + 1} khỏi sản phẩm?`)) void run(() => deleteImage(detail.id, image.id));
                          }}
                          className="text-xs text-destructive hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-border p-4">
        <h3 className="text-sm font-medium">Thêm ảnh</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Mô tả ảnh (alt) — dùng chung cho ảnh mới"
              aria-label="Mô tả ảnh mới"
              maxLength={255}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Chọn ảnh để tải lên"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground"
            />
            <p className="text-xs text-muted-foreground">jpg / png / webp, tối đa 5 MB</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim() === '' || busy) return;
              void run(async () => {
                await addImageByUrl(detail.id, url.trim(), alt.trim() || undefined);
                setUrl('');
              });
            }}
          >
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="…hoặc dán URL ảnh (/images/… hoặc https://…)"
              aria-label="URL ảnh"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <button
              type="submit"
              disabled={busy || url.trim() === ''}
              className="h-9 shrink-0 rounded-full border border-border px-4 text-sm font-medium disabled:opacity-40"
            >
              Thêm
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
