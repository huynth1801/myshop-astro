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
          Tên sản phẩm
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} className={FIELD} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Danh mục
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={FIELD}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Slug (URL cố định sau khi tạo)
            <input value={detail.slug} readOnly className={`${FIELD} bg-muted font-mono text-muted-foreground`} />
          </label>
        </div>
        <label className="block text-sm">
          Mô tả ngắn (hiện ở card + meta description, tối đa 200 ký tự)
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={200}
            className={FIELD}
          />
        </label>
        <label className="block text-sm">
          Mô tả đầy đủ
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className={FIELD}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Đang lưu…' : 'Lưu thông tin'}
      </button>
    </form>
  );
}
