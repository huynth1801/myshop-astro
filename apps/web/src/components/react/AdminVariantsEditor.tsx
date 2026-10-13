import { useState } from 'react';
import {
  addVariant,
  AdminError,
  deleteVariant,
  updateVariant,
  type AdminProductDetail,
  type AdminVariant,
} from '../../lib/api/admin';
import { formatCents } from '../../lib/money';

interface Props {
  detail: AdminProductDetail;
  onChanged: () => void;
}

const ATTR_LABELS: Record<string, string> = { size: 'Size', color: 'Màu' };

function attrBadges(attributes: Record<string, unknown>): string[] {
  return Object.entries(attributes).map(([key, value]) => `${ATTR_LABELS[key] ?? key}: ${String(value)}`);
}

/** Section "Biến thể & kho" — inline price/stock edit, add + delete variants. */
export default function AdminVariantsEditor({ detail, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [compareAt, setCompareAt] = useState('');
  const [stock, setStock] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCompareAt, setNewCompareAt] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  async function run(action: () => Promise<unknown>, ok?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      ok?.();
      onChanged();
    } catch (e) {
      const code = e instanceof AdminError ? e.code : undefined;
      if (code === 'VARIANT_IN_USE') setError('Biến thể đang nằm trong giỏ của khách — thử lại sau khi giỏ hết hạn.');
      else if (code === 'SKU_TAKEN') setError(`SKU đã có người dùng — chọn SKU khác.`);
      else setError(e instanceof AdminError ? e.message : 'Không thực hiện được thao tác.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(variant: AdminVariant) {
    setEditingId(variant.id);
    setPrice(String(variant.priceCents / 100));
    setCompareAt(variant.compareAtPriceCents == null ? '' : String(variant.compareAtPriceCents / 100));
    setStock(String(variant.stock));
  }

  function parseVnd(input: string): number | null {
    const cleaned = input.replace(/[.\s]/g, '');
    if (cleaned === '') return null;
    const value = Number(cleaned);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  }

  function saveEdit(variant: AdminVariant) {
    const priceVnd = parseVnd(price);
    const stockNum = Number(stock);
    if (priceVnd == null || !Number.isInteger(stockNum) || stockNum < 0) {
      setError('Giá / tồn kho không hợp lệ.');
      return;
    }
    const compareVnd = parseVnd(compareAt);
    void run(
      () => updateVariant(variant.id, { priceCents: priceVnd * 100, stock: stockNum, compareAtPriceCents: compareVnd == null ? null : compareVnd * 100 }),
      () => setEditingId(null),
    );
  }

  function submitAdd(event: React.FormEvent) {
    event.preventDefault();
    const priceVnd = parseVnd(newPrice);
    const stockNum = Number(newStock);
    if (newSku.trim() === '' || priceVnd == null || !Number.isInteger(stockNum) || stockNum < 0) {
      setError('Điền đủ SKU, giá và tồn kho hợp lệ.');
      return;
    }
    const compareVnd = parseVnd(newCompareAt);
    const attributes =
      newAttrKey.trim() !== '' && newAttrValue.trim() !== ''
        ? { [newAttrKey.trim()]: newAttrValue.trim() }
        : undefined;
    void run(
      () => addVariant(detail.id, { sku: newSku.trim(), priceCents: priceVnd * 100, stock: stockNum, compareAtPriceCents: compareVnd == null ? undefined : compareVnd * 100, attributes }),
      () => {
        setNewSku('');
        setNewPrice('');
        setNewCompareAt('');
        setNewStock('');
        setNewAttrKey('');
        setNewAttrValue('');
        setShowAdd(false);
      },
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Biến thể &amp; kho</h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium transition hover:bg-muted"
        >
          {showAdd ? 'Đóng' : '+ Thêm biến thể'}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {showAdd && (
        <form onSubmit={(event) => submitAdd(event)} className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-3">
          <label className="text-xs">
            SKU
            <input value={newSku} onChange={(e) => setNewSku(e.target.value)} required className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-xs">
            Giá (VND)
            <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required inputMode="numeric" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-xs">
            Giá so sánh (tuỳ chọn)
            <input value={newCompareAt} onChange={(e) => setNewCompareAt(e.target.value)} inputMode="numeric" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-xs">
            Tồn kho
            <input value={newStock} onChange={(e) => setNewStock(e.target.value)} required inputMode="numeric" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-xs">
            Thuộc tính (vd: size)
            <input value={newAttrKey} onChange={(e) => setNewAttrKey(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-xs">
            Giá trị (vd: M)
            <input value={newAttrValue} onChange={(e) => setNewAttrValue(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <button type="submit" disabled={busy} className="h-9 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-3 sm:justify-self-end">
            Thêm biến thể
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Thuộc tính</th>
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
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{attrBadges(v.attributes).join(' · ') || '—'}</td>
                  <td className="py-2 pr-4">
                    <input value={price} onChange={(e) => setPrice(e.target.value)} aria-label={`Giá VND ${v.sku}`} className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-right" />
                  </td>
                  <td className="py-2 pr-4">
                    <input value={compareAt} onChange={(e) => setCompareAt(e.target.value)} aria-label={`Giá so sánh VND ${v.sku}`} placeholder="—" className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-right" />
                  </td>
                  <td className="py-2 pr-4">
                    <input value={stock} onChange={(e) => setStock(e.target.value)} aria-label={`Tồn kho ${v.sku}`} className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-right" />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" disabled={busy} onClick={() => saveEdit(v)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                      Lưu
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="ml-2 text-xs text-muted-foreground hover:text-foreground">
                      Huỷ
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={v.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{v.sku}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{attrBadges(v.attributes).join(' · ') || '—'}</td>
                  <td className="py-2 pr-4 text-right">{formatCents(v.priceCents)}</td>
                  <td className="py-2 pr-4 text-right text-muted-foreground">{v.compareAtPriceCents == null ? '—' : formatCents(v.compareAtPriceCents)}</td>
                  <td className="py-2 pr-4 text-right">{v.stock}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => startEdit(v)} className="text-xs font-medium underline-offset-4 hover:underline">
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Xóa biến thể ${v.sku}?`)) void run(() => deleteVariant(v.id));
                      }}
                      className="ml-3 text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ),
            )}
            {detail.variants.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-muted-foreground">
                  Chưa có biến thể nào — thêm biến thể đầu tiên để bán.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
