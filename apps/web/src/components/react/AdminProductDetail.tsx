import { useEffect, useState } from 'react';
import {
  AdminError,
  getProduct,
  updateVariant,
  type AdminProductDetail as Detail,
} from '../../lib/api/admin';
import { formatCents } from '../../lib/money';

interface Props {
  id: string;
  onChanged: () => void;
}

/**
 * Expanded row: variant table with inline price/stock editing (VND in, ×100 out).
 */
export default function AdminProductDetail({ id, onChanged }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [compareAt, setCompareAt] = useState('');
  const [stock, setStock] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDetail(null);
    setError(null);
    getProduct(id)
      .then(setDetail)
      .catch(() => setError('Không tải được chi tiết sản phẩm.'));
  }, [id]);

  function startEdit(variantId: string, v: { priceCents: number; compareAtPriceCents?: number | null; stock: number }) {
    setEditingId(variantId);
    setPrice(String(v.priceCents / 100));
    setCompareAt(v.compareAtPriceCents == null ? '' : String(v.compareAtPriceCents / 100));
    setStock(String(v.stock));
  }

  async function saveVariant(variantId: string) {
    const priceVnd = Number(price.replace(/[.\s]/g, ''));
    const stockNum = Number(stock);
    if (!Number.isFinite(priceVnd) || priceVnd < 0 || !Number.isInteger(stockNum) || stockNum < 0) {
      setError('Giá / tồn kho không hợp lệ.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateVariant(variantId, {
        priceCents: priceVnd * 100,
        compareAtPriceCents: compareAt.trim() === '' ? null : Number(compareAt.replace(/[.\s]/g, '')) * 100,
        stock: stockNum,
      });
      const fresh = await getProduct(id);
      setDetail(fresh);
      setEditingId(null);
      onChanged();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Không lưu được biến thể.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {error && (
        <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {!detail && !error && <p className="text-sm text-muted-foreground">Đang tải biến thể…</p>}
      {detail && (
        <>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">
              Biến thể — {detail.name} <span className="text-xs text-muted-foreground">/{detail.slug}</span>
            </h2>
            <p className="text-xs text-muted-foreground">{detail.variants.length} biến thể</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4 text-right">Giá</th>
                  <th className="py-2 pr-4 text-right">So sánh</th>
                  <th className="py-2 pr-4 text-right">Tồn</th>
                  <th className="py-2" aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {detail.variants.map((v) =>
                  editingId === v.id ? (
                    <tr key={v.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{v.sku}</td>
                      <td className="py-2 pr-4">
                        <input
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          aria-label={`Giá VND ${v.sku}`}
                          className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-right"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          value={compareAt}
                          onChange={(e) => setCompareAt(e.target.value)}
                          aria-label={`Giá so sánh VND ${v.sku}`}
                          placeholder="—"
                          className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-right"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          value={stock}
                          onChange={(e) => setStock(e.target.value)}
                          aria-label={`Tồn kho ${v.sku}`}
                          className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-right"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveVariant(v.id)}
                          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Huỷ
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={v.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{v.sku}</td>
                      <td className="py-2 pr-4 text-right">{formatCents(v.priceCents)}</td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">
                        {v.compareAtPriceCents == null ? '—' : formatCents(v.compareAtPriceCents)}
                      </td>
                      <td className="py-2 pr-4 text-right">{v.stock}</td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(v.id, v)}
                          className="text-xs font-medium underline-offset-4 hover:underline"
                        >
                          Sửa giá/tồn
                        </button>
                      </td>
                    </tr>
                  ),
                )}
                {detail.variants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground">
                      Chưa có biến thể nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
