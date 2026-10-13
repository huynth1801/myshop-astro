import { useCallback, useEffect, useState } from 'react';
import {
  adminCreatePost,
  adminDeletePost,
  adminListPosts,
  adminCrawlPost,
  type PostSummary,
  type PostStatus,
  BlogApiError,
} from '../../lib/api/blog';
import { resolveImageUrl } from '../../lib/api/urls';
import { authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';

export default function AdminBlogDashboard() {
  const user = useStore(authUser);
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Crawler modal state
  const [crawlModalOpen, setCrawlModalOpen] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  const loadPosts = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const paged = await adminListPosts({
          page: targetPage,
          size: 10,
          status: status ? (status as PostStatus) : undefined,
          q: q.trim() || undefined,
        });
        setPosts(paged.content);
        setPage(paged.page);
        setTotalPages(paged.totalPages);
        setTotalElements(paged.totalElements);
      } catch (err) {
        setError(err instanceof BlogApiError ? err.message : 'Không tải được danh sách bài viết.');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [page, status, q],
  );

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void loadPosts(0);
    }
  }, [user, status, loadPosts]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài viết "${title}"?`)) return;
    setDeletingId(id);
    try {
      await adminDeletePost(id);
      await loadPosts();
    } catch (err) {
      alert(err instanceof BlogApiError ? err.message : 'Lỗi khi xóa bài viết.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrl.trim()) return;
    setCrawling(true);
    setCrawlError(null);

    try {
      const crawled = await adminCrawlPost(crawlUrl.trim());
      // Auto-save as draft and navigate to edit
      const created = await adminCreatePost({
        title: crawled.title,
        slug: crawled.suggestedSlug,
        summary: crawled.summary || '',
        content: crawled.content,
        featuredImage: crawled.featuredImage,
        author: crawled.author || 'Admin Biên tập',
        status: 'DRAFT',
        seoTitle: crawled.title,
        seoDescription: crawled.summary || '',
        relatedProductIds: [],
      });
      setCrawlModalOpen(false);
      window.location.href = `/admin/blog/${created.id}`;
    } catch (err) {
      setCrawlError(
        err instanceof BlogApiError
          ? err.message
          : 'Không thể bóc tách nội dung từ link này. Vui lòng thử lại với URL khác.',
      );
    } finally {
      setCrawling(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, tóm tắt..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadPosts(0)}
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
          </select>

          <button
            type="button"
            onClick={() => void loadPosts(0)}
            className="h-9 rounded-md border border-border bg-muted/60 px-3 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Lọc
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCrawlUrl('');
              setCrawlError(null);
              setCrawlModalOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3.5 text-xs font-medium text-foreground transition hover:bg-accent/20"
          >
            <span>🕷️ Crawl từ URL</span>
          </button>

          <a
            href="/admin/blog/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-medium text-background transition hover:bg-foreground/90"
          >
            <span>+ Viết bài mới</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Post Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ảnh</th>
                <th className="px-4 py-3">Tiêu đề bài viết</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Tác giả</th>
                <th className="px-4 py-3">Ngày tạo / xuất bản</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Đang tải danh sách bài viết...
                  </td>
                </tr>
              ) : !posts || posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Chưa có bài viết nào phù hợp. Hãy nhấn <strong>+ Viết bài mới</strong> hoặc <strong>Crawl từ URL</strong>.
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const coverUrl = resolveImageUrl(post.featuredImage);
                  const isPublished = post.status === 'PUBLISHED';
                  return (
                    <tr key={post.id} className="transition hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="h-12 w-16 overflow-hidden rounded border border-border bg-muted">
                          {coverUrl ? (
                            <img src={coverUrl} alt={post.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                              No img
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <div className="font-medium text-foreground">{post.title}</div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">/{post.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isPublished
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{post.author || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString('vi-VN')
                          : new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isPublished && (
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted-foreground underline hover:text-foreground"
                            >
                              Xem
                            </a>
                          )}
                          <a
                            href={`/admin/blog/${post.id}`}
                            className="rounded border border-border px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                          >
                            Sửa
                          </a>
                          <button
                            type="button"
                            disabled={deletingId === post.id}
                            onClick={() => void handleDelete(post.id, post.title)}
                            className="rounded border border-destructive/30 px-2 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                          >
                            {deletingId === post.id ? '...' : 'Xóa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Tổng cộng {totalElements} bài viết</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => void loadPosts(page - 1)}
                className="rounded border border-border px-2.5 py-1 transition hover:bg-muted disabled:opacity-40"
              >
                Trước
              </button>
              <span>
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => void loadPosts(page + 1)}
                className="rounded border border-border px-2.5 py-1 transition hover:bg-muted disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Crawl Modal */}
      {crawlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Crawl bài viết từ liên kết ngoài</h3>
              <button
                type="button"
                onClick={() => setCrawlModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrawl} className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dán URL bài viết (báo chí, blog thời trang, tin tức). Hệ thống sẽ bóc tách tiêu đề, tóm tắt, ảnh cover và
                nội dung sạch, sau đó tự động lưu vào <strong>Bản nháp (DRAFT)</strong> để bạn tinh chỉnh và chèn sản phẩm trước khi xuất bản.
              </p>

              <div>
                <label className="block text-xs font-medium text-foreground">URL bài viết nguồn</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/bai-viet-thoi-trang..."
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  disabled={crawling}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {crawlError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {crawlError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={crawling}
                  onClick={() => setCrawlModalOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={crawling || !crawlUrl.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
                >
                  {crawling ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                      <span>Đang bóc tách...</span>
                    </>
                  ) : (
                    <span>Bắt đầu Crawl</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
