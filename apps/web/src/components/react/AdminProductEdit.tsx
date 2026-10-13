import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AdminError, getProduct, updateProduct, type AdminProductDetail } from '../../lib/api/admin';
import { authUser, bootstrapAuth } from '../../lib/stores/auth';
import { useStore } from '../../lib/stores/useStore';
import AdminBasicInfoForm from './AdminBasicInfoForm';
import AdminImagesManager from './AdminImagesManager';
import AdminProductPreview from './AdminProductPreview';
import AdminVariantsEditor from './AdminVariantsEditor';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang bán',
  DRAFT: 'Nháp',
  ARCHIVED: 'Lưu trữ',
};
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-amber-100 text-amber-800',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

/** Shopee-style edit page: header + status sidebar, basic info / images / variants sections. */
export default function AdminProductEdit({ id }: { id: string }) {
  const user = useStore(authUser);
  const [detail, setDetail] = useState<AdminProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  const reload = useCallback(async () => {
    try {
      setDetail(await getProduct(id));
      setError(null);
    } catch (e) {
      console.error('Failed to load product detail:', e);
      if (e instanceof AdminError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Không tải được sản phẩm.');
      }
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === 'ADMIN') void reload();
  }, [user, reload]);

  async function setStatus(status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED') {
    if (!detail || busy) return;
    setBusy(true);
    try {
      setDetail(await updateProduct(detail.id, { status }));
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Không đổi được trạng thái.');
    } finally {
      setBusy(false);
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
  if (error && !detail) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (!detail) {
    return <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Đang tải…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{detail.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            /{detail.slug} ·{' '}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[detail.status]}`}>
              {STATUS_LABELS[detail.status]}
            </span>
          </p>
        </div>
        <a
          href={`/products/${detail.slug}/`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Xem trên shop</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AdminBasicInfoForm detail={detail} onChanged={reload} />
          <AdminImagesManager detail={detail} onChanged={reload} />
          <AdminVariantsEditor detail={detail} onChanged={reload} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Live Storefront Preview */}
          <AdminProductPreview detail={detail} />

          {/* Product Status Controls */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trạng thái sản phẩm
            </h2>
            <div className="mt-3 space-y-2">
              {detail.status !== 'ACTIVE' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setStatus('ACTIVE')}
                  className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition hover:opacity-90 disabled:opacity-50"
                >
                  Xuất bản (Đang bán)
                </button>
              )}
              {detail.status !== 'DRAFT' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setStatus('DRAFT')}
                  className="w-full rounded-full border border-border px-4 py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                >
                  Chuyển về Nháp
                </button>
              )}
              {detail.status !== 'ARCHIVED' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setStatus('ARCHIVED')}
                  className="w-full rounded-full border border-border px-4 py-2 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
                >
                  Lưu trữ
                </button>
              )}
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Nháp / Lưu trữ sẽ ẩn sản phẩm khỏi cửa hàng; trang cũ vẫn sống cho SEO.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
