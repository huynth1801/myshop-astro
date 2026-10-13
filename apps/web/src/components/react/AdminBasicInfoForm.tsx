import { useEffect, useState } from 'react';
import {
  AdminError,
  listCategories,
  updateProduct,
  type AdminCategory,
  type AdminProductDetail,
} from '../../lib/api/admin';

interface Props {
  detail: AdminProductDetail;
  onChanged: () => void;
}

const FIELD =
  'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground';

/** Section "Thông tin cơ bản" — saves name/category/descriptions on its own button. */
export default function AdminBasicInfoForm({ detail, onChanged }: Props) {
  const [name, setName] = useState(detail.name);
  const [shortDescription, setShortDescription] = useState(detail.shortDescription ?? '');
  const [description, setDescription] = useState(detail.description);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // reset the form whenever the parent reloads the product (avoid typing over stale state)
  useEffect(() => {
    setName(detail.name);
    setShortDescription(detail.shortDescription ?? '');
    setDescription(detail.description);
    const current = categories.find(
      (c) => c.slug === detail.category.slug,
    );
    setCategoryId((prev) => prev || current?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.id, detail.name, detail.shortDescription, detail.description, detail.category.slug]);

  useEffect(() => {
    listCategories()
      .then((cats) => {
        setCategories(cats);
        const match = cats.find((c) => c.slug === detail.category.slug);
        setCategoryId((prev) => prev || match?.id || '');
      })
      .catch(() => setError('Không tải được danh mục.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.category.slug]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const category = categories.find((c) => c.id === categoryId);
    setBusy(true);
    setError(null);
    try {
      await updateProduct(detail.id, {
        name,
        shortDescription,
        description,
        categoryId: category?.id,
      });
      setSavedAt(new Date().toLocaleTimeString('vi-VN'));
      onChanged();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Không lưu được thông tin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Thông tin cơ bản</h2>
        {savedAt && <p className="text-xs text-muted-foreground">Đã lưu lúc {savedAt}</p>}
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 grid gap-4">
        <label className="block text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Tên sản phẩm</span>
            <span className="text-xs text-muted-foreground">{name.length}/255</span>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            placeholder="Nhập tên sản phẩm..."
            className={FIELD}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Danh mục sản phẩm</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={FIELD}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Đường dẫn tĩnh (Slug)</span>
            <input
              value={detail.slug}
              readOnly
              title="Đường dẫn cố định nhằm bảo vệ thứ hạng SEO và các liên kết đã chia sẻ"
              className={`${FIELD} cursor-not-allowed bg-muted font-mono text-xs text-muted-foreground`}
            />
          </label>
        </div>
        <label className="block text-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Mô tả ngắn</span>
              <span className="ml-2 text-xs text-muted-foreground">(Hiển thị trên thẻ sản phẩm &amp; thẻ SEO meta)</span>
            </div>
            <span className={`text-xs ${shortDescription.length > 180 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
              {shortDescription.length}/200
            </span>
          </div>
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={200}
            placeholder="Tóm tắt ngắn gọn đặc điểm nổi bật nhất của sản phẩm..."
            className={FIELD}
          />
        </label>
        <label className="block text-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Mô tả chi tiết</span>
              <span className="ml-2 text-xs text-muted-foreground">(Hiển thị đầy đủ ở trang chi tiết sản phẩm)</span>
            </div>
            <span className="text-xs text-muted-foreground">{description.length} ký tự</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="Chi tiết chất liệu, xuất xứ, tính năng, hướng dẫn chọn size..."
            className={`${FIELD} leading-relaxed`}
          />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Đang lưu…' : 'Lưu thông tin cơ bản'}
        </button>
      </div>
    </form>
  );
}
