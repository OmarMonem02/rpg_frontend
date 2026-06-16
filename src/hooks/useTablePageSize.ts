"use client";

import { useCallback, useEffect, useState } from "react";

export type TablePageSize = 20 | 50 | 100 | "all";
export const TABLE_PAGE_SIZE_OPTIONS: TablePageSize[] = [20, 50, 100, "all"];

/** Numeric value sent to the API when "all" is selected. */
export const ALL_ITEMS_PER_PAGE = 10_000;

const VALID_SIZES: TablePageSize[] = [20, 50, 100, "all"];

function readFromStorage(key: string): TablePageSize {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === "all") return "all";
    const n = Number(raw);
    if ((VALID_SIZES as number[]).includes(n)) return n as TablePageSize;
  } catch {
    // ignore
  }
  return 20;
}

export function useTablePageSize(storageKey: string): {
  pageSize: TablePageSize;
  setPageSize: (size: TablePageSize) => void;
  apiPerPage: number;
  isShowAll: boolean;
} {
  const [pageSize, setPageSizeState] = useState<TablePageSize>(20);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setPageSizeState(readFromStorage(storageKey));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setPageSize = useCallback(
    (size: TablePageSize) => {
      try {
        window.localStorage.setItem(storageKey, String(size));
      } catch {
        // ignore
      }
      setPageSizeState(size);
    },
    [storageKey],
  );

  const isShowAll = pageSize === "all";
  const apiPerPage = isShowAll ? ALL_ITEMS_PER_PAGE : pageSize;

  return { pageSize, setPageSize, apiPerPage, isShowAll };
}
