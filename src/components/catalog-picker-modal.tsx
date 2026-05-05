"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { getAuthToken } from "@/lib/auth-session";
import {
  listProducts,
  listSpareParts,
  listBikeForSale,
  listMaintenanceServices,
  listBrands,
  listProductCategories,
  listSparePartCategories,
  listMaintenanceServiceSectors,
  type ProductRecord,
  type SparePartRecord,
  type BikeRecord,
  type MaintenanceServiceRecord,
  type BrandRecord,
  type ProductCategoryRecord,
  type SparePartCategoryRecord,
  type MaintenanceServiceSectorRecord,
} from "@/lib/crud-api";
import { ActionButton, StatusBadge } from "@/components/ops-ui";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

type CatalogType =
  | "products"
  | "spare_parts"
  | "bikes"
  | "maintenance_services";

type CatalogItem =
  | ProductRecord
  | SparePartRecord
  | BikeRecord
  | MaintenanceServiceRecord;

type FilterConfig = {
  search: string;
  brandId?: number;
  categoryId?: number;
  sectorId?: number;
  priceMin: number;
  priceMax: number;
  currency: "" | "EGP" | "USD";
  lowStock?: boolean;
  blueprintId?: number;
};

interface CatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogType: CatalogType;
  onAddItems: (items: CatalogItem[]) => void;
  selectedIds?: number[];
  blueprintId?: number;
}

export function CatalogPickerModal({
  isOpen,
  onClose,
  catalogType,
  onAddItems,
  selectedIds = [],
}: CatalogPickerModalProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mounted, setMounted] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({
    search: "",
    priceMin: 0,
    priceMax: 100000,
    currency: "",
  });

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [productCategories, setProductCategories] = useState<
    ProductCategoryRecord[]
  >([]);
  const [sparePartCategories, setSparePartCategories] = useState<
    SparePartCategoryRecord[]
  >([]);
  const [sectors, setSectors] = useState<MaintenanceServiceSectorRecord[]>([]);

  // Memoize filters to prevent unnecessary callback recreation
  const memoizedFilters = useMemo(
    () => filters,
    [
      filters.search,
      filters.brandId,
      filters.categoryId,
      filters.sectorId,
      filters.priceMin,
      filters.priceMax,
      filters.currency,
      filters.lowStock,
      filters.blueprintId,
    ],
  );

  // Load filter options (brands, categories, sectors)
  const loadFilterOptions = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      if (catalogType === "products") {
        const [brandsRes, categoriesRes] = await Promise.all([
          listBrands(token, 1, { type: "products" }),
          listProductCategories(token, 1),
        ]);
        setBrands(brandsRes.items);
        setProductCategories(categoriesRes.items);
      } else if (catalogType === "spare_parts") {
        const [brandsRes, categoriesRes] = await Promise.all([
          listBrands(token, 1, { type: "spare_parts" }),
          listSparePartCategories(token, 1),
        ]);
        setBrands(brandsRes.items);
        setSparePartCategories(categoriesRes.items);
      } else if (catalogType === "bikes") {
        const brandsRes = await listBrands(token, 1, { type: "bikes" });
        setBrands(brandsRes.items);
      } else if (catalogType === "maintenance_services") {
        const sectorsRes = await listMaintenanceServiceSectors(token, 1);
        setSectors(sectorsRes.items);
      }
    } catch (err) {
      console.error("Failed to load filter options:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to load filters";
      if (errorMsg.includes("Permission denied") || errorMsg.includes("not authorized")) {
        setError(`You don't have permission to access ${catalogType}. Contact your administrator.`);
      }
    }
  }, [catalogType]);

  // Load catalog items
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      let result;

      if (catalogType === "products") {
        result = await listProducts(token, page, {
          search: filters.search || undefined,
          brand_id: filters.brandId,
          category_id: filters.categoryId,
          currency: filters.currency,
        });
      } else if (catalogType === "spare_parts") {
        result = await listSpareParts(token, page, {
          search: filters.search || undefined,
          brand_id: filters.brandId,
          category_id: filters.categoryId,
          currency: filters.currency,
          low_stock: filters.lowStock,
        });
      } else if (catalogType === "bikes") {
        result = await listBikeForSale(token, page, {
          search: filters.search || undefined,
          brand_id: filters.brandId,
          currency: filters.currency,
        });
      } else if (catalogType === "maintenance_services") {
        result = await listMaintenanceServices(token, page, {
          search: filters.search || undefined,
          sector_id: filters.sectorId,
          currency: filters.currency,
        });
      }

      if (result) {
        setItems(result.items);
        setTotalPages(result.lastPage);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to load ${catalogType}`;
      if (errorMsg.includes("Permission denied") || errorMsg.includes("not authorized")) {
        setError(`Permission denied. You don't have access to this resource. Contact your administrator.`);
      } else if (errorMsg.includes("Authentication required")) {
        setError("Your session expired. Please refresh and try again.");
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [catalogType, page, memoizedFilters]);

  useEffect(() => {
    if (isOpen) {
      loadFilterOptions();
    }
  }, [isOpen, catalogType, loadFilterOptions]);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, catalogType, page, memoizedFilters, loadItems]);

  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set(selectedIds));
      setPage(1);
    } else {
      setSelectedItemIds(new Set());
    }
  }, [isOpen, JSON.stringify(selectedIds)]);

  const handleToggleItem = (id: number) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItemIds(newSelected);
  };

  const handleAddSelected = () => {
    const selectedItems = items.filter((item) => selectedItemIds.has(item.id));
    if (selectedItems.length > 0) {
      onAddItems(selectedItems);
      setSelectedItemIds(new Set()); // Keep modal open, clear selection
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(items.map((item) => item.id));
    setSelectedItemIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const getItemPrice = (item: CatalogItem): number => {
    if ("sale_price" in item) return item.sale_price;
    if ("service_price" in item) return item.service_price;
    return 0;
  };

  const getItemName = (item: CatalogItem): string => {
    if ("name" in item) return item.name;
    return `Item ${item.id}`;
  };

  return createPortal(
    <div className="form-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-3 transition-opacity">
      <div className="form-modal-shell max-w-3xl w-full max-h-[80vh] flex flex-col animate-scale-in overflow-hidden rounded-[1.5rem] relative">
        {/* Header */}
        <div className="relative border-b border-outline-variant/15 bg-surface-container-low px-4 sm:px-6 py-4 sm:py-5 flex items-start sm:items-center justify-between shrink-0">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex-1 pr-4">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-on-surface tracking-tight flex items-center gap-2">
              <span className="flex shrink-0 items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </span>
              {catalogType === "products" && "Browse Products"}
              {catalogType === "spare_parts" && "Browse Spare Parts"}
              {catalogType === "bikes" && "Browse Bikes"}
              {catalogType === "maintenance_services" && "Browse Services"}
            </h2>
            <p className="text-sm font-medium text-on-surface-variant mt-1.5 ml-10">
              Select items from the catalog to add to your list
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-surface px-4 sm:px-6 py-4 border-b border-outline-variant/10 shadow-sm z-10 relative shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative col-span-2 lg:col-span-2">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
                className="form-input-base pl-10 w-full"
              />
            </div>

            {/* Brand Filter */}
            {brands.length > 0 && (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60">
                  <FunnelIcon className="w-4 h-4" />
                </span>
                <select
                  value={filters.brandId || ""}
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      brandId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    });
                    setPage(1);
                  }}
                  className="form-input-base pl-9 w-full appearance-none pr-8"
                >
                  <option value="">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant bg-surface rounded-r-xl border-y border-r border-transparent">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            )}

            {/* Category Filter */}
            {productCategories.length > 0 && (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60">
                  <FunnelIcon className="w-4 h-4" />
                </span>
                <select
                  value={filters.categoryId || ""}
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      categoryId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    });
                    setPage(1);
                  }}
                  className="form-input-base pl-9 w-full appearance-none pr-8"
                >
                  <option value="">All Categories</option>
                  {productCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant bg-surface rounded-r-xl">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            )}

            {/* Spare Part Category Filter */}
            {sparePartCategories.length > 0 && (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60">
                  <FunnelIcon className="w-4 h-4" />
                </span>
                <select
                  value={filters.categoryId || ""}
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      categoryId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    });
                    setPage(1);
                  }}
                  className="form-input-base pl-9 w-full appearance-none pr-8"
                >
                  <option value="">All Categories</option>
                  {sparePartCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant bg-surface rounded-r-xl">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            )}

            {/* Sector Filter */}
            {sectors.length > 0 && (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant/60">
                  <FunnelIcon className="w-4 h-4" />
                </span>
                <select
                  value={filters.sectorId || ""}
                  onChange={(e) => {
                    setFilters({
                      ...filters,
                      sectorId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    });
                    setPage(1);
                  }}
                  className="form-input-base pl-9 w-full appearance-none pr-8"
                >
                  <option value="">All Sectors</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant bg-surface rounded-r-xl">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            )}

            {/* Currency Filter */}
            <div className="relative">
              <select
                value={filters.currency}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    currency: e.target.value as "" | "EGP" | "USD",
                  });
                  setPage(1);
                }}
                className="form-input-base w-full appearance-none pr-8 bg-surface-container/50 font-medium"
              >
                <option value="">Any Currency</option>
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-on-surface-variant bg-surface-container/50 rounded-r-xl">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto bg-surface-container-low/30 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 h-64 gap-3 animate-pulse text-primary">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-semibold tracking-wide text-on-surface-variant uppercase">
                Loading Catalog...
              </p>
            </div>
          ) : error ? (
            <div className="m-6 rounded-2xl bg-error-container border border-error/30 p-5 flex gap-3 shadow-sm">
              <svg
                className="w-5 h-5 text-on-error-container shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-on-error-container font-medium text-sm">
                {error}
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 text-on-surface-variant/50">
                <MagnifyingGlassIcon className="w-8 h-8" />
              </div>
              <h3 className="font-display text-lg font-semibold text-on-surface">
                No items found
              </h3>
              <p className="text-sm text-on-surface-variant mt-1.5 max-w-sm">
                Try adjusting your search filters or browse a different catalog
                type to find what you&apos;re looking for.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
              {items.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`group relative cursor-pointer rounded-2xl border p-3 transition-all duration-150 active:scale-[0.98] ${
                      isSelected
                        ? "bg-primary/6 border-primary ring-2 ring-primary shadow-sm"
                        : "border-outline-variant/15 bg-surface-container-lowest hover:border-primary/30 hover:bg-primary/4 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      {/* Checkbox */}
                      <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded border-2 border-outline-variant group-hover:border-primary transition-colors bg-surface-container-lowest relative">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(item.id)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-primary pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-semibold text-sm text-on-surface truncate">
                          {getItemName(item)}
                        </h4>

                        {(catalogType === "spare_parts" ||
                          catalogType === "products") &&
                          "sku" in item && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  SKU
                                </span>{" "}
                                {item.sku}
                              </span>
                              <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  Part#
                                </span>{" "}
                                {item.part_number}
                              </span>
                              <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  Stock
                                </span>
                                <StatusBadge tone={(item.stock_quantity ?? 0) <= 0 ? "danger" : (item.stock_quantity ?? 0) <= 5 ? "warning" : "success"}>
                                  {item.stock_quantity ?? 0}
                                </StatusBadge>
                              </span>
                              {item.brand_id && (
                                <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                                  <span className="label-caps mr-1 text-on-surface-variant/60">
                                    Brand
                                  </span>{" "}
                                  {brands.find((b) => b.id === item.brand_id)
                                    ?.name || item.brand_id}
                                </span>
                              )}
                            </div>
                          )}
                      </div>

                      {/* Price Tag */}
                      <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-outline-variant/10 sm:border-0">
                        <div className="label-caps sm:hidden">
                          Price
                        </div>
                        <div className="bg-surface-container-highest/20 px-3 py-1.5 rounded-lg border border-outline-variant/10">
                          <p className="mono-data text-primary font-bold text-base">
                            {getItemPrice(item).toLocaleString()}{" "}
                            <span className="text-xs uppercase">
                              {("currency_pricing" in item &&
                                item.currency_pricing) ||
                                filters.currency}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Header (Mobile only) / Overlay Footer */}
        {totalPages > 1 && (
          <div className="border-t border-outline-variant/15 px-6 py-3 flex items-center justify-between bg-surface-container shadow-[0_-4px_12px_rgba(0,0,0,0.02)] relative z-10 shrink-0">
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="bg-surface"
            >
              Previous
            </ActionButton>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Page {page} <span className="opacity-50">of</span> {totalPages}
            </span>
            <ActionButton
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="bg-surface"
            >
              Next
            </ActionButton>
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-outline-variant/15 bg-surface-container-lowest px-4 sm:px-6 py-4 sm:py-5 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10 shrink-0">
          <div className="grid grid-cols-2 sm:flex sm:gap-2 gap-3 w-full sm:w-auto">
            <ActionButton
              variant="ghost"
              onClick={handleSelectAll}
              className="px-3"
            >
              Select All
            </ActionButton>
            <ActionButton
              variant="ghost"
              onClick={handleDeselectAll}
              className="px-3"
              disabled={selectedItemIds.size === 0}
            >
              Clear
            </ActionButton>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:gap-3 gap-3 w-full sm:w-auto mb-1 sm:mb-0">
            <ActionButton
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </ActionButton>
            <ActionButton
              tone="primary"
              variant="filled"
              onClick={handleAddSelected}
              disabled={selectedItemIds.size === 0}
              className="flex-1 sm:flex-none shadow-md"
            >
              {selectedItemIds.size > 0
                ? `Add Selected (${selectedItemIds.size})`
                : "Add Selected"}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
