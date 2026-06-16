"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  listBikeBlueprints,
  type ProductRecord,
  type SparePartRecord,
  type BikeRecord,
  type BikeBlueprintRecord,
  type MaintenanceServiceRecord,
  type BrandRecord,
  type ProductCategoryRecord,
  type SparePartCategoryRecord,
  type MaintenanceServiceSectorRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import {
  formatCatalogPriceInEGP,
  SUPPORTED_PRICING_CURRENCIES,
  toPricingCurrency,
  type PricingCurrency,
} from "@/lib/currencies";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { ActionButton, SearchableSelect, StatusBadge } from "@/components/ops-ui";
import { BikeCompatibilityFilter } from "@/components/BikeCompatibilityFilter";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import {
  XMarkIcon,
  FunnelIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
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
  currency: "" | PricingCurrency;
  lowStock?: boolean;
  bike_brand_id?: number;
  bike_model?: string;
  bike_year?: number;
};

interface CatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogType: CatalogType;
  onAddItems: (items: CatalogItem[]) => void;
  selectedIds?: number[];
  blueprintId?: number;
}

function ItemThumbnail({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container text-on-surface-variant">
      {showImage ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <PhotoIcon className="h-5 w-5 opacity-70" aria-hidden title={name} />
      )}
    </div>
  );
}

export function CatalogPickerModal({
  isOpen,
  onClose,
  catalogType,
  onAddItems,
  selectedIds = [],
}: CatalogPickerModalProps) {
  const { rates } = useExchangeRates();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({
    search: "",
    priceMin: 0,
    priceMax: 100000,
    currency: "",
  });

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [bikeBrands, setBikeBrands] = useState<BrandRecord[]>([]);
  const [productCategories, setProductCategories] = useState<
    ProductCategoryRecord[]
  >([]);
  const [sparePartCategories, setSparePartCategories] = useState<
    SparePartCategoryRecord[]
  >([]);
  const [sectors, setSectors] = useState<MaintenanceServiceSectorRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);

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
      filters.bike_brand_id,
      filters.bike_model,
      filters.bike_year,
    ],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search.trim()) n++;
    if (filters.brandId != null) n++;
    if (filters.categoryId != null) n++;
    if (filters.sectorId != null) n++;
    if (filters.currency) n++;
    if (filters.lowStock) n++;
    if (
      filters.bike_brand_id != null ||
      (filters.bike_model && filters.bike_model.trim()) ||
      filters.bike_year != null
    )
      n++;
    return n;
  }, [
    filters.search,
    filters.brandId,
    filters.categoryId,
    filters.sectorId,
    filters.currency,
    filters.lowStock,
    filters.bike_brand_id,
    filters.bike_model,
    filters.bike_year,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearchDraft("");
    setFilters({
      search: "",
      priceMin: 0,
      priceMax: 100000,
      currency: "",
      brandId: undefined,
      categoryId: undefined,
      sectorId: undefined,
      lowStock: undefined,
      bike_brand_id: undefined,
      bike_model: undefined,
      bike_year: undefined,
    });
    setPage(1);
  }, []);

  // Debounce the search draft into the applied filter to avoid a request per keystroke
  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timer = window.setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchDraft }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, filters.search]);

  // Load filter options (brands, categories, sectors)
  const loadFilterOptions = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      if (catalogType === "products") {
        const [brandsRes, bikeBrandsRes, categoriesRes] = await Promise.all([
          fetchAllPages((p) => listBrands(token, p, { type: "products" })),
          fetchAllPages((p) => listBrands(token, p, { type: "bikes" })),
          fetchAllPages((p) => listProductCategories(token, p)),
        ]);
        setBrands(brandsRes);
        setBikeBrands(bikeBrandsRes);
        setProductCategories(categoriesRes);
        setBlueprints([]);
      } else if (catalogType === "spare_parts") {
        const [spBrandsRes, bikeBrandsRes, categoriesRes] = await Promise.all([
          fetchAllPages((p) => listBrands(token, p, { type: "spare_parts" })),
          fetchAllPages((p) => listBrands(token, p, { type: "bikes" })),
          listSparePartCategories(token, 1),
        ]);
        setBrands(spBrandsRes);
        setBikeBrands(bikeBrandsRes);
        setSparePartCategories(categoriesRes.items);
        setBlueprints([]);
      } else if (catalogType === "bikes") {
        const [brandsRes, blueprintsRes] = await Promise.all([
          fetchAllPages((p) => listBrands(token, p, { type: "bikes" })),
          fetchAllPages((p) => listBikeBlueprints(token, p, {})),
        ]);
        setBrands(brandsRes);
        setBlueprints(blueprintsRes);
        setBikeBrands([]);
      } else if (catalogType === "maintenance_services") {
        const sectorsRes = await fetchAllPages((p) =>
          listMaintenanceServiceSectors(token, p),
        );
        setSectors(sectorsRes);
        setBrands([]);
        setBikeBrands([]);
        setBlueprints([]);
      }
    } catch (err) {
      console.error("Failed to load filter options:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load filters";
      if (
        errorMsg.includes("Permission denied") ||
        errorMsg.includes("not authorized")
      ) {
        setError(
          `You don't have permission to access ${catalogType}. Contact your administrator.`,
        );
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
          bike_brand_id: filters.bike_brand_id,
          bike_model: filters.bike_model,
          bike_year: filters.bike_year,
        });
      } else if (catalogType === "spare_parts") {
        result = await listSpareParts(token, page, {
          search: filters.search || undefined,
          brand_id: filters.brandId,
          category_id: filters.categoryId,
          currency: filters.currency,
          low_stock: filters.lowStock,
          bike_brand_id: filters.bike_brand_id,
          bike_model: filters.bike_model,
          bike_year: filters.bike_year,
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
      const errorMsg =
        err instanceof Error ? err.message : `Failed to load ${catalogType}`;
      if (
        errorMsg.includes("Permission denied") ||
        errorMsg.includes("not authorized")
      ) {
        setError(
          `Permission denied. You don't have access to this resource. Contact your administrator.`,
        );
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

  useLiveDataRefresh(() => {
    if (isOpen) {
      return loadItems();
    }
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set(selectedIds));
      setPage(1);
      setFiltersExpanded(false);
      setSearchDraft(filters.search);
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

  // Escape to close, lock background scroll, and focus the close button on open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const insideDialog = active && dialogRef.current.contains(active);

        if (event.shiftKey) {
          if (!insideDialog || active === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (!insideDialog || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const getItemPrice = (item: CatalogItem): number => {
    if ("sale_price" in item) return item.sale_price;
    if ("service_price" in item) return item.service_price;
    return 0;
  };

  const getItemCurrency = (item: CatalogItem): PricingCurrency => {
    if ("sale_currency" in item) {
      return toPricingCurrency(item.sale_currency);
    }
    return toPricingCurrency(filters.currency || "EGP");
  };

  const getItemName = (item: CatalogItem): string => {
    if ("bike_blueprint_id" in item) {
      const blueprint = blueprints.find(
        (b) => b.id === item.bike_blueprint_id,
      );
      if (blueprint) {
        const brandName = brands.find((b) => b.id === blueprint.brand_id)?.name;
        const label = `${blueprint.model} ${blueprint.year}`;
        return brandName ? `${brandName} · ${label}` : label;
      }
      if (item.vin) return `Bike · ${item.vin}`;
      return `Bike #${item.id}`;
    }
    if ("name" in item) return item.name;
    return `Item #${(item as { id: number }).id}`;
  };

  const getItemImage = (item: CatalogItem): string | undefined => {
    if ("image" in item && item.image) return item.image;
    return undefined;
  };

  const getBikeStatusTone = (
    status: string,
  ): "default" | "primary" | "success" | "warning" | "danger" => {
    const toneMap: Record<
      string,
      "default" | "primary" | "success" | "warning" | "danger"
    > = {
      available: "success",
      sold: "default",
      maintenance: "warning",
      reserved: "primary",
    };
    return toneMap[status.toLowerCase()] ?? "default";
  };

  const getBikeStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      available: "Available",
      sold: "Sold",
      maintenance: "Under Maintenance",
      reserved: "Reserved",
    };
    return labels[status.toLowerCase()] ?? status;
  };

  const getProductStockBadge = (product: ProductRecord) => {
    if (product.stock_quantity <= 0) {
      return (
        <StatusBadge tone="danger">
          <span className="mono-data">0</span> Out
        </StatusBadge>
      );
    }
    if (product.stock_quantity <= product.low_stock_alarm) {
      return (
        <StatusBadge tone="warning">
          Low <span className="mono-data">{product.stock_quantity}</span>
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="success">
        In <span className="mono-data">{product.stock_quantity}</span>
      </StatusBadge>
    );
  };

  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedItemIds.has(item.id));

  return createPortal(
    <div className="form-modal-overlay fixed inset-0 z-[100] flex items-stretch justify-end transition-opacity">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close catalog picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Right Sidebar Drawer */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Catalog picker"
        className="form-modal-shell relative flex h-full max-h-[100dvh] min-h-0 w-full max-w-[820px] animate-in slide-in-from-right-8 flex-col overflow-hidden border-l border-outline-variant/15 bg-surface shadow-ambient sm:max-w-[860px] lg:max-w-[940px]"
      >
        {/* Header */}
        <div className="relative border-b border-outline-variant/15 bg-surface-container-low px-4 sm:px-6 py-4 sm:py-5 flex items-start sm:items-center justify-between shrink-0">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex-1 pr-4">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
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
              {selectedItemIds.size > 0 && (
                <span className="label-caps inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-primary">
                  {selectedItemIds.size} selected
                </span>
              )}
            </h2>
            <p className="text-sm font-medium text-on-surface-variant mt-1.5 ml-10">
              Select items from the catalog to add to your list
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close catalog picker"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filters — disclosure; facet panel scrolls independently */}
        <div className="relative z-10 shrink-0 border-b border-outline-variant/10 bg-surface shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
          <div className="flex flex-wrap items-stretch gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
            <button
              type="button"
              id="catalog-picker-filters-toggle"
              aria-expanded={filtersExpanded}
              aria-controls="catalog-picker-filters-panel"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-lowest/60 px-3 py-2 text-left shadow-sm transition-[border-color,background-color] hover:border-primary/35 hover:bg-primary/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/12">
                <FunnelIcon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-display text-sm font-bold tracking-tight text-on-surface sm:text-base">
                  Refine results
                </span>
                <span className="mt-0.5 line-clamp-2 text-caption leading-snug text-on-surface-variant sm:text-xs">
                  {filtersExpanded
                    ? "Filters below scroll separately from the catalog list."
                    : activeFilterCount > 0
                      ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active — expand to edit`
                      : "Collapsed — expand for search, facets, and currency"}
                </span>
              </span>
              {activeFilterCount > 0 ? (
                <span className="label-caps hidden shrink-0 items-center rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-primary sm:inline-flex">
                  {activeFilterCount}
                </span>
              ) : null}
              <ChevronDownIcon
                className={`h-5 w-5 shrink-0 text-on-surface-variant transition-transform duration-200 ease-out ${filtersExpanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex min-h-[44px] shrink-0 items-center rounded-xl border border-outline-variant/25 bg-surface px-3 text-xs font-semibold text-on-surface shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary sm:px-4"
              >
                Clear all
              </button>
            ) : null}
          </div>

          {filtersExpanded ? (
            <div
              id="catalog-picker-filters-panel"
              role="region"
              aria-labelledby="catalog-picker-filters-toggle"
              className="max-h-[min(50vh,26rem)] overflow-y-auto overscroll-y-contain scroll-smooth border-t border-outline-variant/10 px-4 py-3 [scrollbar-gutter:stable] sm:max-h-[min(56vh,32rem)] sm:px-6 sm:py-4"
            >
              <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/35 p-4 sm:p-5">
                {(catalogType === "products" || catalogType === "spare_parts") &&
                  bikeBrands.length > 0 && (
                  <div className="mb-4 rounded-xl border border-outline-variant/15 bg-surface-container-low/60 p-4 sm:rounded-2xl sm:p-4">
                    <p className="label-caps mb-3 text-on-surface-variant">
                      Compatible bike
                    </p>
                    <BikeCompatibilityFilter
                      brands={bikeBrands}
                      selectedBrandId={filters.bike_brand_id}
                      selectedModel={filters.bike_model}
                      selectedYear={filters.bike_year}
                      isLoading={loading}
                      onFilterChange={(compat) => {
                        setFilters({
                          ...filters,
                          bike_brand_id: compat.bike_brand_id,
                          bike_model: compat.bike_model,
                          bike_year: compat.bike_year,
                        });
                        setPage(1);
                      }}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="catalog-picker-search"
                      className="label-caps mb-1.5 block text-on-surface-variant"
                    >
                      Search
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant/55">
                        <MagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                      </span>
                      <input
                        id="catalog-picker-search"
                        type="search"
                        autoComplete="off"
                        placeholder="Name, SKU, part number…"
                        value={searchDraft}
                        onChange={(e) => setSearchDraft(e.target.value)}
                        className="form-input-base w-full pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {brands.length > 0 && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="catalog-picker-brand"
                          className="label-caps text-on-surface-variant"
                        >
                          Brand
                        </label>
                        <SearchableSelect
                          id="catalog-picker-brand"
                          value={filters.brandId || ""}
                          onChange={(value) => {
                            setFilters({
                              ...filters,
                              brandId: value ? Number(value) : undefined,
                            });
                            setPage(1);
                          }}
                          options={[
                            { value: "", label: "All brands" },
                            ...brands.map((brand) => ({
                              value: brand.id,
                              label: brand.name,
                            })),
                          ]}
                          className="form-input-base w-full bg-surface-container-lowest/80 py-2.5 font-medium"
                        />
                      </div>
                    )}

                    {productCategories.length > 0 && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="catalog-picker-product-category"
                          className="label-caps text-on-surface-variant"
                        >
                          Category
                        </label>
                        <SearchableSelect
                          id="catalog-picker-product-category"
                          value={filters.categoryId || ""}
                          onChange={(value) => {
                            setFilters({
                              ...filters,
                              categoryId: value ? Number(value) : undefined,
                            });
                            setPage(1);
                          }}
                          options={[
                            { value: "", label: "All categories" },
                            ...productCategories.map((cat) => ({
                              value: cat.id,
                              label: cat.name,
                            })),
                          ]}
                          className="form-input-base w-full bg-surface-container-lowest/80 py-2.5 font-medium"
                        />
                      </div>
                    )}

                    {sparePartCategories.length > 0 && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="catalog-picker-spare-category"
                          className="label-caps text-on-surface-variant"
                        >
                          Category
                        </label>
                        <SearchableSelect
                          id="catalog-picker-spare-category"
                          value={filters.categoryId || ""}
                          onChange={(value) => {
                            setFilters({
                              ...filters,
                              categoryId: value ? Number(value) : undefined,
                            });
                            setPage(1);
                          }}
                          options={[
                            { value: "", label: "All categories" },
                            ...sparePartCategories.map((cat) => ({
                              value: cat.id,
                              label: cat.name,
                            })),
                          ]}
                          className="form-input-base w-full bg-surface-container-lowest/80 py-2.5 font-medium"
                        />
                      </div>
                    )}

                    {sectors.length > 0 && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="catalog-picker-sector"
                          className="label-caps text-on-surface-variant"
                        >
                          Sector
                        </label>
                        <SearchableSelect
                          id="catalog-picker-sector"
                          value={filters.sectorId || ""}
                          onChange={(value) => {
                            setFilters({
                              ...filters,
                              sectorId: value ? Number(value) : undefined,
                            });
                            setPage(1);
                          }}
                          options={[
                            { value: "", label: "All sectors" },
                            ...sectors.map((sector) => ({
                              value: sector.id,
                              label: sector.name,
                            })),
                          ]}
                          className="form-input-base w-full bg-surface-container-lowest/80 py-2.5 font-medium"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label
                        htmlFor="catalog-picker-currency"
                        className="label-caps text-on-surface-variant"
                      >
                        Currency
                      </label>
                      <SearchableSelect
                        id="catalog-picker-currency"
                        value={filters.currency}
                        onChange={(value) => {
                          setFilters({
                            ...filters,
                            currency:
                              value === ""
                                ? ""
                                : (value as PricingCurrency),
                          });
                          setPage(1);
                        }}
                        options={[
                          { value: "", label: "Any currency" },
                          ...SUPPORTED_PRICING_CURRENCIES.map((code) => ({
                            value: code,
                            label: code,
                          })),
                        ]}
                        className="form-input-base w-full bg-surface-container-lowest/80 py-2.5 font-medium"
                      />
                    </div>
                  </div>

                  {catalogType === "spare_parts" ? (
                    <div className="flex flex-col gap-2 border-t border-outline-variant/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="label-caps text-on-surface-variant">Inventory</p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={filters.lowStock === true}
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            lowStock: prev.lowStock ? undefined : true,
                          }));
                          setPage(1);
                        }}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-all sm:w-auto ${filters.lowStock
                          ? "border-warning/40 bg-warning/10 text-on-surface shadow-sm ring-1 ring-warning/25"
                          : "border-outline-variant/20 bg-surface text-on-surface-variant hover:border-warning/35 hover:bg-warning/5 hover:text-on-surface"
                          }`}
                      >
                        <span
                          className={`flex h-2 w-2 shrink-0 rounded-full ${filters.lowStock ? "bg-warning" : "bg-outline-variant"
                            }`}
                          aria-hidden
                        />
                        Low stock only
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Results context bar */}
        {!loading && !error && items.length > 0 ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/10 bg-surface px-4 py-2 sm:px-6">
            <p className="label-caps text-on-surface-variant">
              {items.length} {items.length === 1 ? "item" : "items"}
              {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
              {activeFilterCount > 0 ? " · filtered" : ""}
            </p>
            {selectedItemIds.size > 0 ? (
              <span className="label-caps text-primary">
                {selectedItemIds.size} selected
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Items List */}
        <div className="relative flex min-h-0 w-full flex-1 flex-col scroll-smooth overflow-y-auto overscroll-y-contain bg-surface-container-low/30 [-webkit-overflow-scrolling:touch]">
          {loading ? (
            <div
              className="grid grid-cols-1 gap-2 p-4 pb-6"
              aria-busy="true"
              aria-label="Loading catalog"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-3"
                >
                  <div className="h-6 w-6 shrink-0 animate-pulse rounded border-2 border-outline-variant/30 bg-surface-container" />
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-surface-container" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-container" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-surface-container" />
                  </div>
                  <div className="h-7 w-20 shrink-0 animate-pulse rounded-lg bg-surface-container" />
                </div>
              ))}
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
                <MagnifyingGlassIcon className="h-8 w-8" aria-hidden />
              </div>
              <h3 className="font-display text-lg font-semibold text-on-surface">
                No items found
              </h3>
              <p className="text-sm text-on-surface-variant mt-1.5 max-w-sm">
                Try adjusting your search filters or browse a different catalog
                type to find what you&apos;re looking for.
              </p>
              {activeFilterCount > 0 ? (
                <ActionButton
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-4"
                >
                  Clear all filters
                </ActionButton>
              ) : null}
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-2 p-4 pb-6">
              {items.map((item, index) => {
                const isSelected = selectedItemIds.has(item.id);
                const isUniversalSparePart =
                  catalogType === "spare_parts" &&
                  "universal" in item &&
                  item.universal === true;
                return (
                  <label
                    key={item.id}
                    style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                    className={`group relative block w-full min-w-0 cursor-pointer rounded-2xl border p-3 transition-all duration-150 animate-fade-in active:scale-[0.98] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
                      isSelected
                        ? "bg-primary/6 border-primary ring-2 ring-primary shadow-sm"
                        : isUniversalSparePart
                          ? "border-outline-variant/15 border-primary/15 bg-primary-container/15 hover:border-primary/45 hover:bg-primary-container/50 hover:shadow-sm"
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
                      <ItemThumbnail
                        src={getItemImage(item)}
                        name={getItemName(item)}
                      />
                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <h4 className="font-semibold text-sm text-on-surface truncate">
                          {getItemName(item)}
                        </h4>
                        {catalogType === "products" &&
                          "products_category_id" in item && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  SKU
                                </span>{" "}
                                {item.sku}
                              </span>
                              {item.brand_id ? (
                                <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                                  <span className="label-caps mr-1 text-on-surface-variant/60">
                                    Brand
                                  </span>{" "}
                                  {brands.find((b) => b.id === item.brand_id)
                                    ?.name ?? item.brand_id}
                                </span>
                              ) : null}
                              {item.products_category_id ? (
                                <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                                  <span className="label-caps mr-1 text-on-surface-variant/60">
                                    Category
                                  </span>{" "}
                                  {productCategories.find(
                                    (c) => c.id === item.products_category_id,
                                  )?.name ?? item.products_category_id}
                                </span>
                              ) : null}
                              {getProductStockBadge(item)}
                            </div>
                          )}

                        {catalogType === "spare_parts" &&
                          "spare_parts_category_id" in item && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  SKU
                                </span>{" "}
                                {item.sku}
                              </span>
                              {item.part_number ? (
                                <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                  <span className="label-caps mr-1 text-on-surface-variant/60">
                                    Part#
                                  </span>{" "}
                                  {item.part_number}
                                </span>
                              ) : null}
                              <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  Universal
                                </span>{" "}
                                {item.universal ? "Yes" : "No"}
                              </span>
                              {item.brand_id ? (
                                <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                                  <span className="label-caps mr-1 text-on-surface-variant/60">
                                    Brand
                                  </span>{" "}
                                  {brands.find((b) => b.id === item.brand_id)
                                    ?.name ?? item.brand_id}
                                </span>
                              ) : null}
                              <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  Stock
                                </span>
                                {item.stock_quantity ?? 0}
                              </span>
                            </div>
                          )}

                        {catalogType === "bikes" && "bike_blueprint_id" in item && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {item.vin ? (
                              <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                <span className="label-caps mr-1 text-on-surface-variant/60">
                                  VIN
                                </span>{" "}
                                {item.vin}
                              </span>
                            ) : null}
                            <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                              <span className="label-caps mr-1 text-on-surface-variant/60">
                                Mileage
                              </span>{" "}
                              {item.mileage.toLocaleString()} km
                            </span>
                            {item.status ? (
                              <StatusBadge tone={getBikeStatusTone(item.status)}>
                                {getBikeStatusLabel(item.status)}
                              </StatusBadge>
                            ) : null}
                          </div>
                        )}

                        {catalogType === "maintenance_services" &&
                          "service_price" in item && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                              {item.maintenance_service_sector_id ? (
                                <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                                  <span className="label-caps mr-1 text-on-surface-variant/60">
                                    Sector
                                  </span>{" "}
                                  {sectors.find(
                                    (s) =>
                                      s.id ===
                                      item.maintenance_service_sector_id,
                                  )?.name ?? item.maintenance_service_sector_id}
                                </span>
                              ) : null}
                              {item.max_discount_value > 0 ? (
                                <span className="mono-data inline-flex items-center text-xs font-medium text-on-surface-variant">
                                  <span className="label-caps mr-1 text-on-surface-variant/60">
                                    Max disc.
                                  </span>{" "}
                                  {item.max_discount_type === "percentage"
                                    ? `${item.max_discount_value}%`
                                    : formatCatalogPriceInEGP(
                                        item.max_discount_value,
                                        toPricingCurrency(item.sale_currency),
                                        rates,
                                      )}
                                </span>
                              ) : null}
                            </div>
                          )}
                      </div>

                      {/* Price Tag */}
                      <div className="shrink-0 flex flex-col items-end justify-center w-auto mt-0 pt-0 border-0">
                        <div className="bg-surface-container-highest/20 px-3 py-1.5 rounded-lg border border-outline-variant/10">
                          <p className="mono-data text-primary font-bold text-base">
                            {formatCatalogPriceInEGP(
                              getItemPrice(item),
                              getItemCurrency(item),
                              rates,
                            )}
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
          <div className="relative z-10 flex shrink-0 items-center justify-between border-t border-outline-variant/15 bg-surface-container px-6 py-3 shadow-ambient">
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
              disabled={items.length === 0 || allVisibleSelected}
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
    document.body,
  );
}
