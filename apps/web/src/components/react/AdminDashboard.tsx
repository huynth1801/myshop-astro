import { useCallback, useEffect, useState } from 'react';
import {
  AdminError,
  listProducts,
  updateProduct,
  type AdminProduct,
} from '../../lib/api/admin';
import { formatCents } from '../../lib/money';
import { authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import AdminProductDetail from './AdminProductDetail';
import AdminNewProductForm from './AdminNewProductForm';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-amber-100 text-amber-800',
  ARCHIVED: 'bg-muted text-muted-foreground',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Nháp',
  ARCHIVED: 'Lưu trữ',
};

/**
 * Admin product table island. Mounts on /admin (client:load); the API still
 * enforces ADMIN on every row — this gate is UX, not security.
 */
export default function AdminDashboard() {
  const user = useStore(authUser);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  const reload = useCallback(
    async (targetPage = page) => {
      setError(null);
      try {
        const paged = await listProducts(targetPage, 20);
        setProducts(paged.content);
        setPage(paged.page);
        setTotalPages(paged.totalPages);
        setTotalElements(paged.totalElements);
      } catch (e) {
        setProducts([]);
        setError(e instanceof AdminError ? e.message : 'Không tải được danh sách sản phẩm.');
      }
    },
    [page],
  );

  useEffect(() => {
    if (user?.role === 'ADMIN') void reload(0);
  }, [user, reload]);

  async function changeStatus(product: AdminProduct, status: AdminProduct['status']) {
    setBusyId(product.id);
    setError(null);
    try {
      await updateProduct(product.id, { status });
      await reload();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Không cập nhật được trạng thái.');
    } finally {
      setBusyId(null);
    }
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalElements} sản phẩm · trang {page + 1}/{Math.max(totalPages, 1)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
          >
            Tải lại
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {showForm ? 'Đóng form' : '+ Thêm sản phẩm'}
          </button>
        </div>
      </div>

      {showForm && (
        <AdminNewProductForm
          onCreated={() => {
            setShowForm(false);
            void reload(0);
          }}
        />
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3 text-right">Giá từ</th>
              <th className="px-4 py-3 text-right">Tồn kho</th>
              <th className="px-4 py-3" aria-label="Chi tiết" />
            </tr>
          </thead>
          <tbody>
            {products === null && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            )}
            {products?.map((p) => (
              <tr
                key={p.id}
                className={expandedId === p.id ? 'bg-muted/50' : 'border-b border-border/60 last:border-0'}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">/{p.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}
                  >
                    {STATUS_LABELS[p.status]}
                  </span>
                  <select
                    aria-label={`Trạng thái ${p.name}`}
                    value={p.status}
                    disabled={busyId === p.id}
                    onChange={(e) => void changeStatus(p, e.target.value as AdminProduct['status'])}
                    className="mt-1 block rounded-lg border border-border bg-card px-2 py-1 text-xs"
                  >
                    <option value="DRAFT">Nháp</option>
                    <option value="ACTIVE">Đang bán</option>
                    <option value="ARCHIVED">Lưu trữ</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.category.name}</td>
                <td className="px-4 py-3 text-right">{p.priceFromCents == null ? '—' : formatCents(p.priceFromCents)}</td>
                <td className="px-4 py-3 text-right">
                  {p.totalStock}
                  {!p.inStock && <span className="ml-1 text-xs text-destructive">hết</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="text-xs font-medium underline-offset-4 hover:underline"
                  >
                    {expandedId === p.id ? 'Đóng' : 'Biến thể'}
                  </button>
                </td>
              </tr>
            ))}
            {products?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Chưa có sản phẩm nào — thêm sản phẩm đầu tiên nhé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {products !== null && products.length > 0 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => void reload(page - 1)}
            className="rounded-full border border-border px-3 py-1.5 disabled:opacity-40"
          >
            ← Trước
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => void reload(page + 1)}
            className="rounded-full border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Sau →
          </button>
        </div>
      )}

      {expandedId && <AdminProductDetail id={expandedId} onChanged={() => void reload()} />}
    </div>
  );
}
