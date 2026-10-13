import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileEdit,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Rss,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  adminCreatePost,
  adminDeletePost,
  adminListPosts,
  adminBulkDeletePosts,
  adminBulkUpdatePostStatus,
  adminCrawlPost,
  adminListRssSources,
  adminCreateRssSource,
  adminDeleteRssSource,
  adminScanAllRss,
  adminScanRssSource,
  type PostSummary,
  type PostStatus,
  type RssSource,
  BlogApiError,
} from '../../lib/api/blog';
import { resolveImageUrl } from '../../lib/api/urls';
import { authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import ConfirmDialog from './ConfirmDialog';

export default function AdminBlogDashboard() {
  const user = useStore(authUser);
  const [activeTab, setActiveTab] = useState<'posts' | 'rss'>('posts');

  // Posts State
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Direct Quick Crawler Bar state
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [crawlSuccess, setCrawlSuccess] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'post'; id: string; title: string }
    | { type: 'rss'; id: string; title: string }
    | { type: 'bulk-post'; count: number }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // RSS State
  const [rssSources, setRssSources] = useState<RssSource[] | null>(null);
  const [loadingRss, setLoadingRss] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [rssSuccess, setRssSuccess] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [recentScannedPosts, setRecentScannedPosts] = useState<PostSummary[]>([]);

  // New RSS Form State
  const [newRssName, setNewRssName] = useState('');
  const [newRssUrl, setNewRssUrl] = useState('');
  const [newRssCategory, setNewRssCategory] = useState('');
  const [addingRss, setAddingRss] = useState(false);

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

  const loadRssSources = useCallback(async () => {
    setLoadingRss(true);
    setRssError(null);
    try {
      const paged = await adminListRssSources(0, 50);
      setRssSources(paged.content);
    } catch (err) {
      setRssError(err instanceof BlogApiError ? err.message : 'Không tải được danh sách nguồn RSS.');
      setRssSources([]);
    } finally {
      setLoadingRss(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void loadPosts(0);
      void loadRssSources();
    }
  }, [user, status, loadPosts, loadRssSources]);

  const currentPageIds = posts ? posts.map((p) => p.id) : [];
  const isAllOnPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isSomeOnPageSelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !isAllOnPageSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeOnPageSelected;
    }
  }, [isSomeOnPageSelected]);

  const handleToggleSelectAllPage = () => {
    if (isAllOnPageSelected) {
      // Unselect all on current page
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleUnselectAll = () => {
    setSelectedIds([]);
  };

  const handleBulkStatusChange = async (newStatus: PostStatus) => {
    if (selectedIds.length === 0) return;
    setIsBulkOperating(true);
    setBulkFeedback(null);
    try {
      const res = await adminBulkUpdatePostStatus(selectedIds, newStatus);
      const statusLabel = newStatus === 'PUBLISHED' ? 'Đã xuất bản (PUBLISHED)' : 'Bản nháp (DRAFT)';
      setBulkFeedback({
        type: 'success',
        message: `Đã cập nhật trạng thái thành công cho ${res.count} bài viết sang "${statusLabel}".`,
      });
      setSelectedIds([]);
      await loadPosts();
    } catch (err) {
      setBulkFeedback({
        type: 'error',
        message: err instanceof BlogApiError ? err.message : 'Có lỗi khi cập nhật trạng thái hàng loạt.',
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === 'bulk-post') {
        const res = await adminBulkDeletePosts(selectedIds);
        setBulkFeedback({
          type: 'success',
          message: `Đã xóa thành công ${res.count} bài viết khỏi hệ thống.`,
        });
        setSelectedIds([]);
        setDeleteTarget(null);
        await loadPosts();
      } else if (deleteTarget.type === 'post') {
        await adminDeletePost(deleteTarget.id);
        setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
        setDeleteTarget(null);
        await loadPosts();
      } else {
        await adminDeleteRssSource(deleteTarget.id);
        setDeleteTarget(null);
        await loadRssSources();
      }
    } catch (err) {
      setDeleteError(
        err instanceof BlogApiError
          ? err.message
          : deleteTarget.type === 'bulk-post'
            ? 'Lỗi khi xóa bài viết hàng loạt. Vui lòng thử lại.'
            : deleteTarget.type === 'post'
              ? 'Lỗi khi xóa bài viết. Vui lòng thử lại.'
              : 'Lỗi khi xóa nguồn RSS. Vui lòng thử lại.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDirectCrawl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = crawlUrl.trim();
    if (!url) return;

    setCrawling(true);
    setCrawlError(null);
    setCrawlSuccess(null);

    try {
      const crawled = await adminCrawlPost(url);
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
      setCrawlUrl('');
      setCrawlSuccess(`Đã crawl thành công bài viết "${created.title}". Đang chuyển đến trang chỉnh sửa...`);
      setTimeout(() => {
        window.location.href = `/admin/blog/${created.id}`;
      }, 700);
    } catch (err) {
      setCrawlError(
        err instanceof BlogApiError
          ? err.message
          : 'Không thể bóc tách nội dung từ link này. Vui lòng kiểm tra lại URL.',
      );
    } finally {
      setCrawling(false);
    }
  };

  const handleAddRssSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRssName.trim() || !newRssUrl.trim()) return;
    setAddingRss(true);
    setRssError(null);
    setRssSuccess(null);
    try {
      await adminCreateRssSource({
        name: newRssName.trim(),
        url: newRssUrl.trim(),
        category: newRssCategory.trim() || undefined,
        isActive: true,
      });
      setNewRssName('');
      setNewRssUrl('');
      setNewRssCategory('');
      await loadRssSources();
      setRssSuccess('Đã thêm nguồn RSS mới thành công.');
    } catch (err) {
      setRssError(err instanceof BlogApiError ? err.message : 'Lỗi khi thêm nguồn RSS.');
    } finally {
      setAddingRss(false);
    }
  };

  const handleScanAll = async () => {
    setScanning(true);
    setRssError(null);
    setRssSuccess(null);
    setRecentScannedPosts([]);
    try {
      const res = await adminScanAllRss();
      setRssSuccess(
        `Quét hoàn tất: Đã duyệt ${res.sourcesScanned} nguồn, quét ${res.articlesScanned} bài, tạo mới ${res.newDraftsCreated} bài nháp (DRAFT) có liên kết sản phẩm thời trang tương ứng! (Bỏ qua ${res.skippedExisting} bài đã tồn tại).`,
      );
      setRecentScannedPosts(res.createdPosts);
      await loadRssSources();
      void loadPosts(0);
    } catch (err) {
      setRssError(err instanceof BlogApiError ? err.message : 'Lỗi khi quét nguồn RSS.');
    } finally {
      setScanning(false);
    }
  };

  const handleScanSingleSource = async (id: string, name: string) => {
    setScanningId(id);
    setRssError(null);
    setRssSuccess(null);
    setRecentScannedPosts([]);
    try {
      const res = await adminScanRssSource(id);
      setRssSuccess(
        `Quét "${name}" hoàn tất: Phân tích ${res.articlesScanned} bài, tạo mới ${res.newDraftsCreated} bài nháp (DRAFT) liên kết sản phẩm! (Bỏ qua ${res.skippedExisting} bài đã có).`,
      );
      setRecentScannedPosts(res.createdPosts);
      await loadRssSources();
      void loadPosts(0);
    } catch (err) {
      setRssError(err instanceof BlogApiError ? err.message : `Lỗi khi quét nguồn "${name}".`);
    } finally {
      setScanningId(null);
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
      {/* DIRECT QUICK PASTE LINK CRAWLER BAR */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <form onSubmit={handleDirectCrawl} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Dán link bài viết bất kỳ để tự động Crawl bài nháp</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Dán URL bài viết từ báo hoặc blog (vd: Eva, Thanh Niên, Kenh14...). Hệ thống sẽ bóc tách tiêu đề, tóm tắt, ảnh cover và nội dung chuẩn SEO, lưu thành <strong>Bản nháp (DRAFT)</strong> cho bạn.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              type="url"
              required
              placeholder="Dán link bài viết vào đây (vd: https://thanhnien.vn/thoi-trang-tre/5-mau-vay-dai...)"
              value={crawlUrl}
              onChange={(e) => setCrawlUrl(e.target.value)}
              disabled={crawling}
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={crawling || !crawlUrl.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-xs font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50 whitespace-nowrap"
            >
              {crawling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang bóc tách bài...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Tự động Crawl & Tạo bài nháp</span>
                </>
              )}
            </button>
          </div>

          {crawlSuccess && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              {crawlSuccess}
            </div>
          )}

          {crawlError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {crawlError}
            </div>
          )}
        </form>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider transition ${
            activeTab === 'posts'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Danh sách bài viết</span>
          {totalElements > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {totalElements}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rss')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider transition ${
            activeTab === 'rss'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Rss className="h-3.5 w-3.5 text-accent" />
          <span>Tự động Crawl theo RSS Feeds Thời Trang</span>
          {rssSources && rssSources.length > 0 && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">
              {rssSources.length} nguồn
            </span>
          )}
        </button>
      </div>

      {activeTab === 'posts' && (
        <>
          {/* Top Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm theo tiêu đề, tóm tắt..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void loadPosts(0)}
                  className="h-9 w-64 rounded-md border border-input bg-background pl-8.5 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

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
              <a
                href="/admin/blog/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-xs font-medium text-background transition hover:bg-foreground/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Viết bài mới</span>
              </a>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {bulkFeedback && (
            <div
              className={`flex items-center justify-between rounded-lg border p-3 text-xs ${
                bulkFeedback.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              <span>{bulkFeedback.message}</span>
              <button
                type="button"
                onClick={() => setBulkFeedback(null)}
                className="ml-3 font-semibold text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          )}

          {/* Bulk Action Toolbar */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 shadow-xs animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {selectedIds.length}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  Đã chọn <strong className="text-primary">{selectedIds.length}</strong> bài viết
                </span>
                <button
                  type="button"
                  onClick={handleUnselectAll}
                  className="text-[11px] font-medium text-muted-foreground underline decoration-dotted hover:text-foreground"
                >
                  Bỏ chọn tất cả
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isBulkOperating}
                  onClick={() => void handleBulkStatusChange('PUBLISHED')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/25 disabled:opacity-50 dark:text-emerald-300"
                >
                  {isBulkOperating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Đăng hàng loạt ({selectedIds.length})</span>
                </button>

                <button
                  type="button"
                  disabled={isBulkOperating}
                  onClick={() => void handleBulkStatusChange('DRAFT')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/25 disabled:opacity-50 dark:text-amber-300"
                >
                  {isBulkOperating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileEdit className="h-3.5 w-3.5" />
                  )}
                  <span>Chuyển về nháp ({selectedIds.length})</span>
                </button>

                <button
                  type="button"
                  disabled={isBulkOperating}
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget({ type: 'bulk-post', count: selectedIds.length });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50 dark:border-red-800 dark:bg-red-600 dark:hover:bg-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa hàng loạt ({selectedIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Post Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-medium uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center">
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        aria-label="Chọn tất cả bài viết trên trang"
                        title={isAllOnPageSelected ? 'Bỏ chọn tất cả trên trang' : 'Chọn tất cả trên trang'}
                        checked={isAllOnPageSelected}
                        onChange={handleToggleSelectAllPage}
                        className="h-4 w-4 cursor-pointer rounded border-input text-primary accent-primary focus:ring-primary"
                      />
                    </th>
                    <th className="px-4 py-3">Ảnh</th>
                    <th className="px-4 py-3">Tiêu đề bài viết</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Tác giả</th>
                    <th className="px-4 py-3">Ngày tạo / xuất bản</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        Đang tải danh sách bài viết...
                      </td>
                    </tr>
                  ) : !posts || posts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        Chưa có bài viết nào phù hợp. Hãy dán link vào ô ở trên hoặc bấm <strong>+ Viết bài mới</strong>.
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => {
                      const coverUrl = resolveImageUrl(post.featuredImage);
                      const isPublished = post.status === 'PUBLISHED';
                      const isSelected = selectedIds.includes(post.id);
                      return (
                        <tr
                          key={post.id}
                          className={`transition ${
                            isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                          }`}
                        >
                          <td className="w-10 px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Chọn bài viết ${post.title}`}
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(post.id)}
                              className="h-4 w-4 cursor-pointer rounded border-input text-primary accent-primary focus:ring-primary"
                            />
                          </td>
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
                            <div className="inline-flex items-center gap-1.5">
                              {isPublished && (
                                <a
                                  href={`/blog/${post.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Xem</span>
                                </a>
                              )}
                              <a
                                href={`/admin/blog/${post.id}`}
                                className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Sửa</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteTarget({ type: 'post', id: post.id, title: post.title });
                                }}
                                className="inline-flex items-center gap-1 rounded border border-red-200/80 bg-red-50/50 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-700 dark:hover:text-white"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Xóa</span>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <div>
                  Hiển thị trang {page + 1} / {totalPages} ({totalElements} bài viết)
                </div>
                <div className="flex items-center gap-1.5">
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
        </>
      )}

      {activeTab === 'rss' && (
        <div className="space-y-6">
          {/* RSS Header & Master Action */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tự động Crawl theo RSS Feeds Thời Trang & Gắn sản phẩm tương tự
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Hệ thống tự động quét các bài viết mới từ nguồn RSS chuyên trang Thời Trang & Làm Đẹp, đối soát từ khóa với kho sản phẩm
                (đồ lót, đai nịt bụng, phụ kiện...), tự động bóc tách thành <strong>Bản nháp (DRAFT)</strong> và gài sản phẩm tương tự.
              </p>
            </div>

            <button
              type="button"
              disabled={scanning}
              onClick={() => void handleScanAll()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition hover:bg-accent/90 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Đang quét tất cả nguồn...' : 'Quét tất cả nguồn ngay'}</span>
            </button>
          </div>

          {rssSuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300">
              {rssSuccess}
            </div>
          )}

          {rssError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
              {rssError}
            </div>
          )}

          {/* Recently Scanned Posts Box */}
          {recentScannedPosts.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 flex items-center justify-between">
                <span>🎉 Các bài nháp vừa được tạo tự động ({recentScannedPosts.length} bài)</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('posts')}
                  className="text-xs font-medium text-accent hover:underline lowercase"
                >
                  Xem toàn bộ danh sách →
                </button>
              </h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {recentScannedPosts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{p.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{p.summary || 'Bản nháp DRAFT'}</div>
                    </div>
                    <a
                      href={`/admin/blog/${p.id}`}
                      className="rounded border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted whitespace-nowrap"
                    >
                      Biên tập
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add RSS Form */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm nguồn RSS Feed mới</span>
            </h4>
            <form onSubmit={handleAddRssSource} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                type="text"
                required
                placeholder="Tên nguồn (vd: VnExpress Thời trang)"
                value={newRssName}
                onChange={(e) => setNewRssName(e.target.value)}
                disabled={addingRss}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:col-span-1"
              />
              <input
                type="url"
                required
                placeholder="URL RSS (vd: https://thanhnien.vn/rss/thoi-trang-tre.rss)"
                value={newRssUrl}
                onChange={(e) => setNewRssUrl(e.target.value)}
                disabled={addingRss}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:col-span-2"
              />
              <div className="flex gap-2 sm:col-span-1">
                <input
                  type="text"
                  placeholder="Chuyên mục"
                  value={newRssCategory}
                  onChange={(e) => setNewRssCategory(e.target.value)}
                  disabled={addingRss}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={addingRss || !newRssName.trim() || !newRssUrl.trim()}
                  className="rounded-md bg-foreground px-4 text-xs font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
                >
                  {addingRss ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>

          {/* RSS Sources Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-medium uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Tên nguồn</th>
                    <th className="px-4 py-3">URL Feed</th>
                    <th className="px-4 py-3">Chuyên mục</th>
                    <th className="px-4 py-3">Lần quét gần nhất</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingRss ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        Đang tải danh sách nguồn RSS...
                      </td>
                    </tr>
                  ) : !rssSources || rssSources.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        Chưa có nguồn RSS nào. Hãy thêm một nguồn ở trên!
                      </td>
                    </tr>
                  ) : (
                    rssSources.map((source) => (
                      <tr key={source.id} className="transition hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{source.name}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline hover:text-foreground"
                          >
                            {source.url}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {source.category ? (
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                              {source.category}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {source.lastFetchedAt
                            ? new Date(source.lastFetchedAt).toLocaleString('vi-VN')
                            : 'Chưa quét'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={scanningId === source.id || scanning}
                              onClick={() => void handleScanSingleSource(source.id, source.name)}
                              className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
                            >
                              <RefreshCw className={`h-3 w-3 ${scanningId === source.id ? 'animate-spin' : ''}`} />
                              <span>{scanningId === source.id ? 'Đang quét...' : 'Quét nguồn này'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget({ type: 'rss', id: source.id, title: source.name });
                              }}
                              className="inline-flex items-center gap-1 rounded border border-red-200/80 bg-red-50/50 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-700 dark:hover:text-white"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog (replaces native window.confirm & alert) */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={
          deleteTarget?.type === 'bulk-post'
            ? `Xác nhận xóa hàng loạt ${deleteTarget.count} bài viết`
            : deleteTarget?.type === 'post'
              ? 'Xác nhận xóa bài viết'
              : 'Xác nhận xóa nguồn RSS'
        }
        description={
          deleteTarget?.type === 'bulk-post'
            ? `Hành động này sẽ xóa vĩnh viễn ${deleteTarget.count} bài viết đã chọn khỏi hệ thống blog của cửa hàng. Thao tác này không thể hoàn tác!`
            : deleteTarget?.type === 'post'
              ? 'Bạn có chắc chắn muốn xóa bài viết này khỏi hệ thống blog của cửa hàng?'
              : 'Bạn có chắc chắn muốn xóa nguồn feed RSS này?'
        }
        itemName={
          deleteTarget?.type === 'bulk-post'
            ? `${deleteTarget.count} bài viết đã chọn`
            : deleteTarget?.title
        }
        confirmLabel={
          deleteTarget?.type === 'bulk-post'
            ? `Xác nhận xóa ${deleteTarget.count} bài viết`
            : deleteTarget?.type === 'post'
              ? 'Xóa bài viết'
              : 'Xóa nguồn RSS'
        }
        cancelLabel="Hủy"
        variant="danger"
        isLoading={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}
