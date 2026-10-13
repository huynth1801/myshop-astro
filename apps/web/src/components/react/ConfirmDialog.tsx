import { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  itemName,
  confirmLabel = 'Xác nhận xóa',
  cancelLabel = 'Hủy',
  variant = 'danger',
  isLoading = false,
  errorMessage = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape & trap focus / focus confirm button on open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto focus primary button after open
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Top bar with close button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isDanger
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isDanger ? (
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="text-sm font-semibold text-foreground sm:text-base">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Đóng"
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="mt-3.5 space-y-3">
          {description && (
            <div className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </div>
          )}

          {itemName && (
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3.5 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Mục đã chọn:
              </span>
              <p className="text-xs font-medium text-foreground line-clamp-2 break-words">
                "{itemName}"
              </p>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            {isDanger
              ? 'Hành động này sẽ xóa dữ liệu vĩnh viễn và không thể hoàn tác.'
              : 'Vui lòng kiểm tra kỹ trước khi xác nhận thực hiện.'}
          </p>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40"
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition disabled:opacity-50 ${
              isDanger
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                {isDanger && <Trash2 className="h-3.5 w-3.5" />}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
