"use client";

import { useEffect, type RefObject } from "react";

/**
 * Initializes Nyx sortable table behavior on a client-rendered table.
 * Loads nyx-css/js only in the browser and scopes init to the table element.
 */
export function useNyxSortableTable(
  tableRef: RefObject<HTMLTableElement | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const table = tableRef.current;
    if (!table || typeof window === "undefined") return;

    let cancelled = false;

    import("nyx-css/js")
      .then((mod) => {
        if (cancelled || !tableRef.current) return;
        mod.default.init(tableRef.current);
      })
      .catch((err) => {
        console.error("[useNyxSortableTable] Failed to load nyx-css/js:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [tableRef, enabled]);
}
