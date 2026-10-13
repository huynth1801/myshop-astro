import { useEffect, useState } from 'react';
import {
  adminCreatePost,
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

interface Props {
  postId: string;
}

export default function AdminBlogEdit({ postId }: Props) {
  const isNew = postId === 'new';
  const user = useStore(authUser);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Products available to link
  const [availableProducts, setAvailableProducts] = useState<AdminProduct[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  useEffect(() => {
    void bootstrapAuth();
    listProducts()
      .then((res) => setAvailableProducts(res.content))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
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
  }, [postId, isNew]);

  const toggleProduct = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Vui lòng nhập đầy đủ tiêu đề và nội dung bài viết.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      summary: summary.trim() || undefined,
      content,
      featuredImage: featuredImage.trim() || null,
      author: author.trim() || null,
      status,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      relatedProductIds: selectedProductIds,
    };

    try {
      if (isNew) {
        const created = await adminCreatePost(payload);
        setSuccess('Đã tạo bài viết thành công!');
        setTimeout(() => {
          window.location.href = `/admin/blog/${created.id}`;
        }, 1000);
      } else {
        await adminUpdatePost(postId, payload);
        setSuccess('Đã cập nhật bài viết thành công!');
      }
    } catch (err) {
      setError(err instanceof BlogApiError ? err.message : 'Lỗi khi lưu bài viết.');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
        Bạn không có quyền truy cập trang này.
      </div>
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <a
            href="/admin/blog"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            ← Quay lại danh sách
          </a>
          <h2 className="text-xl font-semibold text-foreground">
            {isNew ? 'Viết bài mới' : `Chỉnh sửa: ${title || 'Bài viết'}`}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="DRAFT">Bản nháp (DRAFT)</option>
            <option value="PUBLISHED">Xuất bản (PUBLISHED)</option>
          </select>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-5 text-xs font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tiêu đề bài viết *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: 5 Xu Hướng Thời Trang Mùa Đông 2026..."
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Đường dẫn tĩnh (Slug)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Để trống hệ thống sẽ tự sinh từ tiêu đề (VD: 5-xu-huong-thoi-trang...)"
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-muted-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tóm tắt ngắn (Summary)
              </label>
              <textarea
                rows={3}
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
              <label className="block text-xs text-muted-foreground">SEO Title</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Tiêu đề hiển thị trên Google (mặc định lấy tiêu đề bài viết)"
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">SEO Description</label>
              <textarea
                rows={2}
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tác giả</h3>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="VD: Biên tập viên, Stylist..."
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Linked Products for Conversion */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sản phẩm nhắc đến trong bài
              </h3>
              <span className="text-[11px] font-medium text-accent">
                {selectedProductIds.length} đã chọn
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Chọn các sản phẩm trong cửa hàng để tự động gắn thẻ sản phẩm vào cuối bài viết, giúp chuyển đổi người đọc thành khách mua.
            </p>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {availableProducts.map((prod) => {
                const isSelected = selectedProductIds.includes(prod.id);
                const thumb = resolveImageUrl(prod.image?.url);
                return (
                  <label
                    key={prod.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 text-xs transition ${
                      isSelected
                        ? 'border-foreground bg-muted/60'
                        : 'border-border/60 hover:border-border'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProduct(prod.id)}
                      className="rounded border-border"
                    />
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded border border-border bg-muted">
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
                      <div className="text-[11px] text-muted-foreground">{prod.category.name}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
