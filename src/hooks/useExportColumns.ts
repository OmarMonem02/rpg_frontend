"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExportColumnDef } from "@/types/export-columns";

function defaultOrder(allColumns: readonly ExportColumnDef[]): string[] {
  return allColumns
    .filter((col) => !col.exportOnly)
    .map((col) => col.key);
}

function readFromStorage(
  key: string,
  allColumns: readonly ExportColumnDef[],
): string[] {
  const allowed = new Set(allColumns.map((col) => col.key));
  const required = allColumns.filter((col) => col.required).map((col) => col.key);

  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const stored = (parsed as string[]).filter((id) => allowed.has(id));
        const missing = allColumns
          .map((col) => col.key)
          .filter((id) => !stored.includes(id));
        const merged = [...stored, ...missing];
        for (const req of required) {
          if (!merged.includes(req)) merged.push(req);
        }
        return merged.length > 0 ? merged : defaultOrder(allColumns);
      }
    }
  } catch {
    // ignore
  }

  return defaultOrder(allColumns);
}

export function useExportColumns(
  storageKey: string,
  allColumns: readonly ExportColumnDef[],
) {
  const [orderedKeys, setOrderedKeys] = useState<string[]>(() =>
    allColumns.map((col) => col.key).filter((key) => {
      const col = allColumns.find((c) => c.key === key);
      return col && !col.exportOnly;
    }),
  );

  useEffect(() => {
    setOrderedKeys(readFromStorage(storageKey, allColumns));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      setOrderedKeys(next);
    },
    [storageKey],
  );

  const columnByKey = useMemo(
    () => new Map(allColumns.map((col) => [col.key, col])),
    [allColumns],
  );

  const visibleColumns = useMemo(
    () =>
      orderedKeys
        .map((key) => columnByKey.get(key))
        .filter((col): col is ExportColumnDef => Boolean(col)),
    [orderedKeys, columnByKey],
  );

  const isVisible = useCallback((key: string) => orderedKeys.includes(key), [orderedKeys]);

  const toggle = useCallback(
    (key: string) => {
      const col = columnByKey.get(key);
      if (!col || col.required) return;

      if (orderedKeys.includes(key)) {
        persist(orderedKeys.filter((id) => id !== key));
        return;
      }

      const defaultIndex = allColumns.findIndex((c) => c.key === key);
      const next = [...orderedKeys];
      const insertAt = next.findIndex((id) => {
        const idx = allColumns.findIndex((c) => c.key === id);
        return idx > defaultIndex;
      });
      if (insertAt === -1) {
        next.push(key);
      } else {
        next.splice(insertAt, 0, key);
      }
      persist(next);
    },
    [allColumns, columnByKey, orderedKeys, persist],
  );

  const move = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
      const next = [...orderedKeys];
      const [item] = next.splice(fromIndex, 1);
      if (!item) return;
      next.splice(toIndex, 0, item);
      persist(next);
    },
    [orderedKeys, persist],
  );

  const reset = useCallback(() => {
    persist(allColumns.map((col) => col.key));
  }, [allColumns, persist]);

  const columnsParam = useCallback(
    (options?: { excludeExportOnly?: boolean }) => {
      const keys = options?.excludeExportOnly
        ? orderedKeys.filter((key) => !columnByKey.get(key)?.exportOnly)
        : orderedKeys;
      return keys.length > 0 ? keys.join(",") : undefined;
    },
    [orderedKeys, columnByKey],
  );

  const hiddenRequiredCount = useMemo(
    () =>
      allColumns.filter((col) => col.required && !orderedKeys.includes(col.key)).length,
    [allColumns, orderedKeys],
  );

  return {
    orderedKeys,
    visibleColumns,
    visibleCount: orderedKeys.length,
    totalCount: allColumns.length,
    isVisible,
    toggle,
    move,
    reset,
    columnsParam,
    hiddenRequiredCount,
  };
}
