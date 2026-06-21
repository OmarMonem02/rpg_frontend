"use client";

import {
  ActionButton,
  InlineMessage,
  PaginationControls,
  SurfaceCard,
} from "@/components/ops-ui";
import { ActiveFilterChips } from "@/components/inventory/ActiveFilterChips";
import { InventoryModuleFilters } from "@/components/inventory/InventoryModuleFilters";
import type { EntityFilters } from "@/hooks/useEntityFilters";
import { buildActiveFilterChips } from "@/lib/inventory-filter-utils";
import type { InventoryModuleId } from "@/lib/inventory-filter-config";
import type { BrandRecord, ProductCategoryRecord, SparePartCategoryRecord } from "@/lib/crud-api";
import { useMemo } from "react";
import { BulkEditCatalogTable } from "./BulkEditCatalogTable";
import type { BulkEditEntity, BulkInventoryListItem } from "./types";

type FilterSetters = {
  filters: EntityFilters;
  setSearch: (v: string) => void;
  setCategory: (v: number | "") => void;
  setBrand: (v: number | "") => void;
  setPriceMin: (v: number | "") => void;
  setPriceMax: (v: number | "") => void;
  setCurrency: (v: string) => void;
  setBikeCompatibility: (v: {
    bike_brand_id?: number;
    bike_model?: string;
    bike_year?: number;
  }) => void;
  setTags: (v: string[]) => void;
  setLowStock: (v: boolean) => void;
  setFilter: <K extends keyof EntityFilters>(key: K, value: EntityFilters[K]) => void;
  resetFilters: () => void;
};

type BulkEditSelectStepProps = FilterSetters & {
  moduleId: InventoryModuleId;
  entity: BulkEditEntity;
  brands: BrandRecord[];
  bikeBrands: BrandRecord[];
  categories: (ProductCategoryRecord | SparePartCategoryRecord)[];
  items: BulkInventoryListItem[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedIds: Set<number>;
  selectedCount: number;
  onToggleId: (id: number) => void;
  onTogglePageAll: () => void;
  pageAllSelected: boolean;
  onSelectAllFiltered: () => void;
  selectAllFilteredLoading: boolean;
  onClearSelection: () => void;
  onNext: () => void;
};

export function BulkEditSelectStep({
  moduleId,
  entity,
  filters,
  setSearch,
  setCategory,
  setBrand,
  setPriceMin,
  setPriceMax,
  setCurrency,
  setBikeCompatibility,
  setTags,
  setLowStock,
  setFilter,
  resetFilters,
  brands,
  bikeBrands,
  categories,
  items,
  loading,
  error,
  page,
  totalPages,
  onPageChange,
  selectedIds,
  selectedCount,
  onToggleId,
  onTogglePageAll,
  pageAllSelected,
  onSelectAllFiltered,
  selectAllFilteredLoading,
  onClearSelection,
  onNext,
}: BulkEditSelectStepProps) {
  const filterChips = useMemo(
    () =>
      buildActiveFilterChips(filters, {
        onClear: (key) => {
          if (key === "bike_compat") {
            setBikeCompatibility({});
            return;
          }
          if (key === "price_min" || key === "price_max") {
            setPriceMin("");
            setPriceMax("");
            return;
          }
          setFilter(key as keyof typeof filters, undefined);
        },
        selectOptions: {
          categories: categories.map((c) => ({ value: c.id, label: c.name })),
          brands: brands.map((b) => ({ value: b.id, label: b.name })),
          bikeBrands: bikeBrands.map((b) => ({ value: b.id, label: b.name })),
        },
      }),
    [
      filters,
      categories,
      brands,
      bikeBrands,
      setFilter,
      setBikeCompatibility,
      setPriceMin,
      setPriceMax,
    ],
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <InventoryModuleFilters
        module={moduleId}
        filters={filters}
        bikeBrands={bikeBrands}
        loading={loading}
        setters={{
          setSearch,
          setCategory,
          setBrand,
          setBlueprint: () => {},
          setSector: () => {},
          setStatus: () => {},
          setType: () => {},
          setPriceMin,
          setPriceMax,
          setCurrency,
          setLowStock,
          setTags,
          setBikeCompatibility,
          setFilter,
        }}
        options={{
          categories: categories.map((c) => ({ value: c.id, label: c.name })),
          brands: brands.map((b) => ({ value: b.id, label: b.name })),
        }}
      />

      <ActiveFilterChips chips={filterChips} onClearAll={resetFilters} />

      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-caps">{selectedCount} selected</span>
            <ActionButton variant="ghost" onClick={onTogglePageAll} disabled={items.length === 0}>
              {pageAllSelected ? "Deselect page" : "Select page"}
            </ActionButton>
            <ActionButton
              variant="ghost"
              onClick={onSelectAllFiltered}
              disabled={selectAllFilteredLoading}
            >
              {selectAllFilteredLoading ? "Loading…" : "Select all matching filters"}
            </ActionButton>
            {selectedCount > 0 ? (
              <ActionButton variant="ghost" onClick={onClearSelection}>
                Clear
              </ActionButton>
            ) : null}
          </div>
          <ActionButton tone="primary" onClick={onNext} disabled={selectedCount === 0}>
            Continue
          </ActionButton>
        </div>

        {error ? (
          <div className="p-4">
            <InlineMessage tone="danger">{error}</InlineMessage>
          </div>
        ) : null}

        <BulkEditCatalogTable
          entity={entity}
          items={items}
          loading={loading}
          categories={categories}
          brands={brands}
          selectedIds={selectedIds}
          onToggleId={onToggleId}
          onTogglePageAll={onTogglePageAll}
          pageAllSelected={pageAllSelected}
        />

        <div className="border-t border-outline-variant/10 px-4 py-3">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrevious={() => onPageChange(Math.max(1, page - 1))}
            onNext={() => onPageChange(Math.min(totalPages, page + 1))}
          />
        </div>
      </SurfaceCard>
    </div>
  );
}
