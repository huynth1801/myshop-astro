import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useStore } from '../../lib/stores/useStore';
import { toastsStore, removeToast } from '../../lib/stores/toast';

export default function ToastContainer() {
  const toasts = useStore(toastsStore);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-6 right-6 z-[9999] flex max-w-sm flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === 'success';
        const isError = item.type === 'error';
        const isWarning = item.type === 'warning';

        return (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card/95 p-3.5 sm:p-4 text-foreground shadow-xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-3 fade-in"
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />}
              {isError && <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />}
              {isWarning && <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {item.title && (
                <div className="text-xs font-semibold leading-tight text-foreground mb-0.5">
                  {item.title}
                </div>
              )}
              <div className="text-xs leading-relaxed text-muted-foreground break-words">
                {item.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-muted-foreground hover:text-foreground transition"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
