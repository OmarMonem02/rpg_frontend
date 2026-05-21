"use client";

import { SUPPORTED_PRICING_CURRENCIES } from "@/lib/currencies";
import {
  ActionButton,
  FilterBar,
  InputGroup,
  InlineMessage,
  PaginationControls,
  SurfaceCard,
} from "@/components/ops-ui";
import type { BrandRecord, ProductCategoryRecord, SparePartCategoryRecord } from "@/lib/crud-api";
import type { BulkInventoryListItem } from "./types";

type BulkEditSelectStepProps = {
  search: string;
  setSearch: (v: string) => void;
  brandId: string;
  setBrandId: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  brands: BrandRecord[];
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
  search,
  setSearch,
  brandId,
  setBrandId,
  categoryId,
  setCategoryId,
  currency,
  setCurrency,
  brands,
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
  return (
    <div className="space-y-4 animate-fade-in">
      <SurfaceCard>
        <FilterBar className="md:grid-cols-12">
          <InputGroup label="Search" className="md:col-span-3">
            <input
              type="text"
              placeholder="Name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input-base py-2 text-sm"
            />
          </InputGroup>
          <InputGroup label="Brand" className="md:col-span-3">
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="form-input-base py-2 text-sm"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </InputGroup>
          <InputGroup label="Category" className="md:col-span-3">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="form-input-base py-2 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </InputGroup>
          <InputGroup label="Currency" className="md:col-span-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="form-input-base py-2 text-sm"
            >
              <option value="all">All currencies</option>
              {SUPPORTED_PRICING_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </InputGroup>
        </FilterBar>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-caps">
              {selectedCount} selected
            </span>
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={pageAllSelected && items.length > 0}
                    onChange={onTogglePageAll}
                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Item
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  SKU
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Currency
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Sale
                </th>
                <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                    Loading items…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                    No items match your filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="data-row">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => onToggleId(item.id)}
                        className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/20"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">{item.name}</td>
                    <td className="px-4 py-3 mono-data text-on-surface-variant">{item.sku}</td>
                    <td className="px-4 py-3 mono-data">{item.currency_pricing}</td>
                    <td className="px-4 py-3 mono-data">{item.sale_price}</td>
                    <td className="px-4 py-3 mono-data">{item.stock_quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
