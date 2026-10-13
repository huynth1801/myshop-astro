import type { AdminCategory } from '../../lib/api/admin';

interface Props {
  q: string;
  onQChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  categoryId: string;
  onCategoryChange: (val: string) => void;
  categories: AdminCategory[];
  onReload: () => void;
  showForm: boolean;
  onToggleForm: () => void;
}

export default function AdminToolbar({
  q,
  onQChange,
  status,
  onStatusChange,
  categoryId,
  onCategoryChange,
  categories,
  onReload,
  showForm,
  onToggleForm,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
      <div className="flex flex-1 flex-wrap items-center gap-2.5">
        <input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Tìm theo tên hoặc slug sản phẩm…"
          aria-label="Tìm sản phẩm"
          className="h-9.5 min-w-56 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
        />
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Lọc trạng thái"
          className="h-9.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none"
        >
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Lọc danh mục"
          className="h-9.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none"
        >
          <option value="">Mọi danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReload}
          className="h-9.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Làm mới
        </button>
        <button
          type="button"
          onClick={onToggleForm}
          className="h-9.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition hover:opacity-90"
        >
          {showForm ? 'Đóng form' : '+ Thêm sản phẩm'}
        </button>
      </div>
    </div>
  );
}
