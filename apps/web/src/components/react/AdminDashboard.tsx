import { useCallback, useEffect, useState } from 'react';
import {
  AdminError,
  listCategories,
  listProducts,
  updateProduct,
  type AdminCategory,
  type AdminProduct,
} from '../../lib/api/admin';
import { formatCents } from '../../lib/money';
import { resolveImageUrl } from '../../lib/api/urls';
import { authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
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

/** Admin product table: search + filters + thumbnails; row links to the edit page. */
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
    listCategories()
      .then(setCategories)
      .catch(() => {
        /* filter dropdown stays empty — non-fatal */
      });
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
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên hoặc slug…"
          aria-label="Tìm sản phẩm"
          className="h-9 min-w-52 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Lọc trạng thái"
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="DRAFT">Nháp</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Lọc danh mục"
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="">Mọi danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void reload()}
          className="h-9 rounded-full border border-border px-4 text-sm transition-colors hover:bg-muted"
        >
          Tải lại
        </button>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="h-9 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {showForm ? 'Đóng form' : '+ Thêm sản phẩm'}
        </button>
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
              <th className="px-4 py-3 text-right">Giá</th>
              <th className="px-4 py-3 text-right">Tồn kho</th>
              <th className="px-4 py-3" aria-label="Thao tác" />
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
            {products?.map((p) => {
              const thumb = resolveImageUrl(p.image?.url);
              return (
                <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={p.image?.alt || p.name}
                          width={48}
                          height={48}
                          loading="lazy"
                          className="size-12 shrink-0 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                          Không ảnh
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}>
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
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.priceFromCents == null
                      ? '—'
                      : p.priceToCents && p.priceToCents !== p.priceFromCents
                        ? `${formatCents(p.priceFromCents)} – ${formatCents(p.priceToCents)}`
                        : formatCents(p.priceFromCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.totalStock}
                    {!p.inStock && <span className="ml-1 text-xs text-destructive">hết</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/admin/products/${p.id}`}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      Sửa
                    </a>
                  </td>
                </tr>
              );
            })}
            {products?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Không có sản phẩm nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          {totalElements} sản phẩm · trang {page + 1}/{Math.max(totalPages, 1)}
        </p>
        <div className="flex gap-2">
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
      </div>
    </div>
  );
}
