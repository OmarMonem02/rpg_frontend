"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { ActionButton } from "@/components/ops-ui";

type CatalogType = "products" | "spare_parts" | "bikes" | "maintenance_services";

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
  currency: "EGP" | "USD";
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
  blueprintId,
}: CatalogPickerModalProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({
    search: "",
    priceMin: 0,
    priceMax: 100000,
    currency: "EGP",
  });

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategoryRecord[]>([]);
  const [sparePartCategories, setSparePartCategories] = useState<SparePartCategoryRecord[]>([]);
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
    ]
  );

  // Load filter options (brands, categories, sectors)
  const loadFilterOptions = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      if (catalogType === "products") {
        const [brandsRes, categoriesRes] = await Promise.all([
          listBrands(token, 1, "products"),
          listProductCategories(token, 1),
        ]);
        setBrands(brandsRes.items);
        setProductCategories(categoriesRes.items);
      } else if (catalogType === "spare_parts") {
        const [brandsRes, categoriesRes] = await Promise.all([
          listBrands(token, 1, "spare_parts"),
          listSparePartCategories(token, 1),
        ]);
        setBrands(brandsRes.items);
        setSparePartCategories(categoriesRes.items);
      } else if (catalogType === "bikes") {
        const brandsRes = await listBrands(token, 1, "bikes");
        setBrands(brandsRes.items);
      } else if (catalogType === "maintenance_services") {
        const sectorsRes = await listMaintenanceServiceSectors(token, 1);
        setSectors(sectorsRes.items);
      }
    } catch (err) {
      console.error("Failed to load filter options:", err);
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
      setError(
        err instanceof Error ? err.message : `Failed to load ${catalogType}`
      );
    } finally {
      setLoading(false);
    }
  }, [catalogType, page, memoizedFilters]);

  useEffect(() => {
    if (isOpen) {
      loadFilterOptions();
    }
  }, [isOpen, catalogType]);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, catalogType, page, memoizedFilters]);

  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set(selectedIds));
      setPage(1);
    } else {
      setSelectedItemIds(new Set());
    }
  }, [isOpen]);

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
    const selectedItems = items.filter((item) =>
      selectedItemIds.has(item.id)
    );
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

  if (!isOpen) return null;

  const getItemPrice = (item: CatalogItem): number => {
    if ("sale_price" in item) return item.sale_price;
    if ("service_price" in item) return item.service_price;
    return 0;
  };

  const getItemName = (item: CatalogItem): string => {
    if ("name" in item) return item.name;
    return `Item ${item.id}`;
  };

  return (
    <div className="form-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4 py-5 ">
      <div className="form-modal-shell w-full max-w-4xl max-h-90vh rounded-2xl flex flex-col overflow-hidden animate-app-shell-enter">
        {/* Header */}
        <div className="border-b border-outline-variant/15 bg-surface-container-lowest px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-600 text-on-surface mb-1">
              {catalogType === "products" && "Add Products"}
              {catalogType === "spare_parts" && "Add Spare Parts"}
              {catalogType === "bikes" && "Add Bikes For Sale"}
              {catalogType === "maintenance_services" && "Add Maintenance Services"}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Select items to add to your sale
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-2"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="bg-surface px-6 py-4 border-b border-outline-variant/15">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="form-input-base"
            />

            {/* Brand Filter */}
            {brands.length > 0 && (
              <select
                value={filters.brandId || ""}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    brandId: e.target.value ? Number(e.target.value) : undefined,
                  });
                  setPage(1);
                }}
                className="form-input-base"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            )}

            {/* Category Filter */}
            {productCategories.length > 0 && (
              <select
                value={filters.categoryId || ""}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    categoryId: e.target.value ? Number(e.target.value) : undefined,
                  });
                  setPage(1);
                }}
                className="form-input-base"
              >
                <option value="">All Categories</option>
                {productCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            {/* Spare Part Category Filter */}
            {sparePartCategories.length > 0 && (
              <select
                value={filters.categoryId || ""}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    categoryId: e.target.value ? Number(e.target.value) : undefined,
                  });
                  setPage(1);
                }}
                className="form-input-base"
              >
                <option value="">All Categories</option>
                {sparePartCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sector Filter */}
            {sectors.length > 0 && (
              <select
                value={filters.sectorId || ""}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    sectorId: e.target.value ? Number(e.target.value) : undefined,
                  });
                  setPage(1);
                }}
                className="form-input-base"
              >
                <option value="">All Sectors</option>
                {sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            )}

            {/* Currency Filter */}
            <select
              value={filters.currency}
              onChange={(e) => {
                setFilters({
                  ...filters,
                  currency: e.target.value as "EGP" | "USD",
                });
                setPage(1);
              }}
              className="form-input-base"
            >
              <option value="">All</option>
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-on-surface-variant">Loading...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-error/10 border border-error/30 p-4">
              <p className="text-error text-sm">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-on-surface-variant">No items found</p>
            </div>
          ) : (
            <div className="space-y-2 scrollbar-thin scrollbar-thumb-outline-variant/30 scrollbar-track-transparent overflow-y-auto h-80">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => handleToggleItem(item.id)}
                    className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-on-surface text-sm">
                      {getItemName(item)}
                    </p>
                    {catalogType === "spare_parts" && "sku" in item && (
                      <p className="text-xs text-on-surface-variant">
                        SKU: {item.sku} - Part Num: {item.part_number} - Stock: {item.stock_quantity} - Brand: {brands.find((b) => b.id === item.brand_id)?.name || item.brand_id} - Margine Discount: {item.max_discount_value} {item.max_discount_type === "percentage" ? "%" : item.currency_pricing}
                      </p>
                    )}
                    {catalogType === "products" && "sku" in item && (
                      <p className="text-xs text-on-surface-variant">
                        SKU: {item.sku} - Part Num: {item.part_number} - Stock: {item.stock_quantity} - Brand: {brands.find((b) => b.id === item.brand_id)?.name || item.brand_id} - Margine Discount: {item.max_discount_value} {item.max_discount_type === "percentage" ? "%" : item.currency_pricing}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary text-sm">
                      {getItemPrice(item)} {("currency_pricing" in item && item.currency_pricing) || filters.currency}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-outline-variant/15 px-6 py-3 flex items-center justify-between bg-surface-container-lowest">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-on-surface transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-on-surface transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-outline-variant/15 bg-surface-container-lowest px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 rounded-lg border border-outline-variant/25 hover:border-outline-variant/45 text-on-surface text-sm font-medium transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-2 rounded-lg border border-outline-variant/25 hover:border-outline-variant/45 text-on-surface text-sm font-medium transition-colors"
            >
              Deselect All
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-container text-on-surface text-sm font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedItemIds.size === 0}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary text-sm font-medium transition-colors"
            >
              Add Selected ({selectedItemIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
