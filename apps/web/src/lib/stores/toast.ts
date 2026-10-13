import { atom } from 'nanostores';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export const toastsStore = atom<ToastItem[]>([]);

export function showToast(toastInput: Omit<ToastItem, 'id'> & { id?: string }): string {
  const id = toastInput.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item: ToastItem = {
    id,
    type: toastInput.type,
    title: toastInput.title,
    message: toastInput.message,
    duration: toastInput.duration ?? 4000,
  };

  toastsStore.set([...toastsStore.get(), item]);

  if (item.duration && item.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, item.duration);
  }

  return id;
}

export function removeToast(id: string) {
  toastsStore.set(toastsStore.get().filter((t) => t.id !== id));
}

export const toast = {
  success: (message: string, title?: string) =>
    showToast({ type: 'success', message, title: title ?? 'Thành công' }),
  error: (message: string, title?: string) =>
    showToast({ type: 'error', message, title: title ?? 'Có lỗi xảy ra' }),
  warning: (message: string, title?: string) =>
    showToast({ type: 'warning', message, title: title ?? 'Cảnh báo' }),
  info: (message: string, title?: string) =>
    showToast({ type: 'info', message, title: title ?? 'Thông báo' }),
};
