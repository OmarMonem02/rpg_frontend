"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { InventoryModuleFilters } from "@/components/inventory/InventoryModuleFilters";
import {
  InventoryImage,
  InventoryImagePlaceholder,
} from "@/components/inventory/InventoryImage";
import { StockBadge } from "@/components/inventory/stock-badge";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageShell,
  PaginationControls,
  SearchableSelect,
  SectionHeading,
} from "@/components/ops-ui";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { getAuthToken } from "@/lib/auth-session";
import { formatCatalogPriceInEGP, type ExchangeRates } from "@/lib/currencies";
import {
  fetchAllPages,
  listBikeBlueprints,
  listBrands,
  listProductCategories,
  listProducts,
  listSparePartCategories,
  listMaintenancePartCategories,
  listSpareParts,
  listMaintenanceParts,
  type BrandRecord,
  type ProductCategoryRecord,
  type SparePartCategoryRecord,
  type MaintenancePartCategoryRecord,
} from "@/lib/crud-api";
import type { BikeBlueprintRecord } from "@/lib/api/bikes";
import { filterBrandsByType } from "@/lib/brand-types";
import type { InventoryModuleId } from "@/lib/inventory-filter-config";
import { DEFAULT_ITEM_STATUS_OPTIONS } from "@/lib/inventory-filter-config";
import {
  findExactSkuOrPartNumberMatch,
  formatMaxDiscount,
  getLookupItemKindLabel,
  lookupItemSortKey,
  resolveCompatibleBikeLabels,
  toLookupItem,
  type LookupItem,
} from "@/lib/item-lookup";
type EntityFilter = "all" | "product" | "spare_part" | "maintenance_part";

function browseModuleForEntity(entity: EntityFilter): InventoryModuleId {
  switch (entity) {
    case "product":
      return "products";
    case "spare_part":
      return "spare_parts";
    case "maintenance_part":
      return "maintenance_parts";
    default:
      return "item_lookup";
  }
}

const MAX_VISIBLE_BIKE_CHIPS = 4;

function ItemLookupImage({
  src,
  name,
  size = "sm",
}: {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "h-24 w-24" : size === "md" ? "h-14 w-14" : "h-10 w-10";
  const placeholderClass = `${sizeClass} flex flex-none items-center justify-center rounded-xl border border-outline-variant/15 bg-surface-container text-sm font-semibold text-on-surface-variant`;

  if (!src) return null;

  return (
    <InventoryImage
      src={src}
      alt={name}
      className={`${sizeClass} flex-none rounded-xl border border-outline-variant/15 object-cover`}
      fallback={<InventoryImagePlaceholder name={name} className={placeholderClass} />}
    />
  );
}

function CompatibleBikesCell({
  labels,
  compact = false,
}: {
  labels: string[];
  compact?: boolean;
}) {
  if (labels.length === 0) {
    return compact ? (
      <span className="text-xs text-on-surface-variant/60">—</span>
    ) : null;
  }

  const visible = labels.slice(0, MAX_VISIBLE_BIKE_CHIPS);
  const hiddenCount = labels.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((label) => (
        <span
          key={label}
          className="form-chip max-w-full truncate bg-surface-container-high text-on-surface-variant"
          title={label}
        >
          {label}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="form-chip bg-primary/8 text-primary border-primary/15">
          +{hiddenCount} more
        </span>
      ) : null}
    </div>
  );
}

function LookupResultCard({
  item,
  bikeLabels,
  rates,
}: {
  item: LookupItem;
  bikeLabels: string[];
  rates: ExchangeRates;
}) {
  const record = item.record;

  return (
    <article className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <ItemLookupImage
          src={record.image}
          name={record.name}
          size="lg"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <span className="form-chip bg-primary/8 text-primary border-primary/15">
            {getLookupItemKindLabel(item.kind)}
          </span>
          <h3 className="text-xl font-semibold text-on-surface">{record.name}</h3>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/60 px-4 py-3">
          <dt className="label-caps text-on-surface-variant">Price</dt>
          <dd className="mono-data mt-1 text-lg font-semibold text-primary">
            {formatCatalogPriceInEGP(
              record.sale_price,
              record.sale_currency,
              rates,
            )}
          </dd>
        </div>
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/60 px-4 py-3">
          <dt className="label-caps text-on-surface-variant">Max discount</dt>
          <dd className="mono-data mt-1 text-base font-semibold text-on-surface">
            {formatMaxDiscount(record, rates)}
          </dd>
        </div>
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/60 px-4 py-3">
          <dt className="label-caps text-on-surface-variant">Stock</dt>
          <dd className="mt-1">
            <StockBadge
              stock_quantity={record.stock_quantity}
              low_stock_alarm={record.low_stock_alarm}
            />
          </dd>
        </div>
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/60 px-4 py-3">
          <dt className="label-caps text-on-surface-variant">Universal</dt>
          <dd className="mt-1">
            <span
              className={`form-chip ${record.universal ? "bg-success/10 text-success border-success/20" : "bg-surface-container-high text-on-surface-variant"}`}
            >
              {record.universal ? "Universal" : "Specific"}
            </span>
          </dd>
        </div>
      </dl>

      {!record.universal ? (
        <div className="mt-5 rounded-xl border border-outline-variant/10 bg-surface-container-low/40 px-4 py-4">
          <p className="label-caps text-on-surface-variant">Compatible bikes</p>
          <div className="mt-3">
            {bikeLabels.length > 0 ? (
              <CompatibleBikesCell labels={bikeLabels} />
            ) : (
              <p className="text-sm text-on-surface-variant">
                No compatible bike blueprints linked.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function ItemLookupPage() {
  const { rates } = useExchangeRates();
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [bikeBrands, setBikeBrands] = useState<BrandRecord[]>([]);
  const [productBrands, setProductBrands] = useState<BrandRecord[]>([]);
  const [sparePartBrands, setSparePartBrands] = useState<BrandRecord[]>([]);
  const [maintenancePartBrands, setMaintenancePartBrands] = useState<BrandRecord[]>([]);
  const [productCategories, setProductCategories] = useState<
    ProductCategoryRecord[]
  >([]);
  const [sparePartCategories, setSparePartCategories] = useState<
    SparePartCategoryRecord[]
  >([]);
  const [maintenancePartCategories, setMaintenancePartCategories] = useState<
    MaintenancePartCategoryRecord[]
  >([]);
  const [metadataLoading, setMetadataLoading] = useState(true);

  const [skuValue, setSkuValue] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickResult, setQuickResult] = useState<LookupItem | null>(null);

  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const {
    filters,
    page,
    setPage,
    getModuleApiParams,
    setSearch,
    setCategory,
    setBrand,
    setPriceMin,
    setPriceMax,
    setCurrency,
    setBikeCompatibility,
    setFilter,
  } = useEntityFilters();

  const browseModule = browseModuleForEntity(entityFilter);

  const [browseItems, setBrowseItems] = useState<LookupItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);
  const [showMoreBrowseFilters, setShowMoreBrowseFilters] = useState(false);

  const bikeBrandNameById = useMemo(
    () => new Map(bikeBrands.map((brand) => [brand.id, brand.name])),
    [bikeBrands],
  );

  const resolveBikeLabels = useCallback(
    (blueprintIds: number[] | undefined) =>
      resolveCompatibleBikeLabels(
        blueprintIds,
        blueprints,
        bikeBrandNameById,
      ),
    [blueprints, bikeBrandNameById],
  );

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setMetadataLoading(true);
        const token = getAuthToken();
        if (!token) return;

        const [
          brandsRes,
          productCatsRes,
          spareCatsRes,
          maintenanceCatsRes,
          blueprintRows,
        ] = await Promise.all([
          fetchAllPages((p) => listBrands(token, p)),
          fetchAllPages((p) => listProductCategories(token, p)),
          fetchAllPages((p) => listSparePartCategories(token, p)),
          fetchAllPages((p) => listMaintenancePartCategories(token, p)),
          fetchAllPages((p) => listBikeBlueprints(token, p)),
        ]);

        setProductBrands(filterBrandsByType(brandsRes, "products"));
        setSparePartBrands(filterBrandsByType(brandsRes, "spare_parts"));
        setMaintenancePartBrands(filterBrandsByType(brandsRes, "maintenance_parts"));
        setBikeBrands(filterBrandsByType(brandsRes, "bikes"));
        setProductCategories(productCatsRes);
        setSparePartCategories(spareCatsRes);
        setMaintenancePartCategories(maintenanceCatsRes);
        setBlueprints(blueprintRows);
      } catch (err) {
        console.error("Failed to load item lookup metadata:", err);
      } finally {
        setMetadataLoading(false);
      }
    };

    void loadMetadata();
  }, []);

  useEffect(() => {
    setCategory("");
    setBrand("");
    setPage(1);
  }, [entityFilter, setCategory, setBrand, setPage]);

  const browseFilterOptions = useMemo(() => {
    switch (browseModule) {
      case "products":
        return {
          categories: productCategories.map((c) => ({
            value: c.id,
            label: c.name,
          })),
          brands: productBrands.map((b) => ({ value: b.id, label: b.name })),
          itemStatuses: DEFAULT_ITEM_STATUS_OPTIONS,
        };
      case "spare_parts":
        return {
          categories: sparePartCategories.map((c) => ({
            value: c.id,
            label: c.name,
          })),
          brands: sparePartBrands.map((b) => ({ value: b.id, label: b.name })),
          itemStatuses: DEFAULT_ITEM_STATUS_OPTIONS,
        };
      case "maintenance_parts":
        return {
          categories: maintenancePartCategories.map((c) => ({
            value: c.id,
            label: c.name,
          })),
          brands: maintenancePartBrands.map((b) => ({
            value: b.id,
            label: b.name,
          })),
          itemStatuses: DEFAULT_ITEM_STATUS_OPTIONS,
        };
      default:
        return { itemStatuses: DEFAULT_ITEM_STATUS_OPTIONS };
    }
  }, [
    browseModule,
    productCategories,
    productBrands,
    sparePartCategories,
    sparePartBrands,
    maintenancePartCategories,
    maintenancePartBrands,
  ]);

  const buildBrowseApiParams = useCallback(() => {
    const params = { ...getModuleApiParams(browseModule) };
    if (entityFilter === "all") {
      delete params.category_id;
    }
    return params;
  }, [browseModule, entityFilter, getModuleApiParams]);

  const runQuickLookup = useCallback(async () => {
    const code = skuValue.trim();
    if (!code || quickLoading) return;

    try {
      setQuickLoading(true);
      setQuickError(null);
      setQuickResult(null);

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const [productsRes, spareRes, maintenanceRes] = await Promise.all([
        listProducts(token, 1, { search: code }),
        listSpareParts(token, 1, { search: code }),
        listMaintenanceParts(token, 1, { search: code }),
      ]);

      const match = findExactSkuOrPartNumberMatch(
        code,
        productsRes.items,
        spareRes.items,
        maintenanceRes.items,
      );

      if (!match) {
        throw new Error(`No catalog item found for "${code}"`);
      }

      setQuickResult(match);
      skuInputRef.current?.focus();
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setQuickLoading(false);
    }
  }, [quickLoading, skuValue]);

  const loadBrowseResults = useCallback(async () => {
    try {
      setBrowseLoading(true);
      setBrowseError(null);

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const apiParams = buildBrowseApiParams();

      if (entityFilter === "product") {
        const result = await listProducts(token, page, apiParams);
        setBrowseItems(
          result.items.map((record) => toLookupItem("product", record)),
        );
        setBrowseTotalPages(result.lastPage);
        return;
      }

      if (entityFilter === "spare_part") {
        const result = await listSpareParts(token, page, apiParams);
        setBrowseItems(
          result.items.map((record) => toLookupItem("spare_part", record)),
        );
        setBrowseTotalPages(result.lastPage);
        return;
      }

      if (entityFilter === "maintenance_part") {
        const result = await listMaintenanceParts(token, page, apiParams);
        setBrowseItems(
          result.items.map((record) => toLookupItem("maintenance_part", record)),
        );
        setBrowseTotalPages(result.lastPage);
        return;
      }

      const [productsRes, spareRes, maintenanceRes] = await Promise.all([
        listProducts(token, page, apiParams),
        listSpareParts(token, page, apiParams),
        listMaintenanceParts(token, page, apiParams),
      ]);

      const merged = [
        ...productsRes.items.map((record) =>
          toLookupItem("product", record),
        ),
        ...spareRes.items.map((record) =>
          toLookupItem("spare_part", record),
        ),
        ...maintenanceRes.items.map((record) =>
          toLookupItem("maintenance_part", record),
        ),
      ].sort((a, b) =>
        lookupItemSortKey(a).localeCompare(lookupItemSortKey(b)),
      );

      setBrowseItems(merged);
      setBrowseTotalPages(
        Math.max(productsRes.lastPage, spareRes.lastPage, 1),
      );
    } catch (err) {
      setBrowseError(
        err instanceof Error ? err.message : "Failed to load items",
      );
      setBrowseItems([]);
      setBrowseTotalPages(1);
    } finally {
      setBrowseLoading(false);
    }
  }, [page, buildBrowseApiParams, entityFilter]);

  useEffect(() => {
    void loadBrowseResults();
  }, [loadBrowseResults]);

  const handleQuickSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runQuickLookup();
  };

  const handleSkuKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void runQuickLookup();
    }
  };

  return (
    <PageShell>
      <section className="space-y-4">
        <SectionHeading
          title="Quick Lookup"
          description="Enter an exact SKU or part number to view item details instantly."
        />

        <form
          onSubmit={handleQuickSubmit}
          className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4 sm:p-5"
        >
          <FilterBar className="md:grid-cols-12">
            <InputGroup label="SKU or part number" className="md:col-span-9">
              <input
                ref={skuInputRef}
                type="text"
                value={skuValue}
                onChange={(event) => {
                  setSkuValue(event.target.value);
                  setQuickError(null);
                }}
                onKeyDown={handleSkuKeyDown}
                placeholder="Enter SKU or part number"
                className="form-input-base"
                autoComplete="off"
                aria-label="SKU or part number"
              />
            </InputGroup>
            <div className="flex items-end md:col-span-3">
              <ActionButton
                type="submit"
                tone="primary"
                className="w-full"
                disabled={quickLoading || !skuValue.trim()}
              >
                {quickLoading ? "Searching…" : "Search"}
              </ActionButton>
            </div>
          </FilterBar>

          {quickError ? (
            <p className="mt-3 text-sm text-error" role="alert">
              {quickError}
            </p>
          ) : null}
        </form>

        {quickResult ? (
          <LookupResultCard
            item={quickResult}
            bikeLabels={resolveBikeLabels(
              quickResult.record.bike_blueprint_ids,
            )}
            rates={rates}
          />
        ) : null}
      </section>

      <section className="mt-10 space-y-4">
        <SectionHeading
          title="Browse Catalog"
          description="Use filters and name search to explore products, spare parts, and maintenance parts."
        />

        <div className="space-y-4 rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4 sm:p-5">
          <FilterBar className="md:grid-cols-12">
            <InputGroup label="Item type" className="md:col-span-3">
              <SearchableSelect
                value={entityFilter}
                onChange={(value) => {
                  setEntityFilter(value as EntityFilter);
                }}
                options={[
                  { value: "all", label: "All items" },
                  { value: "product", label: "Products only" },
                  { value: "spare_part", label: "Spare parts only" },
                  { value: "maintenance_part", label: "Maintenance parts only" },
                ]}
                className="form-input-base"
                aria-label="Item type"
              />
            </InputGroup>
            {entityFilter === "all" ? (
              <InputGroup label="Search" className="md:col-span-9">
                <input
                  type="text"
                  value={filters.search || ""}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, SKU, or part number…"
                  className="form-input-base"
                  aria-label="Search catalog"
                />
              </InputGroup>
            ) : null}
          </FilterBar>

          <InventoryModuleFilters
            module={browseModule}
            filters={filters}
            bikeBrands={bikeBrands}
            loading={browseLoading || metadataLoading}
            showMoreFilters={showMoreBrowseFilters}
            onToggleMore={() => setShowMoreBrowseFilters((v) => !v)}
            sections={
              entityFilter === "all"
                ? ["advanced", "more"]
                : ["primary", "advanced", "more"]
            }
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
              setLowStock: (v) => setFilter("low_stock", v ? true : undefined),
              setTags: (tags) =>
                setFilter("tags", tags.length > 0 ? tags : undefined),
              setBikeCompatibility,
              setFilter,
            }}
            options={browseFilterOptions}
          />
        </div>

        {browseError ? (
          <p className="text-sm text-error" role="alert">
            {browseError}
          </p>
        ) : null}

        {browseLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
          </div>
        ) : browseItems.length === 0 ? (
          <EmptyState
            title="No items found"
            description="Try adjusting your filters or search terms."
          />
        ) : (
          <>
            <p className="label-caps text-on-surface-variant">
              {browseItems.length}{" "}
              {browseItems.length === 1 ? "item" : "items"}
              {browseTotalPages > 1
                ? ` · page ${page} of ${browseTotalPages}`
                : ""}
            </p>

            <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                    <th className="label-caps px-4 py-3 text-left">Type</th>
                    <th className="label-caps px-4 py-3 text-left">Name</th>
                    <th className="label-caps px-4 py-3 text-left">Price</th>
                    <th className="label-caps px-4 py-3 text-left">
                      Max discount
                    </th>
                    <th className="label-caps px-4 py-3 text-center">Stock</th>
                    <th className="label-caps px-4 py-3 text-left">
                      Universal
                    </th>
                    <th className="label-caps px-4 py-3 text-left">
                      Compatible bikes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {browseItems.map((item) => {
                    const record = item.record;
                    const bikeLabels = record.universal
                      ? []
                      : resolveBikeLabels(record.bike_blueprint_ids);

                    return (
                      <tr
                        key={`${item.kind}-${record.id}`}
                        className="data-row border-b border-outline-variant/10 last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <span className="form-chip bg-primary/8 text-primary border-primary/15">
                            {getLookupItemKindLabel(item.kind)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-on-surface">
                          <div className="flex items-center gap-3">
                            <ItemLookupImage
                              src={record.image}
                              name={record.name}
                            />
                            <span>{record.name}</span>
                          </div>
                        </td>
                        <td className="mono-data px-4 py-3 text-primary">
                          {formatCatalogPriceInEGP(
                            record.sale_price,
                            record.sale_currency,
                            rates,
                          )}
                        </td>
                        <td className="mono-data px-4 py-3 text-on-surface-variant">
                          {formatMaxDiscount(record, rates)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StockBadge
                            stock_quantity={record.stock_quantity}
                            low_stock_alarm={record.low_stock_alarm}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`form-chip ${record.universal ? "bg-success/10 text-success border-success/20" : "bg-surface-container-high text-on-surface-variant"}`}
                          >
                            {record.universal ? "Universal" : "Specific"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {record.universal ? (
                            <span className="text-xs text-on-surface-variant/60">
                              —
                            </span>
                          ) : (
                            <CompatibleBikesCell
                              labels={bikeLabels}
                              compact
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              totalPages={browseTotalPages}
              onPrevious={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              onNext={() =>
                setPage((current) =>
                  Math.min(browseTotalPages, current + 1),
                )
              }
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </PageShell>
  );
}
