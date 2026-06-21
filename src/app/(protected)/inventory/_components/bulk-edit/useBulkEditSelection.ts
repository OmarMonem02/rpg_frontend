"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { fetchAllPages } from "@/lib/crud-api";
import type { CatalogListFilters } from "@/lib/crud-api";
import type { BulkInventoryListItem } from "./types";
import type { BulkEditEntityConfig } from "./types";

export function useBulkEditSelection(
  config: BulkEditEntityConfig,
  filters: CatalogListFilters,
) {
  const [items, setItems] = useState<BulkInventoryListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectAllFilteredLoading, setSelectAllFilteredLoading] = useState(false);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const result = await config.listItems(token, page, filters);
      setItems(result.items);
      setTotalPages(result.lastPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [config, page, filters]);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const toggleId = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageAll = () => {
    const pageIds = items.map((i) => i.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllFiltered = async () => {
    try {
      setSelectAllFilteredLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const all = await fetchAllPages<BulkInventoryListItem>((p) =>
        config.listItems(token, p, filters),
      );
      setSelectedIds(new Set(all.map((i) => i.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select all items");
    } finally {
      setSelectAllFilteredLoading(false);
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const pageAllSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i.id));

  return {
    items,
    page,
    setPage,
    totalPages,
    loading,
    error,
    selectedIds,
    selectedCount: selectedIds.size,
    toggleId,
    togglePageAll,
    pageAllSelected,
    selectAllFiltered,
    selectAllFilteredLoading,
    clearSelection,
    reload: loadPage,
  };
}
