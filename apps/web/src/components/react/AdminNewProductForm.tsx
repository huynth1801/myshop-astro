import { useEffect, useState } from 'react';
import {
  AdminError,
  createProduct,
  listCategories,
  type AdminCategory,
  type NewProduct,
} from '../../lib/api/admin';

interface Props {
  onCreated: () => void;
}

/** Bỏ dấu tiếng Việt + kebab-case để gợi ý slug từ tên. */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FIELD =
  'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground';

/** Collapsible "thêm sản phẩm" form — tạo xong gọi onCreated để refresh bảng. */
export default function AdminNewProductForm({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<NewProduct['status']>('DRAFT');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setCategoryId((current) => current || cats[0].id);
      })
      .catch(() => setError('Không tải được danh mục.'));
  }, []);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      setError('Chọn danh mục trước đã.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProduct({
        name,
        slug,
        description,
        shortDescription,
        status,
        categoryId: category.id,
      });
      onCreated();
      setName('');
      setSlug('');
      setSlugTouched(false);
      setShortDescription('');
      setDescription('');
      setStatus('DRAFT');
    } catch (e) {
      if (e instanceof AdminError && e.code === 'SLUG_TAKEN') {
        setError(`Slug "${slug}" đã có người dùng — chọn slug khác.`);
      } else if (e instanceof AdminError && e.code === 'CATEGORY_NOT_FOUND') {
        setError('Danh mục không tồn tại — tải lại trang thử nhé.');
      } else {
        setError(e instanceof AdminError ? e.message : 'Không tạo được sản phẩm.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-xl border border-border bg-card p-5">
      {error && (
        <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Tên sản phẩm
          <input value={name} onChange={(e) => setName(e.target.value)} required className={FIELD} />
        </label>
        <label className="block text-sm">
          Slug (URL, không đổi sau khi tạo)
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className={`${FIELD} font-mono`}
          />
        </label>
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
          Trạng thái
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as NewProduct['status'])}
            className={FIELD}
          >
            <option value="DRAFT">Nháp (chưa hiện trên shop)</option>
            <option value="ACTIVE">Đang bán</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          Mô tả ngắn
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={200}
            className={FIELD}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          Mô tả
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={FIELD} />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'Đang tạo…' : 'Tạo sản phẩm'}
      </button>
    </form>
  );
}
