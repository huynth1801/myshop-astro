import { useCallback, useEffect, useState } from 'react';
import {
  AdminError,
  listCategories,
  listProducts,
  updateProduct,
  type AdminCategory,
  type AdminProduct,
} from '../../lib/api/admin';
import { authOpen, authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import AdminNewProductForm from './AdminNewProductForm';
import AdminStatsBar from './AdminStatsBar';
import AdminToolbar from './AdminToolbar';
import AdminProductRow from './AdminProductRow';

/** Admin product management dashboard with stats, variant matrix and quick controls. */
export default function AdminDashboard() {
  const user = useStore(authUser);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
    listCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const reload = useCallback(
    async (targetPage = page) => {
      setError(null);
      try {
        const paged = await listProducts({
          q: debouncedQ,
          status: status === '' ? undefined : (status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED'),
          categoryId: categoryId === '' ? undefined : categoryId,
          page: targetPage,
        });
        setProducts(paged.content);
        setPage(paged.page);
        setTotalPages(paged.totalPages);
        setTotalElements(paged.totalElements);
      } catch (e) {
        setProducts([]);
        setError(e instanceof AdminError ? e.message : 'Không tải được danh sách sản phẩm.');
      }
    },
    [debouncedQ, status, categoryId, page],
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
