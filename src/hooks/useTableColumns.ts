"use client";

import { useCallback, useEffect, useState } from "react";

export type TableColumnDef<T extends string> = {
  id: T;
  label: string;
  required?: boolean;
};

function readFromStorage<T extends string>(
  key: string,
  allColumns: readonly TableColumnDef<T>[],
): Set<T> {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = new Set(parsed as T[]);
        // Always include required columns regardless of what's stored
        const result = new Set<T>(stored);
        for (const col of allColumns) {
          if (col.required) result.add(col.id);
        }
        return result;
      }
    }
  } catch {
    // ignore
  }
  return new Set(allColumns.map((c) => c.id));
}

export function useTableColumns<T extends string>(
  storageKey: string,
  allColumns: readonly TableColumnDef<T>[],
): {
  visible: Set<T>;
  toggle: (id: T) => void;
  reset: () => void;
  isVisible: (id: T) => boolean;
} {
  const [visible, setVisible] = useState<Set<T>>(() => new Set(allColumns.map((c) => c.id)));

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setVisible(readFromStorage(storageKey, allColumns));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = useCallback(
    (next: Set<T>) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      setVisible(next);
    },
    [storageKey],
  );

  const toggle = useCallback(
    (id: T) => {
      const col = allColumns.find((c) => c.id === id);
      if (col?.required) return;
      const next = new Set(visible);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persist(next);
    },
    [allColumns, visible, persist],
  );

  const reset = useCallback(() => {
    const next = new Set(allColumns.map((c) => c.id));
    persist(next);
  }, [allColumns, persist]);

  const isVisible = useCallback((id: T) => visible.has(id), [visible]);

  return { visible, toggle, reset, isVisible };
}
