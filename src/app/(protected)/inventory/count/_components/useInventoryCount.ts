"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  exportStocktakeDiscrepancies,
  listProducts,
  listSpareParts,
  bulkApplyProducts,
  bulkApplySpareParts,
  type ProductRecord,
  type SparePartRecord,
} from "@/lib/crud-api";
import { findExactSkuOrPartNumberMatch } from "@/lib/item-lookup";
import {
  filterCountLines,
  getWorkflowStep,
  matchesCountSearch,
  sortCountLinesBy,
  summarize,
  toExportRows,
  type CountItemType,
  type CountLine,
  type CountListTab,
  type CountSortKey,
} from "@/lib/stocktake";
import {
  clearCountSession,
  loadCountSession,
  saveCountSession,
  type CountSessionLastScan,
} from "@/lib/stocktake-session";

export type PickerType = "products" | "spare_parts";

const RESTORE_NOTICE_KEY = "rpg-inventory-count-restore-notice";
const MAX_SCAN_HISTORY = 10;

function lineKey(type: CountItemType, id: number): string {
  return `${type}:${id}`;
}

function recordToLine(
  type: CountItemType,
  record: ProductRecord | SparePartRecord,
  counted: number = 1
): CountLine {
  return {
    type,
    id: record.id,
    name: record.name,
    sku: record.sku,
    partNumber: record.part_number || undefined,
    image: record.image || undefined,
    systemQty: record.stock_quantity,
    counted,
  };
}

function shouldShowRestoreNotice(savedAt: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(RESTORE_NOTICE_KEY) !== savedAt;
}

function markRestoreNoticeShown(savedAt: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESTORE_NOTICE_KEY, savedAt);
}

export function useInventoryCount() {
  const scanInputRef = useRef<HTMLInputElement>(null);
  const pendingScanRefocusRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [scanValue, setScanValue] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<CountSessionLastScan | null>(null);
  const [lastTouchedKey, setLastTouchedKey] = useState<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [pickerType, setPickerType] = useState<PickerType | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [listTab, setListTab] = useState<CountListTab>("all");
  const [listSearch, setListSearch] = useState("");

  // ── NEW: sort key ──
  const [sortKey, setSortKey] = useState<CountSortKey>("default");

  // ── NEW: scan history (ring buffer of last N scans) ──
  const [scanHistory, setScanHistory] = useState<CountSessionLastScan[]>([]);

  // ── NEW: refreshing stock ──
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // ── NEW: batch operation states ──
  const [batchConfirmOpen, setBatchConfirmOpen] = useState<string | null>(null);

  // ── NEW: Apply operation states ──
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // ── NEW: Bulk mode states ──
  const [countMode, setCountMode] = useState<"scan" | "bulk">("scan");
  const [bulkCatalog, setBulkCatalog] = useState<{ products: ProductRecord[]; spareParts: SparePartRecord[] }>({ products: [], spareParts: [] });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkCatalogLoaded, setBulkCatalogLoaded] = useState(false);

  const summary = useMemo(() => summarize(lines), [lines]);
  const workflowStep = useMemo(
    () => getWorkflowStep(lines, summary),
    [lines, summary],
  );

  const visibleLines = useMemo(() => {
    const filtered = filterCountLines(lines, listTab).filter((line) =>
      matchesCountSearch(line, listSearch),
    );
    return sortCountLinesBy(filtered, sortKey);
  }, [lines, listTab, listSearch, sortKey]);

  const listTabOptions = useMemo(
    (): Array<{ id: CountListTab; label: string }> => [
      { id: "all", label: `All (${lines.length})` },
      { id: "matches", label: `Matches (${summary.matches})` },
      { id: "discrepancies", label: `Discrepancies (${summary.discrepancies})` },
    ],
    [lines.length, summary.discrepancies, summary.matches],
  );

  // ── NEW: sort options for the UI ──
  const sortOptions = useMemo(
    (): Array<{ id: CountSortKey; label: string }> => [
      { id: "default", label: "Discrepancies first" },
      { id: "name", label: "Name (A–Z)" },
      { id: "sku", label: "SKU" },
      { id: "variance", label: "Largest variance" },
      { id: "type", label: "Item type" },
    ],
    [],
  );

  // ── Hydration from local storage ──
  useEffect(() => {
    const snapshot = loadCountSession();
    if (snapshot) {
      setLines(snapshot.lines);
      setListTab(snapshot.listTab);
      setListSearch(snapshot.listSearch);
      setLastScan(snapshot.lastScan);
      setLastTouchedKey(snapshot.lastTouchedKey);
      if (snapshot.sortKey) setSortKey(snapshot.sortKey);
      if (snapshot.scanHistory?.length) setScanHistory(snapshot.scanHistory);
      if (shouldShowRestoreNotice(snapshot.savedAt)) {
        setRestoredAt(snapshot.savedAt);
        markRestoreNoticeShown(snapshot.savedAt);
      }
    }
    setHydrated(true);
  }, []);

  // ── Persist to local storage on every change ──
  useEffect(() => {
    if (!hydrated) return;
    saveCountSession({
      lines,
      listTab,
      listSearch,
      lastScan,
      lastTouchedKey,
      sortKey,
      scanHistory,
    });
  }, [hydrated, lines, listTab, listSearch, lastScan, lastTouchedKey, sortKey, scanHistory]);

  // ── Global keyboard shortcut: "/" to focus scan input ──
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        scanInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const refocusScanInput = useCallback(() => {
    requestAnimationFrame(() => {
      scanInputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const scheduleScanRefocus = useCallback(() => {
    pendingScanRefocusRef.current = true;
  }, []);

  // Refocus after scan lookup — input is disabled while scanBusy, so wait until it clears.
  useEffect(() => {
    if (!scanBusy && pendingScanRefocusRef.current) {
      pendingScanRefocusRef.current = false;
      refocusScanInput();
    }
  }, [scanBusy, refocusScanInput]);

  const touchLine = useCallback((type: CountItemType, id: number) => {
    setLastTouchedKey(lineKey(type, id));
  }, []);

  const syncLastScanCounted = useCallback(
    (type: CountItemType, id: number, counted: number) => {
      const key = lineKey(type, id);
      setLastScan((current) =>
        current?.key === key ? { ...current, counted } : current,
      );
    },
    [],
  );

  // ── Push a scan into the history ring buffer ──
  const pushScanHistory = useCallback((scan: CountSessionLastScan) => {
    setScanHistory((prev) => {
      const deduped = prev.filter((s) => s.key !== scan.key);
      return [scan, ...deduped].slice(0, MAX_SCAN_HISTORY);
    });
  }, []);

  const addOrIncrement = useCallback(
    (type: CountItemType, record: ProductRecord | SparePartRecord, step = 1) => {
      const key = lineKey(type, record.id);
      let nextCounted = step;

      setLines((prev) => {
        const existing = prev.find((line) => lineKey(line.type, line.id) === key);
        if (existing) {
          nextCounted = existing.counted + step;
          return prev.map((line) =>
            lineKey(line.type, line.id) === key
              ? {
                  ...line,
                  counted: nextCounted,
                  systemQty: record.stock_quantity,
                  image: record.image || line.image,
                }
              : line,
          );
        }
        return [recordToLine(type, record), ...prev];
      });

      const scanEntry: CountSessionLastScan = {
        key,
        name: record.name,
        type,
        sku: record.sku,
        counted: nextCounted,
        systemQty: record.stock_quantity,
        image: record.image || undefined,
      };

      setLastTouchedKey(key);
      setLastScan(scanEntry);
      pushScanHistory(scanEntry);
      setScanError(null);
    },
    [pushScanHistory],
  );

  const handleScan = useCallback(async () => {
    const code = scanValue.trim();
    if (!code || scanBusy) return;

    try {
      setScanBusy(true);
      setScanError(null);

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const [productsRes, spareRes] = await Promise.all([
        listProducts(token, 1, { search: code }),
        listSpareParts(token, 1, { search: code }),
      ]);

      const match = findExactSkuOrPartNumberMatch(
        code,
        productsRes.items,
        spareRes.items,
      );
      if (!match) {
        throw new Error(`No product or spare part found for "${code}"`);
      }

      addOrIncrement(match.kind, match.record);
      setScanValue("");
      scheduleScanRefocus();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
      setLastScan(null);
      scheduleScanRefocus();
    } finally {
      setScanBusy(false);
    }
  }, [addOrIncrement, scanBusy, scanValue, scheduleScanRefocus]);

  const handlePickerAdd = useCallback(
    (items: Array<ProductRecord | SparePartRecord>) => {
      if (!pickerType) return;
      const type: CountItemType =
        pickerType === "products" ? "product" : "spare_part";
      items.forEach((item) => addOrIncrement(type, item));
      setPickerType(null);
      refocusScanInput();
    },
    [addOrIncrement, pickerType, refocusScanInput],
  );

  const updateCounted = useCallback(
    (type: CountItemType, id: number, value: number) => {
      const next = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
      touchLine(type, id);
      setLines((prev) =>
        prev.map((line) =>
          lineKey(line.type, line.id) === lineKey(type, id)
            ? { ...line, counted: next }
            : line,
        ),
      );
      syncLastScanCounted(type, id, next);
    },
    [syncLastScanCounted, touchLine],
  );

  const setToSystemQty = useCallback(
    (type: CountItemType, id: number) => {
      const key = lineKey(type, id);
      touchLine(type, id);
      setLines((prev) => {
        const target = prev.find((line) => lineKey(line.type, line.id) === key);
        if (!target) return prev;
        setLastScan((current) =>
          current?.key === key
            ? { ...current, counted: target.systemQty }
            : current,
        );
        return prev.map((line) =>
          lineKey(line.type, line.id) === key
            ? { ...line, counted: line.systemQty }
            : line,
        );
      });
    },
    [touchLine],
  );

  const removeLine = useCallback((type: CountItemType, id: number) => {
    const key = lineKey(type, id);
    setLines((prev) => prev.filter((line) => lineKey(line.type, line.id) !== key));
    setLastTouchedKey((current) => (current === key ? null : current));
    setLastScan((current) => (current?.key === key ? null : current));
  }, []);

  const clearAll = useCallback(() => {
    setLines([]);
    setScanError(null);
    setExportError(null);
    setLastScan(null);
    setLastTouchedKey(null);
    setListSearch("");
    setListTab("all");
    setRestoredAt(null);
    setClearConfirmOpen(false);
    setSortKey("default");
    setScanHistory([]);
    setRefreshError(null);
    setBatchConfirmOpen(null);
    clearCountSession();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(RESTORE_NOTICE_KEY);
    }
    refocusScanInput();
  }, [refocusScanInput]);

  const handleExport = useCallback(async () => {
    if (summary.discrepancies === 0 || exporting) return;
    try {
      setExporting(true);
      setExportError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await exportStocktakeDiscrepancies(token, toExportRows(lines));
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Failed to generate the report",
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, lines, summary.discrepancies]);

  const dismissRestoreNotice = useCallback(() => {
    setRestoredAt(null);
  }, []);

  // ── NEW: Refresh system stock from server ──
  const refreshSystemStock = useCallback(async () => {
    if (lines.length === 0 || refreshing) return;
    try {
      setRefreshing(true);
      setRefreshError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      // Separate product and spare part IDs
      const productIds = lines.filter((l) => l.type === "product").map((l) => l.id);
      const sparePartIds = lines.filter((l) => l.type === "spare_part").map((l) => l.id);

      // Fetch current stock for all items
      const [productsRes, spareRes] = await Promise.all([
        productIds.length > 0
          ? listProducts(token, 1, {})
              .then(async (first) => {
                // Fetch all pages to find our items
                const allProducts: ProductRecord[] = [...first.items];
                let page = 2;
                while (page <= first.lastPage && page <= 10) {
                  const next = await listProducts(token, page, {});
                  allProducts.push(...next.items);
                  page++;
                }
                return allProducts;
              })
          : Promise.resolve([]),
        sparePartIds.length > 0
          ? listSpareParts(token, 1, {})
              .then(async (first) => {
                const allParts: SparePartRecord[] = [...first.items];
                let page = 2;
                while (page <= first.lastPage && page <= 10) {
                  const next = await listSpareParts(token, page, {});
                  allParts.push(...next.items);
                  page++;
                }
                return allParts;
              })
          : Promise.resolve([]),
      ]);

      const productMap = new Map(productsRes.map((p) => [p.id, p.stock_quantity]));
      const spareMap = new Map(spareRes.map((p) => [p.id, p.stock_quantity]));

      let updatedCount = 0;
      setLines((prev) =>
        prev.map((line) => {
          const map = line.type === "product" ? productMap : spareMap;
          const freshQty = map.get(line.id);
          if (freshQty !== undefined && freshQty !== line.systemQty) {
            updatedCount++;
            return { ...line, systemQty: freshQty };
          }
          return line;
        }),
      );

      if (updatedCount === 0) {
        setRefreshError("All system quantities are already up to date.");
      }
    } catch (err) {
      setRefreshError(
        err instanceof Error ? err.message : "Failed to refresh stock",
      );
    } finally {
      setRefreshing(false);
    }
  }, [lines, refreshing]);

  // ── NEW: Batch operations ──
  const setAllToSystemQty = useCallback(() => {
    setLines((prev) =>
      prev.map((line) => ({ ...line, counted: line.systemQty })),
    );
    setBatchConfirmOpen(null);
  }, []);

  const resetAllCounted = useCallback(() => {
    setLines((prev) =>
      prev.map((line) => ({ ...line, counted: 0 })),
    );
    setBatchConfirmOpen(null);
  }, []);

  const removeAllMatches = useCallback(() => {
    setLines((prev) =>
      prev.filter((line) => line.counted !== line.systemQty),
    );
    setBatchConfirmOpen(null);
  }, []);

  const applyDiscrepancies = useCallback(async () => {
    if (lines.length === 0 || applying) return;
    try {
      setApplying(true);
      setApplyError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const discrepantLines = lines.filter((l) => l.counted !== l.systemQty);
      if (discrepantLines.length === 0) {
        setApplyConfirmOpen(false);
        return;
      }

      await Promise.all(
        discrepantLines.map(async (line) => {
          if (line.type === "product") {
            await bulkApplyProducts(token, {
              ids: [line.id],
              changes: { stock_quantity: { mode: "set", value: line.counted } }
            });
          } else {
            await bulkApplySpareParts(token, {
              ids: [line.id],
              changes: { stock_quantity: { mode: "set", value: line.counted } }
            });
          }
        })
      );

      // Successfully applied: update the local state's systemQty to match the counted ones
      setLines((prev) =>
        prev.map((line) => ({
          ...line,
          systemQty: line.counted,
        }))
      );
      
      setApplyConfirmOpen(false);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to apply stock changes");
    } finally {
      setApplying(false);
    }
  }, [lines, applying]);

  // ── NEW: Re-scan from history ──
  const rescanFromHistory = useCallback(
    async (scan: CountSessionLastScan) => {
      // Re-fetch and add/increment
      const code = scan.sku;
      if (!code || scanBusy) return;

      try {
        setScanBusy(true);
        setScanError(null);

        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");

        const [productsRes, spareRes] = await Promise.all([
          listProducts(token, 1, { search: code }),
          listSpareParts(token, 1, { search: code }),
        ]);

        const match = findExactSkuOrPartNumberMatch(
          code,
          productsRes.items,
          spareRes.items,
        );
        if (!match) {
          throw new Error(`Item "${scan.name}" no longer found in the catalog`);
        }

        addOrIncrement(match.kind, match.record);
        scheduleScanRefocus();
      } catch (err) {
        setScanError(err instanceof Error ? err.message : "Re-scan failed");
        scheduleScanRefocus();
      } finally {
        setScanBusy(false);
      }
    },
    [addOrIncrement, scanBusy, scheduleScanRefocus],
  );

  // ── NEW: Bulk mode functions ──
  const loadBulkCatalog = useCallback(async () => {
    if (bulkCatalogLoaded || isBulkLoading) return;
    try {
      setIsBulkLoading(true);
      setRefreshError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const fetchAllProducts = async () => {
        const first = await listProducts(token, 1, {});
        const all: ProductRecord[] = [...first.items];
        let page = 2;
        while (page <= first.lastPage) {
          const next = await listProducts(token, page, {});
          all.push(...next.items);
          page++;
        }
        return all;
      };

      const fetchAllSpareParts = async () => {
        const first = await listSpareParts(token, 1, {});
        const all: SparePartRecord[] = [...first.items];
        let page = 2;
        while (page <= first.lastPage) {
          const next = await listSpareParts(token, page, {});
          all.push(...next.items);
          page++;
        }
        return all;
      };

      const [products, spareParts] = await Promise.all([
        fetchAllProducts(),
        fetchAllSpareParts(),
      ]);

      setBulkCatalog({ products, spareParts });
      setBulkCatalogLoaded(true);
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setIsBulkLoading(false);
    }
  }, [bulkCatalogLoaded, isBulkLoading]);

  const toggleLineInclusion = useCallback((type: CountItemType, record: ProductRecord | SparePartRecord, include: boolean) => {
    const key = lineKey(type, record.id);
    if (include) {
      setLines((prev) => {
        if (prev.some((l) => lineKey(l.type, l.id) === key)) return prev;
        return [recordToLine(type, record, record.stock_quantity), ...prev]; // Start with systemQty
      });
      touchLine(type, record.id);
    } else {
      removeLine(type, record.id);
    }
  }, [removeLine, touchLine]);

  const updateLineFromBulk = useCallback((type: CountItemType, record: ProductRecord | SparePartRecord, value: number) => {
    const key = lineKey(type, record.id);
    const next = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
    
    setLines((prev) => {
      const exists = prev.some((l) => lineKey(l.type, l.id) === key);
      if (exists) {
        return prev.map((line) =>
          lineKey(line.type, line.id) === key ? { ...line, counted: next } : line
        );
      } else {
        return [{ ...recordToLine(type, record, next) }, ...prev];
      }
    });
    touchLine(type, record.id);
    syncLastScanCounted(type, record.id, next);
  }, [syncLastScanCounted, touchLine]);

  return {
    scanInputRef,
    hydrated,
    lines,
    scanValue,
    setScanValue,
    setScanError,
    scanBusy,
    scanError,
    lastScan,
    lastTouchedKey,
    restoredAt,
    dismissRestoreNotice,
    pickerType,
    setPickerType,
    exporting,
    exportError,
    clearConfirmOpen,
    setClearConfirmOpen,
    listTab,
    setListTab,
    listSearch,
    setListSearch,
    summary,
    workflowStep,
    visibleLines,
    listTabOptions,
    handleScan,
    handlePickerAdd,
    updateCounted,
    setToSystemQty,
    removeLine,
    clearAll,
    handleExport,
    // ── NEW ──
    sortKey,
    setSortKey,
    sortOptions,
    scanHistory,
    refreshing,
    refreshError,
    refreshSystemStock,
    batchConfirmOpen,
    setBatchConfirmOpen,
    setAllToSystemQty,
    resetAllCounted,
    removeAllMatches,
    rescanFromHistory,
    // ── NEW: Bulk mode ──
    countMode,
    setCountMode,
    bulkCatalog,
    isBulkLoading,
    loadBulkCatalog,
    toggleLineInclusion,
    updateLineFromBulk,
    applyConfirmOpen,
    setApplyConfirmOpen,
    applying,
    applyError,
    applyDiscrepancies,
  };
}
