import { useState } from 'react';
import {
  CheckCircle2,
  Layers,
  Plus,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
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

interface AttrItem {
  key: string;
  value: string;
}

const COMMON_COLORS = ['Đen', 'Trắng', 'Xám', 'Be', 'Xanh', 'Hồng', 'Nâu', 'Đỏ'];
const COMMON_SIZES = ['S', 'M', 'L', 'XL', '2XL', 'Free size'];

const ATTR_KEY_LABELS: Record<string, string> = {
  color: 'Màu',
  size: 'Size',
  material: 'Chất liệu',
  style: 'Kiểu',
};

function formatAttrKey(key: string): string {
  return ATTR_KEY_LABELS[key.toLowerCase()] ?? key;
}

function parseVnd(input: string): number | null {
  const cleaned = input.replace(/[.\s]/g, '');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export default function AdminVariantsEditor({ detail, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCompareAt, setEditCompareAt] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editAttrs, setEditAttrs] = useState<AttrItem[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form thêm biến thể mới
  const [showAdd, setShowAdd] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCompareAt, setNewCompareAt] = useState('');
  const [newStock, setNewStock] = useState('50');
  const [newAttrs, setNewAttrs] = useState<AttrItem[]>([
    { key: 'color', value: '' },
    { key: 'size', value: '' },
  ]);

  // Bộ lọc tìm kiếm
  const [searchFilter, setSearchFilter] = useState('');

  // Bulk update tool
  const [showBulk, setShowBulk] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCompareAt, setBulkCompareAt] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const totalStock = detail.variants.reduce((sum, v) => sum + v.stock, 0);
  const minPrice = detail.variants.length > 0 ? Math.min(...detail.variants.map((v) => v.priceCents)) : null;
  const maxPrice = detail.variants.length > 0 ? Math.max(...detail.variants.map((v) => v.priceCents)) : null;

  async function run(action: () => Promise<unknown>, ok?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      ok?.();
      onChanged();
    } catch (e) {
      const code = e instanceof AdminError ? e.code : undefined;
      if (code === 'VARIANT_IN_USE') {
        setError('Biến thể đang nằm trong giỏ hàng của khách — thử lại sau khi giỏ hết hạn.');
      } else if (code === 'SKU_TAKEN') {
        setError('Mã SKU này đã tồn tại trên hệ thống — vui lòng chọn mã SKU khác.');
      } else {
        setError(e instanceof AdminError ? e.message : 'Không thực hiện được thao tác.');
      }
    } finally {
      setBusy(false);
    }
  }

  function startEdit(variant: AdminVariant) {
    setEditingId(variant.id);
    setEditSku(variant.sku);
    setEditPrice(String(variant.priceCents / 100));
    setEditCompareAt(variant.compareAtPriceCents == null ? '' : String(variant.compareAtPriceCents / 100));
    setEditStock(String(variant.stock));
    const attrsList: AttrItem[] = Object.entries(variant.attributes || {}).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    setEditAttrs(attrsList);
    setError(null);
  }

  function saveEdit(variant: AdminVariant) {
    const priceVnd = parseVnd(editPrice);
    const stockNum = Number(editStock);
    if (priceVnd == null || !Number.isInteger(stockNum) || stockNum < 0) {
      setError('Giá bán và tồn kho phải là số hợp lệ.');
      return;
    }
    const compareVnd = parseVnd(editCompareAt);
    const attributesObj: Record<string, unknown> = {};
    for (const item of editAttrs) {
      if (item.key.trim() && item.value.trim()) {
        attributesObj[item.key.trim()] = item.value.trim();
      }
    }

    void run(
      () =>
        updateVariant(variant.id, {
          sku: editSku.trim() || undefined,
          priceCents: priceVnd * 100,
          compareAtPriceCents: compareVnd == null ? null : compareVnd * 100,
          stock: stockNum,
          attributes: attributesObj,
        }),
      () => {
        setEditingId(null);
        setSuccess(`Đã lưu thay đổi cho biến thể ${editSku.trim() || variant.sku}`);
      },
    );
  }

  function autoGenerateSku() {
    const cleanSlug = detail.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    const parts: string[] = [cleanSlug];
    for (const attr of newAttrs) {
      if (attr.value.trim()) {
        const valClean = attr.value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 4);
        if (valClean) parts.push(valClean);
      }
    }
    if (parts.length === 1) {
      parts.push(String(detail.variants.length + 1).padStart(2, '0'));
    }
    setNewSku(parts.join('-'));
  }

  function submitAdd(event: React.FormEvent) {
    event.preventDefault();
    const priceVnd = parseVnd(newPrice);
    const stockNum = Number(newStock);
    if (newSku.trim() === '' || priceVnd == null || !Number.isInteger(stockNum) || stockNum < 0) {
      setError('Vui lòng điền đủ SKU, giá bán và tồn kho hợp lệ.');
      return;
    }
    const compareVnd = parseVnd(newCompareAt);
    const attributesObj: Record<string, unknown> = {};
    for (const item of newAttrs) {
      if (item.key.trim() && item.value.trim()) {
        attributesObj[item.key.trim()] = item.value.trim();
      }
    }

    void run(
      () =>
        addVariant(detail.id, {
          sku: newSku.trim(),
          priceCents: priceVnd * 100,
          compareAtPriceCents: compareVnd == null ? undefined : compareVnd * 100,
          stock: stockNum,
          attributes: Object.keys(attributesObj).length > 0 ? attributesObj : undefined,
        }),
      () => {
        setNewSku('');
        setNewPrice('');
        setNewCompareAt('');
        setNewStock('50');
        setShowAdd(false);
        setSuccess('Đã thêm biến thể thành công!');
      },
    );
  }

  async function applyBulkUpdate() {
    const priceVnd = bulkPrice ? parseVnd(bulkPrice) : null;
    const compareVnd = bulkCompareAt ? parseVnd(bulkCompareAt) : null;
    const stockNum = bulkStock ? Number(bulkStock) : null;

    if (priceVnd == null && compareVnd == null && stockNum == null) {
      setError('Vui lòng nhập ít nhất một thông số (Giá, Giá so sánh hoặc Tồn kho) để áp dụng hàng loạt.');
      return;
    }

    if (
      !confirm(
        `Áp dụng thay đổi cho tất cả ${detail.variants.length} biến thể của sản phẩm này?`,
      )
    ) {
      return;
    }

    void run(
      async () => {
        for (const v of detail.variants) {
          const patch: { priceCents?: number; compareAtPriceCents?: number | null; stock?: number } = {};
          if (priceVnd != null) patch.priceCents = priceVnd * 100;
          if (compareVnd != null) patch.compareAtPriceCents = compareVnd * 100;
          if (stockNum != null && Number.isInteger(stockNum) && stockNum >= 0) patch.stock = stockNum;
          await updateVariant(v.id, patch);
        }
      },
      () => {
        setShowBulk(false);
        setBulkPrice('');
        setBulkCompareAt('');
        setBulkStock('');
        setSuccess(`Đã áp dụng thay đổi hàng loạt cho ${detail.variants.length} biến thể!`);
      },
    );
  }

  const filteredVariants = detail.variants.filter((v) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase().trim();
    if (v.sku.toLowerCase().includes(query)) return true;
    for (const [key, val] of Object.entries(v.attributes || {})) {
      if (key.toLowerCase().includes(query) || String(val).toLowerCase().includes(query)) return true;
    }
    return false;
  });

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Phân loại hàng &amp; Biến thể kho</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
              {detail.variants.length} phân loại
            </span>
            <span>·</span>
            <span>
              Tổng tồn: <strong>{totalStock}</strong> cái
            </span>
            {minPrice != null && maxPrice != null && (
              <>
                <span>·</span>
                <span>
                  Khoảng giá:{' '}
                  <strong className="text-foreground">
                    {formatCents(minPrice)}
                    {minPrice !== maxPrice && ` – ${formatCents(maxPrice)}`}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {detail.variants.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setShowBulk((v) => !v);
                setShowAdd(false);
              }}
              className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium transition hover:bg-muted"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{showBulk ? 'Đóng cập nhật' : 'Cập nhật hàng loạt'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowAdd((v) => !v);
              setShowBulk(false);
            }}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showAdd ? 'Đóng' : 'Thêm phân loại'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </p>
      )}

      {/* 2. Bulk Update Tool */}
      {showBulk && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Cập nhật đồng loạt cho tất cả {detail.variants.length} biến thể</span>
            </h3>
            <span className="text-xs text-muted-foreground">Để trống ô nào thì thông số đó sẽ giữ nguyên</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium">
              Giá bán đồng loạt (VND)
              <input
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="vd: 129000"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Giá so sánh gốc (VND)
              <input
                value={bulkCompareAt}
                onChange={(e) => setBulkCompareAt(e.target.value)}
                placeholder="vd: 159000"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Tồn kho đồng loạt
              <input
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                placeholder="vd: 100"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBulk(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void applyBulkUpdate()}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Áp dụng cho tất cả
            </button>
          </div>
        </div>
      )}

      {/* 3. Add Variant Form */}
      {showAdd && (
        <form onSubmit={submitAdd} className="mt-4 rounded-xl border border-dashed border-border bg-muted/10 p-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-sm font-semibold">Thêm biến thể mới</h3>
            <button
              type="button"
              onClick={autoGenerateSku}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Tạo gợi ý SKU</span>
            </button>
          </div>

          {/* Thuộc tính phân loại: Màu sắc, Size,... */}
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thuộc tính phân loại</p>
            {newAttrs.map((attr, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <input
                  value={attr.key}
                  onChange={(e) => {
                    const copy = [...newAttrs];
                    copy[idx].key = e.target.value;
                    setNewAttrs(copy);
                  }}
                  placeholder="Tên thuộc tính (color, size...)"
                  className="h-8 w-28 rounded-md border border-border bg-background px-2 text-xs font-medium"
                />
                <input
                  value={attr.value}
                  onChange={(e) => {
                    const copy = [...newAttrs];
                    copy[idx].value = e.target.value;
                    setNewAttrs(copy);
                  }}
                  placeholder={`Giá trị (vd: ${attr.key.toLowerCase().includes('color') ? 'Đen' : 'XL'})...`}
                  className="h-8 min-w-[140px] flex-1 rounded-md border border-border bg-background px-3 text-xs"
                />
                {/* Gợi ý nhanh */}
                {attr.key.toLowerCase() === 'color' && (
                  <div className="flex flex-wrap gap-1">
                    {COMMON_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const copy = [...newAttrs];
                          copy[idx].value = c;
                          setNewAttrs(copy);
                        }}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {attr.key.toLowerCase() === 'size' && (
                  <div className="flex flex-wrap gap-1">
                    {COMMON_SIZES.slice(0, 5).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const copy = [...newAttrs];
                          copy[idx].value = s;
                          setNewAttrs(copy);
                        }}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {newAttrs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setNewAttrs(newAttrs.filter((_, i) => i !== idx))}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Xóa thuộc tính này"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setNewAttrs([...newAttrs, { key: '', value: '' }])}
              className="flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm thuộc tính khác (vd: chất liệu, kiểu dáng)</span>
            </button>
          </div>

          {/* Thông số cơ bản: SKU, Giá, Giá so sánh, Tồn kho */}
          <div className="mt-4 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-4">
            <label className="text-xs font-medium">
              Mã SKU <span className="text-destructive">*</span>
              <input
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                required
                placeholder="vd: SET3-DEN-XL"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs"
              />
            </label>
            <label className="text-xs font-medium">
              Giá bán (VND) <span className="text-destructive">*</span>
              <input
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
                placeholder="vd: 129000"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Giá so sánh gốc (VND)
              <input
                value={newCompareAt}
                onChange={(e) => setNewCompareAt(e.target.value)}
                placeholder="vd: 159000"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Tồn kho <span className="text-destructive">*</span>
              <input
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                required
                placeholder="vd: 50"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Lưu phân loại mới
            </button>
          </div>
        </form>
      )}

      {/* 4. Search Filter (khi có từ 3 biến thể trở lên) */}
      {detail.variants.length > 2 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm theo SKU, màu, size..."
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-foreground"
            />
          </div>
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      )}

      {/* 5. Variants Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2.5 pr-4">Mã SKU</th>
              <th className="py-2.5 pr-4">Phân loại (Màu, Size...)</th>
              <th className="py-2.5 pr-4 text-right">Giá bán</th>
              <th className="py-2.5 pr-4 text-right">Giá gốc</th>
              <th className="py-2.5 pr-4 text-right">Kho</th>
              <th className="py-2.5 text-right" aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {filteredVariants.map((v) =>
              editingId === v.id ? (
                /* Inline Edit Row */
                <tr key={v.id} className="border-b border-border/80 bg-muted/40">
                  <td className="py-3 pr-3 align-top">
                    <input
                      value={editSku}
                      onChange={(e) => setEditSku(e.target.value)}
                      placeholder="SKU"
                      className="w-28 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <div className="space-y-1.5">
                      {editAttrs.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <input
                            value={item.key}
                            onChange={(e) => {
                              const copy = [...editAttrs];
                              copy[idx].key = e.target.value;
                              setEditAttrs(copy);
                            }}
                            placeholder="Thuộc tính"
                            className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-xs font-medium"
                          />
                          <span>:</span>
                          <input
                            value={item.value}
                            onChange={(e) => {
                              const copy = [...editAttrs];
                              copy[idx].value = e.target.value;
                              setEditAttrs(copy);
                            }}
                            placeholder="Giá trị"
                            className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setEditAttrs(editAttrs.filter((_, i) => i !== idx))}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Xóa thuộc tính"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditAttrs([...editAttrs, { key: '', value: '' }])}
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Thêm thuộc tính</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right align-top">
                    <input
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      aria-label="Giá VND"
                      className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-xs font-semibold"
                    />
                  </td>
                  <td className="py-3 pr-3 text-right align-top">
                    <input
                      value={editCompareAt}
                      onChange={(e) => setEditCompareAt(e.target.value)}
                      placeholder="—"
                      aria-label="Giá so sánh VND"
                      className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-xs"
                    />
                  </td>
                  <td className="py-3 pr-3 text-right align-top">
                    <input
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      aria-label="Tồn kho"
                      className="w-16 rounded-md border border-border bg-background px-2 py-1 text-right text-xs"
                    />
                  </td>
                  <td className="py-3 text-right align-top whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveEdit(v)}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        Huỷ
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* Display Row */
                <tr key={v.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                  <td className="py-3 pr-4 font-mono text-xs font-medium text-foreground">{v.sku}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Object.keys(v.attributes || {}).length === 0 ? (
                        <span className="text-xs text-muted-foreground">Mặc định</span>
                      ) : (
                        Object.entries(v.attributes).map(([key, val]) => (
                          <span
                            key={key}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              key.toLowerCase() === 'color'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                                : key.toLowerCase() === 'size'
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {formatAttrKey(key)}: {String(val)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-foreground">
                    {formatCents(v.priceCents)}
                  </td>
                  <td className="py-3 pr-4 text-right text-xs text-muted-foreground">
                    {v.compareAtPriceCents == null ? '—' : (
                      <span className="line-through">{formatCents(v.compareAtPriceCents)}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        v.stock === 0
                          ? 'bg-destructive/10 text-destructive'
                          : v.stock < 10
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {v.stock === 0 ? 'Hết hàng' : v.stock}
                    </span>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(v)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Xóa phân loại ${v.sku}?`)) void run(() => deleteVariant(v.id));
                        }}
                        className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}

            {filteredVariants.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  {searchFilter
                    ? 'Không có biến thể nào khớp bộ lọc.'
                    : 'Chưa có phân loại nào — bấm "+ Thêm phân loại" để tạo biến thể.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
