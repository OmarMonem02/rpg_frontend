"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type RefObject,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { getAuthToken } from "@/lib/auth-session";
import {
  listProducts,
  listSpareParts,
  listMaintenanceParts,
  listBikeForSale,
  listMaintenanceServices,
  listBrands,
  listProductCategories,
  listSparePartCategories,
  listMaintenancePartCategories,
  listMaintenanceServiceSectors,
  listBikeBlueprints,
  type ProductRecord,
  type SparePartRecord,
  type MaintenancePartRecord,
  type BikeRecord,
  type BikeBlueprintRecord,
  type MaintenanceServiceRecord,
  type BrandRecord,
  type ProductCategoryRecord,
  type SparePartCategoryRecord,
  type MaintenancePartCategoryRecord,
  type MaintenanceServiceSectorRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import { formatCatalogItemAttributes, ItemStatusBadge } from "@/lib/inventory-item-attributes";
import {
  formatCatalogPriceInEGP,
  toPricingCurrency,
  type PricingCurrency,
} from "@/lib/currencies";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useEntityFilters, type EntityFilters } from "@/hooks/useEntityFilters";
import { ActionButton, StatusBadge } from "@/components/ops-ui";
import { InventoryModuleFilters } from "@/components/inventory/InventoryModuleFilters";
import { InventoryItemThumbnail } from "@/components/inventory/list-table";
import { countActiveFilters } from "@/lib/inventory-filter-utils";
import type { InventoryModuleId, ModuleFilterOptions } from "@/lib/inventory-filter-config";
import { StockBadge } from "@/components/inventory/stock-badge";
import {
  XMarkIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

type CatalogType =
  | "products"
  | "spare_parts"
  | "maintenance_parts"
  | "bikes"
  | "maintenance_services";

type CatalogItem =
  | ProductRecord
  | SparePartRecord
  | MaintenancePartRecord
  | BikeRecord
  | MaintenanceServiceRecord;

interface CatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogType: CatalogType;
  onAddItems: (items: CatalogItem[]) => void;
  selectedIds?: number[];
  blueprintId?: number;
}

type CatalogPickerFilterSetters = {
  setSearch: (v: string) => void;
  setCategory: (v: number | "") => void;
  setBrand: (v: number | "") => void;
  setBlueprint: (v: number | "") => void;
  setSector: (v: number | "") => void;
  setStatus: (v: string) => void;
  setType: (v: string) => void;
  setPriceMin: (v: number | "") => void;
  setPriceMax: (v: number | "") => void;
  setCurrency: (v: string) => void;
  setLowStock: (v: boolean) => void;
  setTags: (v: string[]) => void;
  setBikeCompatibility: (v: {
    bike_brand_id?: number;
    bike_model?: string;
    bike_year?: number;
  }) => void;
  setFilter: <K extends keyof EntityFilters>(
    key: K,
    value: EntityFilters[K],
  ) => void;
};

/**
 * Memoized filters panel component to prevent unnecessary re-renders
 * when catalog items update without filter changes
 */
const CatalogPickerFiltersPanel = memo(function CatalogPickerFiltersPanel({
  activeFilterCount,
  moduleId,
  filters,
  filterOptions,
  bikeBrands,
  loading,
  onClose,
  onClearAll,
  setters,
  closeButtonRef,
  showBackButton = false,
}: {
  activeFilterCount: number;
  moduleId: InventoryModuleId;
  filters: EntityFilters;
  filterOptions: ModuleFilterOptions;
  bikeBrands: BrandRecord[];
  loading: boolean;
  onClose: () => void;
  onClearAll: () => void;
  setters: CatalogPickerFilterSetters;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  showBackButton?: boolean;
}) {
  return (
    <>
      <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/15 bg-surface-container-low px-4 py-4 sm:px-5">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="flex min-w-0 items-center gap-3">
          {showBackButton ? (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Back to catalog"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/12">
              <FunnelIcon className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">
              Refine results
            </h3>
            <p className="text-xs font-medium text-on-surface-variant">
              {activeFilterCount > 0
                ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`
                : "Narrow the catalog list"}
            </p>
          </div>
        </div>
        <button
          ref={showBackButton ? undefined : closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-4 py-4 [scrollbar-gutter:stable] sm:px-5 sm:py-5">
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest/35 p-4 sm:p-5">
          <InventoryModuleFilters
            module={moduleId}
            filters={filters}
            setters={setters}
            options={filterOptions}
            bikeBrands={bikeBrands}
            loading={loading}
            layout="panel"
            sections={["primary", "advanced", "more"]}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-variant/15 bg-surface-container-low px-4 py-4 sm:px-5">
        {activeFilterCount > 0 ? (
          <ActionButton variant="ghost" size="sm" onClick={onClearAll}>
            Clear all
          </ActionButton>
        ) : (
          <span />
        )}
        <ActionButton
          tone="primary"
          variant="filled"
          size="sm"
          onClick={onClose}
          className="shadow-sm"
        >
          Show results
        </ActionButton>
      </div>
    </>
  );
});

/**
 * Memoized catalog item row component for optimal rendering performance
 * Prevents re-renders of individual items when catalog updates
 */
interface CatalogItemRowProps {
  item: CatalogItem;
  index: number;
  isSelected: boolean;
  catalogType: CatalogType;
  onToggle: (id: number) => void;
  getItemName: (item: CatalogItem) => string;
  getItemPrice: (item: CatalogItem) => number;
  getItemCurrency: (item: CatalogItem) => PricingCurrency;
  rates: any; // ExchangeRates type from useExchangeRates hook
  brands: BrandRecord[];
  productCategories: ProductCategoryRecord[];
  sparePartCategories: SparePartCategoryRecord[];
  maintenancePartCategories: MaintenancePartCategoryRecord[];
  sectors: MaintenanceServiceSectorRecord[];
  blueprints: BikeBlueprintRecord[];
}

const CatalogItemRow = memo(function CatalogItemRow({
  item,
  index,
  isSelected,
  catalogType,
  onToggle,
  getItemName,
  getItemPrice,
  getItemCurrency,
  rates,
  brands,
  productCategories,
  sparePartCategories,
  maintenancePartCategories,
  sectors,
  blueprints,
}: CatalogItemRowProps) {
  const isUniversalSparePart =
    catalogType === "spare_parts" &&
    "universal" in item &&
    item.universal === true;

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
            onChange={() => onToggle(item.id)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={`Select ${getItemName(item)}`}
          />
          {isSelected && (
            <svg
              className="w-4 h-4 text-primary pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
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
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <InventoryItemThumbnail
            image={"image" in item ? item.image : undefined}
            images={"images" in item ? item.images : undefined}
            name={getItemName(item)}
          />
        </div>
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
                <StockBadge
                  stock_quantity={item.stock_quantity}
                  low_stock_alarm={item.low_stock_alarm}
                />
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
                {formatCatalogItemAttributes(item) ? (
                  <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                    {formatCatalogItemAttributes(item)}
                  </span>
                ) : null}
                {"item_status" in item ? (
                  <ItemStatusBadge status={item.item_status} />
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
                <StockBadge
                  stock_quantity={item.stock_quantity}
                  low_stock_alarm={item.low_stock_alarm}
                />
              </div>
            )}

          {catalogType === "maintenance_parts" &&
            "maintenance_parts_category_id" in item && (
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
                {formatCatalogItemAttributes(item) ? (
                  <span className="inline-flex items-center text-xs font-medium text-on-surface-variant">
                    {formatCatalogItemAttributes(item)}
                  </span>
                ) : null}
                {"item_status" in item ? (
                  <ItemStatusBadge status={item.item_status} />
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
                <StockBadge
                  stock_quantity={item.stock_quantity}
                  low_stock_alarm={item.low_stock_alarm}
                />
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
});

export function CatalogPickerModal({
  isOpen,
  onClose,
  catalogType,
  onAddItems,
  selectedIds = [],
}: CatalogPickerModalProps) {
  const { rates } = useExchangeRates();
  const moduleId = catalogType as InventoryModuleId;
  const {
    filters,
    page,
    setPage,
    getModuleApiParams,
    setSearch,
    setCategory,
    setBrand,
    setBlueprint,
    setSector,
    setStatus,
    setType,
    setPriceMin,
    setPriceMax,
    setCurrency,
    setLowStock,
    setTags,
    setBikeCompatibility,
    setFilter,
    resetFilters,
  } = useEntityFilters();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const filtersCloseButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const compoundContainerRef = useRef<HTMLDivElement>(null);

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [bikeBrands, setBikeBrands] = useState<BrandRecord[]>([]);
  const [productCategories, setProductCategories] = useState<
    ProductCategoryRecord[]
  >([]);
  const [sparePartCategories, setSparePartCategories] = useState<
    SparePartCategoryRecord[]
  >([]);
  const [maintenancePartCategories, setMaintenancePartCategories] = useState<
    MaintenancePartCategoryRecord[]
  >([]);
  const [sectors, setSectors] = useState<MaintenanceServiceSectorRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters],
  );

  const filterOptions = useMemo((): ModuleFilterOptions => {
    const options: ModuleFilterOptions = {
      brands: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    };

    if (catalogType === "products") {
      options.categories = productCategories.map((category) => ({
        value: category.id,
        label: category.name,
      }));
    } else if (catalogType === "spare_parts") {
      options.categories = sparePartCategories.map((category) => ({
        value: category.id,
        label: category.name,
      }));
    } else if (catalogType === "maintenance_parts") {
      options.categories = maintenancePartCategories.map((category) => ({
        value: category.id,
        label: category.name,
      }));
    }

    if (catalogType === "bikes") {
      options.blueprints = blueprints.map((blueprint) => ({
        value: blueprint.id,
        label: `${blueprint.model} ${blueprint.year}`,
      }));
    }

    if (catalogType === "maintenance_services") {
      options.sectors = sectors.map((sector) => ({
        value: sector.id,
        label: sector.name,
      }));
    }

    return options;
  }, [
    catalogType,
    brands,
    productCategories,
    sparePartCategories,
    maintenancePartCategories,
    blueprints,
    sectors,
  ]);

  const clearAllFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const filterSetters = useMemo(
    (): CatalogPickerFilterSetters => ({
      setSearch,
      setCategory,
      setBrand,
      setBlueprint,
      setSector,
      setStatus,
      setType,
      setPriceMin,
      setPriceMax,
      setCurrency,
      setLowStock,
      setTags,
      setBikeCompatibility,
      setFilter,
    }),
    [
      setSearch,
      setCategory,
      setBrand,
      setBlueprint,
      setSector,
      setStatus,
      setType,
      setPriceMin,
      setPriceMax,
      setCurrency,
      setLowStock,
      setTags,
      setBikeCompatibility,
      setFilter,
    ],
  );

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
        setMaintenancePartCategories([]);
        setBlueprints([]);
      } else if (catalogType === "maintenance_parts") {
        const [mpBrandsRes, bikeBrandsRes, categoriesRes] = await Promise.all([
          fetchAllPages((p) => listBrands(token, p, { type: "maintenance_parts" })),
          fetchAllPages((p) => listBrands(token, p, { type: "bikes" })),
          listMaintenancePartCategories(token, 1),
        ]);
        setBrands(mpBrandsRes);
        setBikeBrands(bikeBrandsRes);
        setMaintenancePartCategories(categoriesRes.items);
        setSparePartCategories([]);
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

      const apiFilters = getModuleApiParams(moduleId);
      let result;

      if (catalogType === "products") {
        result = await listProducts(
          token,
          page,
          apiFilters as Parameters<typeof listProducts>[2],
        );
      } else if (catalogType === "spare_parts") {
        result = await listSpareParts(
          token,
          page,
          apiFilters as Parameters<typeof listSpareParts>[2],
        );
      } else if (catalogType === "maintenance_parts") {
        result = await listMaintenanceParts(
          token,
          page,
          apiFilters as Parameters<typeof listMaintenanceParts>[2],
        );
      } else if (catalogType === "bikes") {
        result = await listBikeForSale(
          token,
          page,
          apiFilters as Parameters<typeof listBikeForSale>[2],
        );
      } else if (catalogType === "maintenance_services") {
        result = await listMaintenanceServices(
          token,
          page,
          apiFilters as Parameters<typeof listMaintenanceServices>[2],
        );
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
  }, [catalogType, moduleId, page, getModuleApiParams]);

  useEffect(() => {
    if (isOpen) {
      loadFilterOptions();
    }
  }, [isOpen, catalogType, loadFilterOptions]);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, catalogType, page, filters, loadItems]);

  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set(selectedIds));
      setPage(1);
      setFiltersDrawerOpen(false);
    } else {
      setSelectedItemIds(new Set());
    }
  }, [isOpen, JSON.stringify(selectedIds), setPage]);

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
        if (filtersDrawerOpen) {
          setFiltersDrawerOpen(false);
        } else {
          onClose();
        }
        return;
      }

      if (event.key === "Tab") {
        const trapRoot = filtersDrawerOpen
          ? compoundContainerRef.current
          : dialogRef.current;
        if (!trapRoot) return;

        const focusables = Array.from(
          trapRoot.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const insideDialog = active && trapRoot.contains(active);

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
  }, [isOpen, onClose, filtersDrawerOpen]);

  useEffect(() => {
    if (!isOpen || !filtersDrawerOpen) return;

    const focusTimer = window.setTimeout(() => {
      filtersCloseButtonRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [isOpen, filtersDrawerOpen]);

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

  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedItemIds.has(item.id));

  const catalogShellClassName = [
    "form-modal-shell relative flex h-full max-h-[100dvh] min-h-0 w-full min-w-0 shrink-0",
    "animate-in slide-in-from-right-8 flex-col overflow-hidden",
    "border-l border-outline-variant/15 bg-surface shadow-ambient",
    filtersDrawerOpen
      ? "sm:flex-1 sm:w-auto sm:min-w-[14rem]"
      : "sm:shrink-0 sm:w-[min(100vw,42rem)] md:w-[min(100vw,48rem)] lg:w-[min(100vw,56rem)] xl:w-[min(100vw,64rem)] 2xl:w-[min(100vw,72rem)]",
  ].join(" ");

  const compoundShellClassName = [
    "relative flex h-full max-h-[100dvh] min-h-0 w-full max-w-[100vw] flex-row-reverse items-stretch",
    filtersDrawerOpen ? "" : "sm:w-max",
  ].join(" ");

  return createPortal(
    <div className="form-modal-overlay fixed inset-0 z-[100] flex items-stretch justify-end transition-opacity">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close catalog picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div ref={compoundContainerRef} className={compoundShellClassName}>
        {/* Catalog picker — right-anchored primary drawer */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Catalog picker"
          className={catalogShellClassName}
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
              {catalogType === "maintenance_parts" && "Browse Maintenance Parts"}
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

        {/* Filters — opens extended panel beside catalog (mobile: in-drawer overlay) */}
        <div className="relative z-10 shrink-0 border-b border-outline-variant/10 bg-surface shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
          <div className="flex flex-wrap items-stretch gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
            <button
              type="button"
              id="catalog-picker-filters-toggle"
              aria-haspopup="dialog"
              aria-expanded={filtersDrawerOpen}
              aria-controls="catalog-picker-filters-drawer"
              onClick={() => setFiltersDrawerOpen(true)}
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
                  {activeFilterCount > 0
                    ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active — tap to edit`
                    : "Opens filter panel beside the catalog"}
                </span>
              </span>
              {activeFilterCount > 0 ? (
                <span className="label-caps hidden shrink-0 items-center rounded-full border border-primary/30 bg-primary/12 px-2 py-0.5 text-primary sm:inline-flex">
                  {activeFilterCount}
                </span>
              ) : null}
              <ChevronRightIcon
                className="h-5 w-5 shrink-0 text-on-surface-variant"
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
              {items.map((item, index) => (
                <CatalogItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  isSelected={selectedItemIds.has(item.id)}
                  catalogType={catalogType}
                  onToggle={handleToggleItem}
                  getItemName={getItemName}
                  getItemPrice={getItemPrice}
                  getItemCurrency={getItemCurrency}
                  rates={rates}
                  brands={brands}
                  productCategories={productCategories}
                  sparePartCategories={sparePartCategories}
                  maintenancePartCategories={maintenancePartCategories}
                  sectors={sectors}
                  blueprints={blueprints}
                />
              ))}
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

        {/* Mobile filters overlay — inside catalog shell */}
        {filtersDrawerOpen ? (
          <div className="absolute inset-0 z-40 flex md:hidden">
            <button
              type="button"
              aria-label="Close filters panel"
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-[1px]"
              onClick={() => setFiltersDrawerOpen(false)}
            />
            <aside
              id="catalog-picker-filters-drawer-mobile"
              role="dialog"
              aria-modal="true"
              aria-labelledby="catalog-picker-filters-toggle"
              className="relative flex h-full w-[min(88vw,26rem)] max-w-full flex-col border-r border-outline-variant/15 bg-surface-container-lowest shadow-ambient animate-in slide-in-from-left duration-300"
            >
              <CatalogPickerFiltersPanel
                activeFilterCount={activeFilterCount}
                moduleId={moduleId}
                filters={filters}
                filterOptions={filterOptions}
                bikeBrands={bikeBrands}
                loading={loading}
                onClose={() => setFiltersDrawerOpen(false)}
                onClearAll={clearAllFilters}
                setters={filterSetters}
                closeButtonRef={filtersCloseButtonRef}
                showBackButton
              />
            </aside>
          </div>
        ) : null}
        </div>

        {/* Desktop filters panel — sibling to the left of catalog */}
        {filtersDrawerOpen ? (
          <aside
            id="catalog-picker-filters-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-picker-filters-toggle"
            className="form-modal-shell hidden h-full max-h-[100dvh] min-h-0 shrink-0 animate-in slide-in-from-right duration-300 flex-col overflow-hidden border-l border-outline-variant/15 bg-surface-container-lowest shadow-ambient md:flex md:w-[min(38vw,26rem)] lg:w-[28rem] xl:w-[45rem]"
          >
            <CatalogPickerFiltersPanel
              activeFilterCount={activeFilterCount}
              moduleId={moduleId}
              filters={filters}
              filterOptions={filterOptions}
              bikeBrands={bikeBrands}
              loading={loading}
              onClose={() => setFiltersDrawerOpen(false)}
              onClearAll={clearAllFilters}
              setters={filterSetters}
              closeButtonRef={filtersCloseButtonRef}
            />
          </aside>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
