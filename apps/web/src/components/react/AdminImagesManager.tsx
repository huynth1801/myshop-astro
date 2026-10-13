import { useEffect, useRef, useState } from 'react';
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

type AdminImageItem = AdminProductDetail['images'][number];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (ADR 0005)
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AdminImagesManager({ detail, onChanged }: Props) {
  // Optimistic local state for smooth drag & drop
  const [images, setImages] = useState<AdminImageItem[]>(detail.images);

  useEffect(() => {
    setImages(detail.images);
  }, [detail.images]);

  // UI state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Tabs for adding images: 'upload' | 'url'
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload');
  const [newAlt, setNewAlt] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isDropActive, setIsDropActive] = useState(false);

  // Modals state
  const [editingImage, setEditingImage] = useState<AdminImageItem | null>(null);
  const [editAltValue, setEditAltValue] = useState('');
  const [deletingImage, setDeletingImage] = useState<AdminImageItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Drag & drop state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notifySuccess(msg: string) {
    setSuccess(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setSuccess(null);
    }, 3500);
  }

  async function runAction(action: () => Promise<unknown>, successMsg?: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      if (successMsg) notifySuccess(successMsg);
      onChanged();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Không thực hiện được thao tác với ảnh.');
      // Re-sync with props on failure
      setImages(detail.images);
    } finally {
      setBusy(false);
    }
  }

  // --- REORDERING & PRIMARY ACTIONS ---

  function makePrimary(index: number) {
    if (index === 0 || busy) return;
    const next = [...images];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    setImages(next);
    void runAction(
      () => reorderImages(detail.id, next.map((i) => i.id)),
      `Đã đặt ảnh #${index + 1} làm ảnh đại diện chính.`,
    );
  }

  function move(index: number, delta: -1 | 1) {
    if (busy) return;
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    void runAction(
      () => reorderImages(detail.id, next.map((i) => i.id)),
      'Đã cập nhật vị trí hình ảnh.',
    );
  }

  // HTML5 Drag and Drop for reordering cards
  function handleDragStart(e: React.DragEvent, index: number) {
    if (busy) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || busy) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const next = [...images];
    const [draggedItem] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, draggedItem);
    setImages(next);
    setDraggedIndex(null);
    setDragOverIndex(null);

    void runAction(
      () => reorderImages(detail.id, next.map((i) => i.id)),
      targetIndex === 0 ? 'Đã đổi ảnh đại diện chính của sản phẩm.' : 'Đã thay đổi thứ tự hiển thị của ảnh.',
    );
  }

  // --- ALT EDIT MODAL ---

  function openEditAlt(img: AdminImageItem) {
    setEditingImage(img);
    setEditAltValue(img.alt || '');
  }

  async function saveEditAlt() {
    if (!editingImage) return;
    const imgId = editingImage.id;
    const newAltText = editAltValue.trim();
    setEditingImage(null);
    await runAction(
      () => updateImageAlt(detail.id, imgId, newAltText),
      'Đã cập nhật mô tả SEO cho ảnh.',
    );
  }

  // --- DELETE ACTION ---

  async function confirmDelete() {
    if (!deletingImage) return;
    const imgId = deletingImage.id;
    setDeletingImage(null);
    await runAction(
      () => deleteImage(detail.id, imgId),
      'Đã xóa ảnh khỏi sản phẩm thành công.',
    );
  }

  // --- UPLOAD & ADD BY URL ---

  async function handleFilesSelected(files: FileList | File[]) {
    const fileList = Array.from(files);
    if (fileList.length === 0 || busy) return;

    // Validate files
    for (const file of fileList) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`Định dạng "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5 MB.`);
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`Đang tải lên ảnh ${i + 1}/${fileList.length} (${file.name})…`);
        await uploadImage(detail.id, file, newAlt.trim() || undefined);
      }
      notifySuccess(`Đã tải lên thành công ${fileList.length} hình ảnh.`);
      setNewAlt('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onChanged();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Tải ảnh lên thất bại.');
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function handleAddByUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim() || busy) return;
    await runAction(async () => {
      await addImageByUrl(detail.id, newUrl.trim(), newAlt.trim() || undefined);
      setNewUrl('');
      setNewAlt('');
    }, 'Đã thêm hình ảnh từ liên kết.');
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Hình ảnh sản phẩm
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {images.length} ảnh
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Ảnh vị trí đầu tiên <strong className="text-foreground">(#1)</strong> là{' '}
            <span className="font-semibold text-amber-700 dark:text-amber-400">Ảnh đại diện chính</span>{' '}
            hiển thị ngoài danh mục &amp; giỏ hàng. Kéo thả để sắp xếp hoặc bấm nút sao để chọn ảnh chính.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('admin-images-add-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            fileInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-95"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm ảnh mới
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div
          className="mt-4 flex items-start justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-destructive/80 hover:text-destructive"
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div
          className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="text-emerald-700 hover:opacity-75"
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {uploadProgress && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary animate-pulse">
          <svg className="h-4 w-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* Image Cards Grid */}
      <div className="mt-5">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-medium text-foreground">Chưa có hình ảnh nào</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Sản phẩm chưa có ảnh hiển thị. Hãy tải tệp từ thiết bị hoặc thêm từ liên kết URL bên dưới để khách hàng có thể xem.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => {
              const src = resolveImageUrl(image.url);
              const isPrimary = index === 0;
              const isDraggingThis = draggedIndex === index;
              const isDragOverThis = dragOverIndex === index;

              return (
                <div
                  key={image.id}
                  draggable={!busy}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 select-none ${
                    isPrimary
                      ? 'border-amber-500/60 ring-2 ring-amber-500/20 shadow-md'
                      : 'border-border hover:border-foreground/30 shadow-sm'
                  } ${isDraggingThis ? 'opacity-40 scale-95' : ''} ${
                    isDragOverThis ? 'ring-2 ring-primary border-primary scale-[1.02]' : ''
                  }`}
                >
                  {/* Photo area with 4:5 aspect ratio */}
                  <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden">
                    {src ? (
                      <img
                        src={src}
                        alt={image.alt || `Ảnh sản phẩm #${index + 1}`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Lỗi tải ảnh
                      </div>
                    )}

                    {/* Gradient Overlay on Hover for action clarity */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                    {/* Top Badges */}
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 z-10">
                      <span className="flex items-center justify-center rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-mono font-bold text-white shadow-sm backdrop-blur">
                        #{index + 1}
                      </span>
                      {isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-md">
                          <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Ảnh chính
                        </span>
                      )}
                    </div>

                    {/* Quick "Set as Primary" Action on non-primary images */}
                    {!isPrimary && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          makePrimary(index);
                        }}
                        title="Đặt ảnh này làm ảnh đại diện chính"
                        className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-gray-800 shadow-md backdrop-blur transition hover:bg-amber-500 hover:text-white disabled:opacity-40"
                      >
                        <svg className="h-3 w-3 text-amber-500 group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="hidden sm:inline">Đặt làm ảnh chính</span>
                        <span className="sm:hidden">Ảnh chính</span>
                      </button>
                    )}

                    {/* Hover Center Actions: Lightbox zoom & Drag indicator */}
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        title="Phóng to ảnh"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black hover:scale-110 active:scale-95"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </button>

                      <div
                        title="Kéo thả để sắp xếp vị trí"
                        className="cursor-grab active:cursor-grabbing flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black hover:scale-110"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    </div>

                    {/* Bottom Quick-Reorder Bar within Photo */}
                    <div className="absolute bottom-2 inset-x-2 z-10 flex items-center justify-between opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() => move(index, -1)}
                        title="Chuyển sang trái"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-white backdrop-blur transition hover:bg-black disabled:opacity-20 disabled:pointer-events-none"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === images.length - 1}
                        onClick={() => move(index, 1)}
                        title="Chuyển sang phải"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-white backdrop-blur transition hover:bg-black disabled:opacity-20 disabled:pointer-events-none"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: Alt text & Action buttons */}
                  <div className="flex flex-col justify-between flex-1 p-2.5 bg-card border-t border-border/50 text-xs gap-2">
                    <p
                      className="line-clamp-2 text-xs text-muted-foreground min-h-[32px] leading-tight"
                      title={image.alt || 'Chưa có mô tả alt'}
                    >
                      {image.alt ? (
                        <span>{image.alt}</span>
                      ) : (
                        <span className="italic opacity-60">Chưa có mô tả alt SEO</span>
                      )}
                    </p>

                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openEditAlt(image)}
                        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition hover:underline"
                        title="Chỉnh sửa mô tả SEO (alt text)"
                      >
                        <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Sửa Alt
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDeletingImage(image)}
                        className="inline-flex items-center gap-1 text-destructive hover:opacity-80 transition hover:underline"
                        title="Xóa ảnh khỏi sản phẩm"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Upload & Add Section */}
      <div id="admin-images-add-section" className="mt-8 rounded-xl border border-border/80 bg-muted/15 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setAddMode('upload')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                addMode === 'upload'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📁 Tải tệp lên từ máy
            </button>
            <button
              type="button"
              onClick={() => setAddMode('url')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                addMode === 'url'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🔗 Dán URL hình ảnh
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Hỗ trợ JPG, PNG, WEBP (tối đa 5 MB mỗi ảnh)
          </span>
        </div>

        {/* Tab 1: Upload Files Dropzone */}
        {addMode === 'upload' && (
          <div className="mt-4 space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDropActive(true);
              }}
              onDragLeave={() => setIsDropActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDropActive(false);
                if (e.dataTransfer.files) {
                  void handleFilesSelected(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                isDropActive
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : 'border-border/80 bg-card hover:border-primary/60 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.files) void handleFilesSelected(e.target.files);
                }}
                className="hidden"
              />
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                Kéo thả nhiều ảnh vào đây, hoặc <span className="text-primary underline">chọn từ thiết bị</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Có thể chọn nhiều ảnh cùng lúc để tải lên hàng loạt
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={newAlt}
                onChange={(e) => setNewAlt(e.target.value)}
                placeholder="Mô tả SEO (Alt) chung cho ảnh mới tải lên (tùy chọn)…"
                maxLength={255}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Add by URL */}
        {addMode === 'url' && (
          <form onSubmit={handleAddByUrl} className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Dán liên kết ảnh (/images/... hoặc https://...)"
                required
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
              />
              <input
                value={newAlt}
                onChange={(e) => setNewAlt(e.target.value)}
                placeholder="Mô tả SEO (Alt) cho ảnh (tùy chọn)…"
                maxLength={255}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
              />
            </div>

            {/* Quick URL preview if valid */}
            {newUrl.trim() && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2 text-xs">
                <img
                  src={resolveImageUrl(newUrl.trim()) || ''}
                  alt="Xem trước"
                  className="h-12 w-12 rounded object-cover border border-border bg-muted"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="truncate text-muted-foreground">Xem trước URL: {newUrl.trim()}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !newUrl.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                Thêm ảnh vào sản phẩm
              </button>
            </div>
          </form>
        )}
      </div>

      {/* --- MODAL 1: EDIT ALT TEXT --- */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">
                Chỉnh sửa mô tả ảnh (Alt SEO)
              </h3>
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex gap-4 items-start">
              <img
                src={resolveImageUrl(editingImage.url) || ''}
                alt={editingImage.alt}
                className="h-20 w-16 rounded-lg object-cover border border-border bg-muted shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-mono text-muted-foreground truncate" title={editingImage.url}>
                  {editingImage.url}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Mô tả thay thế (Alt) hỗ trợ công cụ tìm kiếm Google Images nhận diện sản phẩm và hiển thị khi kết nối mạng chậm.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <label htmlFor="edit-alt-input" className="text-xs font-medium text-foreground">
                Nội dung mô tả (Alt text)
              </label>
              <textarea
                id="edit-alt-input"
                rows={3}
                value={editAltValue}
                onChange={(e) => setEditAltValue(e.target.value)}
                maxLength={255}
                placeholder="Ví dụ: Set 6 quần chip su thạch màu be không đường may…"
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none focus:border-foreground"
              />
              <div className="flex justify-end text-[11px] text-muted-foreground">
                {editAltValue.length}/255 ký tự
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveEditAlt()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CONFIRM DELETE --- */}
      {deletingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">Xóa hình ảnh này?</h3>
            </div>

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Bạn có chắc chắn muốn xóa ảnh này khỏi sản phẩm? Thao tác này sẽ xóa liên kết ảnh và không thể hoàn tác.
            </p>

            <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
              <img
                src={resolveImageUrl(deletingImage.url) || ''}
                alt={deletingImage.alt}
                className="h-12 w-12 rounded object-cover border border-border bg-muted shrink-0"
              />
              <span className="text-xs truncate text-muted-foreground">
                {deletingImage.alt || deletingImage.url}
              </span>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setDeletingImage(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: LIGHTBOX PREVIEW --- */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative flex flex-col items-center max-w-3xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="flex w-full items-center justify-between py-2 text-white/90">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-white/20 px-2 py-0.5 font-mono">
                  {lightboxIndex + 1} / {images.length}
                </span>
                {lightboxIndex === 0 && (
                  <span className="rounded bg-amber-500 px-2 py-0.5 font-semibold text-white">
                    ⭐ Ảnh đại diện
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                title="Đóng xem trước (Esc)"
              >
                ✕
              </button>
            </div>

            {/* High-res Image */}
            <div className="relative flex items-center justify-center w-full max-h-[75vh] overflow-hidden rounded-xl bg-black/40">
              <img
                src={resolveImageUrl(images[lightboxIndex].url) || ''}
                alt={images[lightboxIndex].alt}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
              />

              {/* Prev / Next buttons */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/90 hover:scale-110 transition"
                    title="Ảnh trước"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/90 hover:scale-110 transition"
                    title="Ảnh tiếp theo"
                  >
                    →
                  </button>
                </>
              )}
            </div>

            {/* Caption */}
            <p className="mt-3 text-center text-xs text-white/80 max-w-md truncate">
              {images[lightboxIndex].alt || images[lightboxIndex].url}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
