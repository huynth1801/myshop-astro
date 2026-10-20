import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdminError,
  listCategories,
  listProducts,
  updateProduct,
  type AdminCategory,
  type AdminProduct,
} from '../../lib/api/admin';
import { authLoading, authOpen, authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import AdminNewProductForm from './AdminNewProductForm';
import AdminStatsBar from './AdminStatsBar';
import AdminToolbar from './AdminToolbar';
import AdminProductRow from './AdminProductRow';

const DASHBOARD_CACHE_KEY = 'myshop_admin_dashboard_cache';

interface DashboardCache {
  totalElements: number;
  totalPages: number;
  products: AdminProduct[];
  categories: AdminCategory[];
}

function getCachedDashboard(): DashboardCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.totalElements === 'number' &&
      Array.isArray(parsed?.products) &&
      Array.isArray(parsed?.categories)
    ) {
      return parsed as DashboardCache;
    }
  } catch {
    // ignore parse error
  }
  return null;
}

function setCachedDashboard(data: Partial<DashboardCache>): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    const existing: DashboardCache = raw
      ? JSON.parse(raw)
      : {
          totalElements: 0,
          totalPages: 1,
          products: [],
          categories: [],
        };
    sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ ...existing, ...data }));
  } catch {
    // ignore storage error
  }
}

/** Admin product management dashboard with stats, variant matrix and quick controls. */
export default function AdminDashboard() {
  const user = useStore(authUser);
  const loading = useStore(authLoading);
  // SWR: Initialize synchronously from sessionStorage for 0ms instant paint
  const [cached] = useState<DashboardCache | null>(() => getCachedDashboard());
  const [products, setProducts] = useState<AdminProduct[] | null>(cached?.products ?? null);
  const [categories, setCategories] = useState<AdminCategory[]>(cached?.categories ?? []);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(0);
  // Mirror of `page` for reload(): keeping `page` out of the useCallback deps
  // stops the [user, reload] effect from re-firing reload(0) after setPage,
  // which used to snap every pagination click back to page 1.
  const pageRef = useRef(0);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 1);
  const [totalElements, setTotalElements] = useState(cached?.totalElements ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
    listCategories()
      .then((cats) => {
        setCategories(cats);
        setCachedDashboard({ categories: cats });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const reload = useCallback(
    async (targetPage?: number) => {
      setError(null);
      try {
        const paged = await listProducts({
          q: debouncedQ,
          status: status === '' ? undefined : (status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED'),
          categoryId: categoryId === '' ? undefined : categoryId,
          page: targetPage ?? pageRef.current,
        });
        pageRef.current = paged.page;
        setProducts(paged.content);
        setPage(paged.page);
        setTotalPages(paged.totalPages);
        setTotalElements(paged.totalElements);

        // Update SWR cache when on default view (page 0, no search filter)
        if (!debouncedQ && !status && !categoryId && paged.page === 0) {
          setCachedDashboard({
            products: paged.content,
            totalElements: paged.totalElements,
            totalPages: paged.totalPages,
          });
        }
      } catch (e) {
        setProducts([]);
        setError(e instanceof AdminError ? e.message : 'Không tải được danh sách sản phẩm.');
      }
    },
    [debouncedQ, status, categoryId],
  );

  useEffect(() => {
    if (user?.role === 'ADMIN') void reload(0);
  }, [user, reload]);

  async function changeStatus(product: AdminProduct, next: AdminProduct['status']) {
    setBusyId(product.id);
    setError(null);
    try {
      await updateProduct(product.id, { status: next });
      await reload();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Không cập nhật được trạng thái.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-12 text-sm text-muted-foreground animate-pulse">
        Đang kiểm tra quyền quản trị…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Cần đăng nhập tài khoản ADMIN — bấm{' '}
        <button
          type="button"
          onClick={() => authOpen.set(true)}
          className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
        >
          Đăng nhập
        </button>{' '}
        trên thanh menu hoặc tại đây.
      </div>
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
      <AdminStatsBar totalElements={totalElements} products={products} />

      <AdminToolbar
        q={q}
        onQChange={setQ}
        status={status}
        onStatusChange={setStatus}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories}
        onReload={() => void reload()}
        showForm={showForm}
        onToggleForm={() => setShowForm((v) => !v)}
      />

      {showForm && (
        <AdminNewProductForm
          onCreated={() => {
            setShowForm(false);
            void reload(0);
          }}
        />
      )}

      {error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3.5">Sản phẩm</th>
              <th className="px-4 py-3.5">Danh mục</th>
              <th className="px-4 py-3.5">Phân loại & Biến thể</th>
              <th className="px-4 py-3.5 text-right">Giá bán</th>
              <th className="px-4 py-3.5 text-right">Tổng tồn</th>
              <th className="px-4 py-3.5">Trạng thái</th>
              <th className="px-4 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products === null && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Đang tải danh sách sản phẩm…
                </td>
              </tr>
            )}
            {products?.map((p) => (
              <AdminProductRow
                key={p.id}
                product={p}
                busy={busyId === p.id}
                onStatusChange={changeStatus}
                onReload={reload}
              />
            ))}
            {products?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          Hiển thị <strong>{products?.length ?? 0}</strong> trên tổng số <strong>{totalElements}</strong> sản phẩm · Trang{' '}
          <strong>{page + 1}</strong> / {Math.max(totalPages, 1)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => void reload(page - 1)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium transition hover:border-foreground disabled:opacity-40"
          >
            ← Trang trước
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => void reload(page + 1)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium transition hover:border-foreground disabled:opacity-40"
          >
            Trang sau →
          </button>
        </div>
      </div>
    </div>
  );
}
