import { useEffect, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import {
  adminCreatePost,
  adminDeletePost,
  adminGetPost,
  adminUpdatePost,
  type AdminPostDetail,
  type PostStatus,
  BlogApiError,
} from '../../lib/api/blog';
import { listProducts, type AdminProduct } from '../../lib/api/admin';
import { resolveImageUrl } from '../../lib/api/urls';
import { authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import { toast } from '../../lib/stores/toast';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  postId: string;
}

export default function AdminBlogEdit({ postId }: Props) {
  const isNew = postId === 'new';
  const user = useStore(authUser);

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<PostStatus>('DRAFT');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Products available to link & Search state
  const [availableProducts, setAvailableProducts] = useState<AdminProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productFilterTab, setProductFilterTab] = useState<'all' | 'selected'>('all');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    bootstrapAuth().finally(() => {
      setAuthChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    // Fetch all products across pages (up to 1000 items)
    const loadAllProducts = async () => {
      try {
        let all: AdminProduct[] = [];
        let p = 0;
        let totalPages = 1;
        while (p < totalPages && p < 10) {
          const res = await listProducts({ page: p, size: 100 });
          all = [...all, ...res.content];
          totalPages = res.totalPages;
          p++;
        }
        setAvailableProducts(all);
      } catch (err) {
        console.error('Failed to load products for blog', err);
      }
    };

    void loadAllProducts();

    if (isNew) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    adminGetPost(postId)
      .then((post: AdminPostDetail) => {
        setTitle(post.title);
        setSlug(post.slug);
        setSummary(post.summary || '');
        setContent(post.content);
        setFeaturedImage(post.featuredImage || '');
        setAuthor(post.author || '');
        setStatus(post.status);
        setSeoTitle(post.seoTitle || '');
        setSeoDescription(post.seoDescription || '');
        setSelectedProductIds(post.relatedProductIds || []);
      })
      .catch((err) => {
        setError(err instanceof BlogApiError ? err.message : 'Không tìm thấy bài viết.');
      })
      .finally(() => setLoading(false));
  }, [postId, isNew, user]);

  const toggleProduct = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId],
    );
  };

  const handleClearSelectedProducts = () => {
    setSelectedProductIds([]);
  };

  const normalizeVi = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

  const filteredProducts = availableProducts.filter((prod) => {
    if (productFilterTab === 'selected' && !selectedProductIds.includes(prod.id)) {
      return false;
    }

    if (!productSearch.trim()) return true;

    const queryNorm = normalizeVi(productSearch.trim());
    const nameNorm = normalizeVi(prod.name);
    const categoryNorm = normalizeVi(prod.category.name);

    return nameNorm.includes(queryNorm) || categoryNorm.includes(queryNorm);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      const msg = 'Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title: title.trim().slice(0, 255),
      slug: slug.trim().slice(0, 255) || undefined,
      summary: summary.trim().slice(0, 500) || undefined,
      content,
      featuredImage: featuredImage.trim().slice(0, 2048) || null,
      author: author.trim().slice(0, 100) || null,
      status,
      seoTitle: seoTitle.trim().slice(0, 255) || null,
      seoDescription: seoDescription.trim().slice(0, 500) || null,
      relatedProductIds: selectedProductIds,
    };

    try {
      if (isNew) {
        const created = await adminCreatePost(payload);
        const msg = 'Đã tạo bài viết mới thành công!';
        setSuccess(msg);
        toast.success(msg);
        setTimeout(() => {
          window.location.href = `/admin/blog/${created.id}`;
        }, 800);
      } else {
        await adminUpdatePost(postId, payload);
        const msg = 'Đã cập nhật bài viết thành công!';
        setSuccess(msg);
        toast.success(msg);
      }
    } catch (err) {
      const msg = err instanceof BlogApiError ? err.message : 'Lỗi khi lưu bài viết.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await adminDeletePost(postId);
      toast.success('Đã xóa bài viết thành công!');
      setShowDeleteConfirm(false);
      setTimeout(() => {
        window.location.href = '/admin/blog';
      }, 500);
    } catch (err) {
      const msg = err instanceof BlogApiError ? err.message : 'Lỗi khi xóa bài viết.';
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (!user) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Cần đăng nhập tài khoản ADMIN — bấm <strong>Đăng nhập</strong> trên thanh menu.
      </p>
    );
  }
  if (user.role !== 'ADMIN') {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Tài khoản <strong>{user.email}</strong> không có quyền quản trị.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Đang tải thông tin bài viết...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <a
            href="/admin/blog"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1.5 transition"
          >
            ← Quay lại danh sách
          </a>
          <h2
            className="text-xl font-semibold text-foreground break-words line-clamp-2"
            title={isNew ? 'Viết bài mới' : `Chỉnh sửa: ${title || 'Bài viết'}`}
          >
            {isNew ? 'Viết bài mới' : `Chỉnh sửa: ${title || 'Bài viết'}`}
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
            className="h-9 shrink-0 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="DRAFT">Bản nháp (DRAFT)</option>
            <option value="PUBLISHED">Xuất bản (PUBLISHED)</option>
          </select>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-foreground px-5 text-xs font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? 'Đang lưu...' : isNew ? 'Tạo bài viết' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content Area (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title & Slug */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tiêu đề bài viết *
                </label>
                <span className="text-[10px] text-muted-foreground">{title.length}/255</span>
              </div>
              <input
                type="text"
                required
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: 5 Xu Hướng Thời Trang Mùa Đông 2026..."
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Đường dẫn tĩnh (Slug)
                </label>
                <span className="text-[10px] text-muted-foreground">{slug.length}/255</span>
              </div>
              <input
                type="text"
                maxLength={255}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Để trống hệ thống sẽ tự sinh từ tiêu đề (VD: 5-xu-huong-thoi-trang...)"
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tóm tắt ngắn (Summary)
                </label>
                <span className={`text-[10px] ${summary.length > 480 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                  {summary.length}/500 ký tự
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Mô tả súc tích nội dung bài viết, hiển thị ở thẻ danh sách và mở đầu bài..."
                className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Article Body with Editor / Preview tabs */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nội dung bài viết *
              </label>
              <div className="flex rounded-md border border-border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`rounded px-3 py-1 font-medium transition ${
                    activeTab === 'editor' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Mã HTML / Soạn thảo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`rounded px-3 py-1 font-medium transition ${
                    activeTab === 'preview' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  Xem trước (Preview)
                </button>
              </div>
            </div>

            {activeTab === 'editor' ? (
              <div>
                <textarea
                  rows={18}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="<p>Nhập nội dung bài viết dạng HTML hoặc văn bản...</p>"
                  className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Hỗ trợ định dạng HTML sạch: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;img&gt;, &lt;ul&gt;, &lt;blockquote&gt;.
                </p>
              </div>
            ) : (
              <div
                className="min-h-[300px] rounded-md border border-border/60 bg-background/50 p-6 prose prose-neutral max-w-none text-sm text-foreground
                  prose-headings:text-foreground prose-img:rounded-lg prose-img:max-h-96"
                dangerouslySetInnerHTML={{ __html: content || '<p className="text-muted-foreground italic">Chưa có nội dung để hiển thị.</p>' }}
              />
            )}
          </div>

          {/* SEO Metadata Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Tối ưu hóa tìm kiếm (SEO)</h3>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs text-muted-foreground">SEO Title</label>
                <span className="text-[10px] text-muted-foreground">{seoTitle.length}/255</span>
              </div>
              <input
                type="text"
                maxLength={255}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Tiêu đề hiển thị trên Google (mặc định lấy tiêu đề bài viết)"
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs text-muted-foreground">SEO Description</label>
                <span className={`text-[10px] ${seoDescription.length > 480 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                  {seoDescription.length}/500 ký tự
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={500}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Mô tả meta snippet hiển thị trên Google (150-160 ký tự)"
                className="mt-1 w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Settings (1 col) */}
        <div className="space-y-6">
          {/* Featured Image */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ảnh đại diện (Cover Image)
            </h3>
            <input
              type="text"
              maxLength={2048}
              value={featuredImage}
              onChange={(e) => setFeaturedImage(e.target.value)}
              placeholder="https://... hoặc /images/..."
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {featuredImage && (
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-muted">
                <img
                  src={resolveImageUrl(featuredImage) || ''}
                  alt="Preview cover"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Author */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tác giả</h3>
              <span className="text-[10px] text-muted-foreground">{author.length}/100</span>
            </div>
            <input
              type="text"
              maxLength={100}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="VD: Biên tập viên, Stylist..."
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Linked Products for Conversion */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sản phẩm nhắc đến trong bài
              </h3>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                {selectedProductIds.length} đã chọn
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Chọn các sản phẩm trong cửa hàng để tự động gắn thẻ sản phẩm vào cuối bài viết, giúp chuyển đổi người đọc thành khách mua.
            </p>

            {/* Product Search Box */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm sản phẩm theo tên, danh mục..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background pl-8.5 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Tabs & Selection Actions */}
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setProductFilterTab('all')}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    productFilterTab === 'all'
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  Tất cả ({availableProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilterTab('selected')}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    productFilterTab === 'selected'
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  Đã chọn ({selectedProductIds.length})
                </button>
              </div>

              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelectedProducts}
                  className="text-muted-foreground hover:text-destructive text-[11px] underline decoration-dotted transition"
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>

            {/* Scrollable Products List */}
            <div
              className="max-h-[300px] space-y-2 overflow-y-auto pr-1.5 overscroll-contain"
              style={{ maxHeight: '300px' }}
            >
              {filteredProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  {productFilterTab === 'selected' ? (
                    <>
                      <p>Chưa có sản phẩm nào được chọn.</p>
                      <button
                        type="button"
                        onClick={() => setProductFilterTab('all')}
                        className="mt-2 text-xs font-medium text-accent hover:underline"
                      >
                        Xem tất cả sản phẩm để chọn
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Không tìm thấy sản phẩm nào khớp với &quot;{productSearch}&quot;.</p>
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="mt-2 text-xs font-medium text-accent hover:underline"
                      >
                        Xóa bộ lọc tìm kiếm
                      </button>
                    </>
                  )}
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  const thumb = resolveImageUrl(prod.image?.url);
                  return (
                    <label
                      key={prod.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-xs transition select-none ${
                        isSelected
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10'
                          : 'border-border/60 hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProduct(prod.id)}
                        className="h-4 w-4 cursor-pointer rounded border-input text-primary accent-primary focus:ring-primary shrink-0"
                      />
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        {thumb ? (
                          <img src={thumb} alt={prod.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-foreground">{prod.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between mt-0.5">
                          <span>{prod.category.name}</span>
                          {prod.priceFromCents != null && (
                            <span className="font-medium text-foreground">
                              {(prod.priceFromCents / 100).toLocaleString('vi-VN')}₫
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            {/* Results Counter Footer */}
            {availableProducts.length > 0 && (
              <div className="pt-1 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>
                  Đang hiển thị {filteredProducts.length}/{availableProducts.length} sản phẩm
                </span>
                {productSearch && (
                  <span className="text-accent">
                    Đang lọc: &quot;{productSearch}&quot;
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone for Existing Posts */}
      {!isNew && (
        <div className="rounded-xl border border-red-200/80 bg-red-50/30 p-5 dark:border-red-900/60 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              Khu vực nguy hiểm
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Xóa vĩnh viễn bài viết này khỏi hệ thống blog của cửa hàng. Thao tác này không thể hoàn tác.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 dark:border-red-800 dark:bg-red-600 dark:hover:bg-red-500 whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Xóa bài viết</span>
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {!isNew && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Xác nhận xóa bài viết"
          description="Bạn có chắc chắn muốn xóa bài viết này khỏi hệ thống blog của cửa hàng? Hành động này không thể hoàn tác."
          itemName={title || 'Bài viết'}
          confirmLabel="Xóa bài viết"
          cancelLabel="Hủy"
          variant="danger"
          isLoading={isDeleting}
          errorMessage={deleteError}
          onConfirm={handleConfirmDelete}
          onClose={() => {
            if (!isDeleting) {
              setShowDeleteConfirm(false);
              setDeleteError(null);
            }
          }}
        />
      )}
    </form>
  );
}
