import { useSyncExternalStore } from 'react';
import type { ReadableAtom } from 'nanostores';

/** React bridge for nanostores using stdlib useSyncExternalStore (no extra dep). */
export function useStore<T>(store: ReadableAtom<T>): T {
  return useSyncExternalStore(
    (onChange) => store.listen(onChange),
    () => store.get(),
    () => store.get(),
  );
}
