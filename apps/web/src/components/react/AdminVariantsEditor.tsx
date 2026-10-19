import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
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
  type VariantPatch,
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

interface RowDraft {
  sku: string;
  price: string;
  compareAt: string;
  stock: string;
  attrs: AttrItem[];
  isDirty: boolean;
  saving?: boolean;
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

/** Giá VND: chỉ nhận chữ số, dấu chấm và khoảng trắng phân cách nghìn — số âm không thể gõ vào. */
function sanitizeVndInput(input: string): string {
  return input.replace(/[^0-9.\s]/g, '');
}

/** Số lượng: chỉ nhận chữ số — số âm không thể gõ vào. */
function sanitizeIntInput(input: string): string {
  return input.replace(/\D/g, '');
}

/** Parses one row draft into a variant PATCH payload; null when price/stock is invalid. */
function parseRow(draft: RowDraft): VariantPatch | null {
  const priceVnd = parseVnd(draft.price);
  const stockNum = Number(draft.stock);
  if (priceVnd == null || !Number.isInteger(stockNum) || stockNum < 0) {
    return null;
  }
  const compareVnd = parseVnd(draft.compareAt);
  const attributesObj: Record<string, unknown> = {};
  for (const item of draft.attrs) {
    if (item.key.trim() && item.value.trim()) {
      attributesObj[item.key.trim()] = item.value.trim();
    }
  }
  return {
    sku: draft.sku.trim() || undefined,
    priceCents: priceVnd * 100,
    compareAtPriceCents: compareVnd == null ? null : compareVnd * 100,
    stock: stockNum,
    attributes: attributesObj,
  };
}

function initDrafts(variants: AdminVariant[]): Record<string, RowDraft> {
  const map: Record<string, RowDraft> = {};
  for (const v of variants) {
    const attrsList: AttrItem[] = Object.entries(v.attributes || {}).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    map[v.id] = {
      sku: v.sku,
      price: String(Math.round(v.priceCents / 100)),
      compareAt: v.compareAtPriceCents == null ? '' : String(Math.round(v.compareAtPriceCents / 100)),
      stock: String(v.stock),
      attrs: attrsList,
      isDirty: false,
    };
  }
  return map;
}

export default function AdminVariantsEditor({ detail, onChanged }: Props) {
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() => initDrafts(detail.variants));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync drafts whenever parent reloads product details
  useEffect(() => {
    setDrafts(initDrafts(detail.variants));
  }, [detail.variants]);

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

  function updateRowField(variantId: string, field: 'sku' | 'price' | 'compareAt' | 'stock', val: string) {
    const cleaned =
      field === 'stock'
        ? sanitizeIntInput(val)
        : field === 'price' || field === 'compareAt'
          ? sanitizeVndInput(val)
          : val;
    setDrafts((prev) => {
      const current = prev[variantId];
      if (!current) return prev;
      return {
        ...prev,
        [variantId]: {
          ...current,
          [field]: cleaned,
          isDirty: true,
        },
      };
    });
  }

  function updateRowAttr(variantId: string, attrIdx: number, val: string) {
    setDrafts((prev) => {
      const current = prev[variantId];
      if (!current) return prev;
      const newAttrsList = [...current.attrs];
      if (newAttrsList[attrIdx]) {
        newAttrsList[attrIdx] = { ...newAttrsList[attrIdx], value: val };
      }
      return {
        ...prev,
        [variantId]: {
          ...current,
          attrs: newAttrsList,
          isDirty: true,
        },
      };
    });
  }

  function removeRowAttr(variantId: string, attrIdx: number) {
    setDrafts((prev) => {
      const current = prev[variantId];
      if (!current) return prev;
      return {
        ...prev,
        [variantId]: {
          ...current,
          attrs: current.attrs.filter((_, i) => i !== attrIdx),
          isDirty: true,
        },
      };
    });
  }

  function addRowAttr(variantId: string) {
    setDrafts((prev) => {
      const current = prev[variantId];
      if (!current) return prev;
      const existingKeys = new Set(current.attrs.map((a) => a.key.toLowerCase()));
      let nextKey = 'size';
      if (existingKeys.has('size')) nextKey = 'color';
      else if (existingKeys.has('color')) nextKey = 'material';
      else if (existingKeys.has('material')) nextKey = 'style';
      else nextKey = `attr${current.attrs.length + 1}`;

      return {
        ...prev,
        [variantId]: {
          ...current,
          attrs: [...current.attrs, { key: nextKey, value: '' }],
          isDirty: true,
        },
      };
    });
  }

  function resetRow(variantId: string) {
    const original = detail.variants.find((v) => v.id === variantId);
    if (!original) return;
    setDrafts((prev) => ({
      ...prev,
      [variantId]: {
        sku: original.sku,
        price: String(Math.round(original.priceCents / 100)),
        compareAt: original.compareAtPriceCents == null ? '' : String(Math.round(original.compareAtPriceCents / 100)),
        stock: String(original.stock),
        attrs: Object.entries(original.attributes || {}).map(([key, value]) => ({ key, value: String(value) })),
        isDirty: false,
      },
    }));
  }

  async function saveRow(variantId: string) {
    const draft = drafts[variantId];
    if (!draft) return;
    const row = parseRow(draft);
    if (row == null) {
      setError('Giá bán và tồn kho phải là số hợp lệ không âm.');
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [variantId]: { ...prev[variantId], saving: true },
    }));

    void run(
      () => updateVariant(variantId, row),
      () => {
        setSuccess(`Đã lưu thay đổi cho ${draft.sku.trim()}`);
      },
    );
  }

  const dirtyCount = Object.values(drafts).filter((d) => d.isDirty).length;

  async function saveAllDirty() {
    const dirtyIds = Object.keys(drafts).filter((id) => drafts[id]?.isDirty);
    if (dirtyIds.length === 0) return;

    // Parse everything up front — fail fast instead of silently skipping rows
    // the user believes were saved.
    const parsedRows: { id: string; row: VariantPatch }[] = [];
    let invalidCount = 0;
    for (const id of dirtyIds) {
      const draft = drafts[id];
      const row = draft ? parseRow(draft) : null;
      if (row == null) {
        invalidCount += 1;
        continue;
      }
      parsedRows.push({ id, row });
    }
    if (invalidCount > 0) {
      setError(
        `${invalidCount} phân loại có Giá bán / Tồn kho không hợp lệ (trống hoặc âm). ` +
          'Vui lòng sửa trước khi lưu tất cả.',
      );
      return;
    }

    void run(
      async () => {
        for (const { id, row } of parsedRows) {
          await updateVariant(id, row);
        }
      },
      () => {
        setSuccess(`Đã lưu tất cả ${dirtyIds.length} phân loại thành công!`);
      },
    );
  }

  function handleDelete(v: AdminVariant) {
    if (confirm(`Xóa phân loại ${v.sku}?`)) {
      void run(
        () => deleteVariant(v.id),
        () => {
          setSuccess(`Đã xóa phân loại ${v.sku}`);
        },
      );
    }
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
    const priceProvided = bulkPrice.trim() !== '';
    const compareProvided = bulkCompareAt.trim() !== '';
    const stockProvided = bulkStock.trim() !== '';

    if (!priceProvided && !compareProvided && !stockProvided) {
      setError('Vui lòng nhập ít nhất một thông số (Giá, Giá so sánh hoặc Tồn kho) để áp dụng hàng loạt.');
      return;
    }

    const priceVnd = priceProvided ? parseVnd(bulkPrice) : null;
    const compareVnd = compareProvided ? parseVnd(bulkCompareAt) : null;
    const stockNum = stockProvided ? Number(bulkStock) : null;

    // Fail fast — a provided value must be valid; silently dropping it would
    // report success while leaving half the fields unchanged.
    if (
      (priceProvided && priceVnd == null) ||
      (compareProvided && compareVnd == null) ||
      (stockProvided && (!Number.isInteger(stockNum) || (stockNum ?? 0) < 0))
    ) {
      setError('Giá bán, Giá so sánh và Tồn kho phải là số hợp lệ không âm.');
      return;
    }

    if (!confirm(`Áp dụng thay đổi cho tất cả ${detail.variants.length} biến thể của sản phẩm này?`)) {
      return;
    }

    void run(
      async () => {
        for (const v of detail.variants) {
          const patch: { priceCents?: number; compareAtPriceCents?: number | null; stock?: number } = {};
          if (priceVnd != null) patch.priceCents = priceVnd * 100;
          if (compareVnd != null) patch.compareAtPriceCents = compareVnd * 100;
          if (stockNum != null) patch.stock = stockNum;
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
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
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
          {dirtyCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveAllDirty()}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Lưu tất cả ({dirtyCount})</span>
            </button>
          )}

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
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:opacity-90"
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
        <p
          className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          role="status"
        >
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
                onChange={(e) => setBulkPrice(sanitizeVndInput(e.target.value))}
                placeholder="vd: 129000"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Giá so sánh gốc (VND)
              <input
                value={bulkCompareAt}
                onChange={(e) => setBulkCompareAt(sanitizeVndInput(e.target.value))}
                placeholder="vd: 159000"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Tồn kho đồng loạt
              <input
                value={bulkStock}
                onChange={(e) => setBulkStock(sanitizeIntInput(e.target.value))}
                placeholder="vd: 50"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
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
        <form onSubmit={submitAdd} className="mt-4 rounded-xl border border-dashed border-border bg-muted/10 p-4 sm:p-5">
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
                onChange={(e) => setNewPrice(sanitizeVndInput(e.target.value))}
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
                onChange={(e) => setNewCompareAt(sanitizeVndInput(e.target.value))}
                placeholder="vd: 159000"
                inputMode="numeric"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-xs font-medium">
              Tồn kho <span className="text-destructive">*</span>
              <input
                value={newStock}
                onChange={(e) => setNewStock(sanitizeIntInput(e.target.value))}
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

      {/* 5. Always-Ready Inline Editable Table (Zero Horizontal Scroll) */}
      <div className="mt-4 w-full">
        {/* Desktop / Tablet Table View (100% width, fixed columns, never overflows) */}
        <div className="hidden sm:block">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-[20%] py-2.5 pr-2">Mã SKU</th>
                <th className="w-[28%] py-2.5 pr-2">Phân loại</th>
                <th className="w-[18%] py-2.5 pr-2 text-right">Giá bán</th>
                <th className="w-[15%] py-2.5 pr-2 text-right">Giá gốc</th>
                <th className="w-[10%] py-2.5 pr-2 text-center">Kho</th>
                <th className="w-[9%] py-2.5 text-right" aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredVariants.map((v) => {
                const draft = drafts[v.id] || {
                  sku: v.sku,
                  price: String(Math.round(v.priceCents / 100)),
                  compareAt: v.compareAtPriceCents == null ? '' : String(Math.round(v.compareAtPriceCents / 100)),
                  stock: String(v.stock),
                  attrs: [],
                  isDirty: false,
                };

                return (
                  <tr
                    key={v.id}
                    className={`transition-colors hover:bg-muted/15 ${
                      draft.isDirty ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* 1. SKU Field */}
                    <td className="py-2.5 pr-2 align-middle">
                      <input
                        value={draft.sku}
                        onChange={(e) => updateRowField(v.id, 'sku', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveRow(v.id);
                        }}
                        placeholder="SKU"
                        className={`h-8 w-full rounded-md border px-2 font-mono text-xs outline-none transition focus:ring-1 focus:ring-foreground ${
                          draft.isDirty ? 'border-primary/60 bg-background font-semibold' : 'border-border/80 bg-background/80'
                        }`}
                      />
                    </td>

                    {/* 2. Attributes Field (Inline Editable Chips) */}
                    <td className="py-2.5 pr-2 align-middle">
                      <div className="flex flex-wrap items-center gap-1">
                        {draft.attrs.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">Mặc định</span>
                        ) : (
                          draft.attrs.map((attr, aIdx) => (
                            <div
                              key={aIdx}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-xs shadow-2xs"
                            >
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                {formatAttrKey(attr.key)}
                              </span>
                              <span className="text-muted-foreground/60">:</span>
                              <input
                                value={attr.value}
                                onChange={(e) => updateRowAttr(v.id, aIdx, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void saveRow(v.id);
                                }}
                                placeholder="Trị..."
                                className="h-5 w-14 rounded bg-muted/40 px-1 text-xs font-medium text-foreground outline-none focus:bg-background focus:ring-1 focus:ring-foreground"
                              />
                              {draft.attrs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRowAttr(v.id, aIdx)}
                                  className="text-muted-foreground hover:text-destructive"
                                  title="Xóa thuộc tính này"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => addRowAttr(v.id)}
                          className="inline-flex h-6 items-center gap-0.5 rounded border border-dashed border-border px-1.5 text-[10px] text-muted-foreground hover:border-foreground hover:text-foreground"
                          title="Thêm thuộc tính mới"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          <span className="text-[10px]">Thêm</span>
                        </button>
                      </div>
                    </td>

                    {/* 3. Selling Price */}
                    <td className="py-2.5 pr-2 align-middle">
                      <div className="relative">
                        <input
                          value={draft.price}
                          inputMode="numeric"
                          onChange={(e) => updateRowField(v.id, 'price', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveRow(v.id);
                          }}
                          className={`h-8 w-full rounded-md border pr-4 pl-2 text-right text-xs font-semibold tabular-nums outline-none transition focus:ring-1 focus:ring-foreground ${
                            draft.isDirty ? 'border-primary/60 bg-background text-foreground' : 'border-border/80 bg-background/80'
                          }`}
                          placeholder="0"
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                          ₫
                        </span>
                      </div>
                    </td>

                    {/* 4. Compare At Price */}
                    <td className="py-2.5 pr-2 align-middle">
                      <div className="relative">
                        <input
                          value={draft.compareAt}
                          inputMode="numeric"
                          onChange={(e) => updateRowField(v.id, 'compareAt', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveRow(v.id);
                          }}
                          className="h-8 w-full rounded-md border border-border/80 bg-background/80 pr-4 pl-2 text-right text-xs tabular-nums text-muted-foreground outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                          placeholder="—"
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                          ₫
                        </span>
                      </div>
                    </td>

                    {/* 5. Stock Quantity */}
                    <td className="py-2.5 pr-2 align-middle">
                      <input
                        value={draft.stock}
                        inputMode="numeric"
                        onChange={(e) => updateRowField(v.id, 'stock', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveRow(v.id);
                        }}
                        className={`h-8 w-full rounded-md border px-1 text-center text-xs font-semibold tabular-nums outline-none transition focus:ring-1 focus:ring-foreground ${
                          Number(draft.stock) === 0
                            ? 'border-destructive/40 bg-destructive/5 text-destructive'
                            : Number(draft.stock) < 10
                            ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                            : 'border-border/80 bg-background/80'
                        }`}
                        placeholder="0"
                      />
                    </td>

                    {/* 6. Row Action Buttons (Save/Reset/Delete) */}
                    <td className="py-2.5 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {draft.isDirty && (
                          <>
                            <button
                              type="button"
                              disabled={busy || draft.saving}
                              onClick={() => void saveRow(v.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                              title="Lưu thay đổi (hoặc nhấn Enter)"
                            >
                              {draft.saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => resetRow(v.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              title="Khôi phục lại giá trị gốc"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(v)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          title={`Xóa phân loại ${v.sku}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredVariants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    {searchFilter
                      ? 'Không có biến thể nào khớp bộ lọc.'
                      : 'Chưa có phân loại nào — bấm "+ Thêm phân loại" để tạo biến thể.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (< 640px) — 100% Responsive, Zero Horizontal Overflow */}
        <div className="space-y-3 sm:hidden">
          {filteredVariants.map((v) => {
            const draft = drafts[v.id] || {
              sku: v.sku,
              price: String(Math.round(v.priceCents / 100)),
              compareAt: v.compareAtPriceCents == null ? '' : String(Math.round(v.compareAtPriceCents / 100)),
              stock: String(v.stock),
              attrs: [],
              isDirty: false,
            };

            return (
              <div
                key={v.id}
                className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
                  draft.isDirty ? 'border-primary/50 bg-amber-500/5' : 'border-border bg-card'
                }`}
              >
                {/* Mobile Header: SKU + Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Mã SKU
                    </label>
                    <input
                      value={draft.sku}
                      onChange={(e) => updateRowField(v.id, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-xs font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-1 pt-3.5">
                    {draft.isDirty && (
                      <>
                        <button
                          type="button"
                          disabled={busy || draft.saving}
                          onClick={() => void saveRow(v.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white"
                          title="Lưu"
                        >
                          {draft.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => resetRow(v.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground"
                          title="Khôi phục"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(v)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                      title="Xóa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile Attributes */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Phân loại
                  </label>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {draft.attrs.map((attr, aIdx) => (
                      <div
                        key={aIdx}
                        className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                      >
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {formatAttrKey(attr.key)}:
                        </span>
                        <input
                          value={attr.value}
                          onChange={(e) => updateRowAttr(v.id, aIdx, e.target.value)}
                          className="h-5 w-16 rounded bg-muted/40 px-1 text-xs"
                        />
                        {draft.attrs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRowAttr(v.id, aIdx)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRowAttr(v.id)}
                      className="inline-flex h-6 items-center gap-0.5 rounded border border-dashed border-border px-1.5 text-[10px] text-muted-foreground"
                    >
                      <Plus className="h-2.5 w-2.5" /> Thêm
                    </button>
                  </div>
                </div>

                {/* Mobile Prices & Stock in 3 columns */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Giá bán (₫)
                    </label>
                    <input
                      value={draft.price}
                      inputMode="numeric"
                      onChange={(e) => updateRowField(v.id, 'price', e.target.value)}
                      className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-right text-xs font-semibold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Giá gốc (₫)
                    </label>
                    <input
                      value={draft.compareAt}
                      inputMode="numeric"
                      onChange={(e) => updateRowField(v.id, 'compareAt', e.target.value)}
                      placeholder="—"
                      className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-2 text-right text-xs tabular-nums text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Kho
                    </label>
                    <input
                      value={draft.stock}
                      inputMode="numeric"
                      onChange={(e) => updateRowField(v.id, 'stock', e.target.value)}
                      className="mt-0.5 h-8 w-full rounded-md border border-border bg-background px-1.5 text-center text-xs font-semibold tabular-nums"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {filteredVariants.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {searchFilter
                ? 'Không có biến thể nào khớp bộ lọc.'
                : 'Chưa có phân loại nào — bấm "+ Thêm phân loại" để tạo biến thể.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
