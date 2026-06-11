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
import { BikeCompatibilityFilter } from "@/components/BikeCompatibilityFilter";
import { StockBadge } from "@/components/inventory/stock-badge";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SearchableSelect,
  SectionHeading,
} from "@/components/ops-ui";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { getAuthToken } from "@/lib/auth-session";
import { formatCatalogPriceInEGP, type ExchangeRates } from "@/lib/currencies";
import {
  fetchAllPages,
  listBikeBlueprints,
  listBrands,
  listProductCategories,
  listProducts,
  listSparePartCategories,
  listSpareParts,
  type BrandRecord,
  type ProductCategoryRecord,
  type SparePartCategoryRecord,
} from "@/lib/crud-api";
import type { BikeBlueprintRecord } from "@/lib/api/bikes";
import { filterBrandsByType } from "@/lib/brand-types";
import {
  findExactSkuOrPartNumberMatch,
  formatMaxDiscount,
  getLookupItemKindLabel,
  lookupItemSortKey,
  resolveCompatibleBikeLabels,
  toLookupItem,
  type LookupItem,
} from "@/lib/item-lookup";
type EntityFilter = "all" | "product" | "spare_part";

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
  if (!src) return null;

  const sizeClass =
    size === "lg" ? "h-24 w-24" : size === "md" ? "h-14 w-14" : "h-10 w-10";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={`${sizeClass} flex-none rounded-xl border border-outline-variant/15 object-cover`}
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
              record.currency_pricing,
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
  const [productCategories, setProductCategories] = useState<
    ProductCategoryRecord[]
  >([]);
  const [sparePartCategories, setSparePartCategories] = useState<
    SparePartCategoryRecord[]
  >([]);
  const [metadataLoading, setMetadataLoading] = useState(true);

  const [skuValue, setSkuValue] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickResult, setQuickResult] = useState<LookupItem | null>(null);

  const [entityFilter, setEntityFilter] = useState<EntityFilter>("all");
  const [nameSearchDraft, setNameSearchDraft] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [productBrandId, setProductBrandId] = useState<number | "">("");
  const [spareBrandId, setSpareBrandId] = useState<number | "">("");
  const [productCategoryId, setProductCategoryId] = useState<number | "">("");
  const [spareCategoryId, setSpareCategoryId] = useState<number | "">("");
  const [bikeBrandId, setBikeBrandId] = useState<number | undefined>();
  const [bikeModel, setBikeModel] = useState<string | undefined>();
  const [bikeYear, setBikeYear] = useState<number | undefined>();

  const [browseItems, setBrowseItems] = useState<LookupItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(1);

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
          blueprintRows,
        ] = await Promise.all([
          fetchAllPages((p) => listBrands(token, p)),
          fetchAllPages((p) => listProductCategories(token, p)),
          fetchAllPages((p) => listSparePartCategories(token, p)),
          fetchAllPages((p) => listBikeBlueprints(token, p)),
        ]);

        setProductBrands(filterBrandsByType(brandsRes, "products"));
        setSparePartBrands(filterBrandsByType(brandsRes, "spare_parts"));
        setBikeBrands(filterBrandsByType(brandsRes, "bikes"));
        setProductCategories(productCatsRes);
        setSparePartCategories(spareCatsRes);
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
    const timer = window.setTimeout(() => {
      setNameSearch(nameSearchDraft);
      setBrowsePage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [nameSearchDraft]);

  const buildSharedFilters = useCallback(() => {
    return {
      search: nameSearch || undefined,
      bike_brand_id: bikeBrandId,
      bike_model: bikeModel,
      bike_year: bikeYear,
    };
  }, [nameSearch, bikeBrandId, bikeModel, bikeYear]);

  const runQuickLookup = useCallback(async () => {
    const code = skuValue.trim();
    if (!code || quickLoading) return;

    try {
      setQuickLoading(true);
      setQuickError(null);
      setQuickResult(null);

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

      const shared = buildSharedFilters();

      if (entityFilter === "product") {
        const result = await listProducts(token, browsePage, {
          ...shared,
          brand_id: productBrandId || undefined,
          category_id: productCategoryId || undefined,
        });
        setBrowseItems(
          result.items.map((record) => toLookupItem("product", record)),
        );
        setBrowseTotalPages(result.lastPage);
        return;
      }

      if (entityFilter === "spare_part") {
        const result = await listSpareParts(token, browsePage, {
          ...shared,
          brand_id: spareBrandId || undefined,
          category_id: spareCategoryId || undefined,
        });
        setBrowseItems(
          result.items.map((record) => toLookupItem("spare_part", record)),
        );
        setBrowseTotalPages(result.lastPage);
        return;
      }

      const [productsRes, spareRes] = await Promise.all([
        listProducts(token, browsePage, {
          ...shared,
          brand_id: productBrandId || undefined,
          category_id: productCategoryId || undefined,
        }),
        listSpareParts(token, browsePage, {
          ...shared,
          brand_id: spareBrandId || undefined,
          category_id: spareCategoryId || undefined,
        }),
      ]);

      const merged = [
        ...productsRes.items.map((record) =>
          toLookupItem("product", record),
        ),
        ...spareRes.items.map((record) =>
          toLookupItem("spare_part", record),
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
  }, [
    browsePage,
    buildSharedFilters,
    entityFilter,
    productBrandId,
    productCategoryId,
    spareBrandId,
    spareCategoryId,
  ]);

  useEffect(() => {
    void loadBrowseResults();
  }, [loadBrowseResults]);

  useLiveDataRefresh(() => {
    void loadBrowseResults();
    if (skuValue.trim()) {
      void runQuickLookup();
    }
  });

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

  const showProductFilters =
    entityFilter === "all" || entityFilter === "product";
  const showSpareFilters =
    entityFilter === "all" || entityFilter === "spare_part";

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
          description="Use filters and name search to explore products and spare parts."
        />

        <div className="space-y-4 rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4 sm:p-5">
          <FilterBar className="md:grid-cols-12">
            <InputGroup label="Item type" className="md:col-span-3">
              <SearchableSelect
                value={entityFilter}
                onChange={(value) => {
                  setEntityFilter(value as EntityFilter);
                  setBrowsePage(1);
                }}
                options={[
                  { value: "all", label: "All items" },
                  { value: "product", label: "Products only" },
                  { value: "spare_part", label: "Spare parts only" },
                ]}
                className="form-input-base"
                aria-label="Item type"
              />
            </InputGroup>

            <InputGroup label="Search by name" className="md:col-span-9">
              <input
                type="text"
                value={nameSearchDraft}
                onChange={(event) => setNameSearchDraft(event.target.value)}
                placeholder="Name, SKU, or part number…"
                className="form-input-base"
                aria-label="Search by name"
              />
            </InputGroup>
          </FilterBar>

          <FilterBar className="md:grid-cols-12">
            {showProductFilters ? (
              <>
                <InputGroup label="Product brand" className="md:col-span-3">
                  <SearchableSelect
                    value={productBrandId}
                    onChange={(value) => {
                      setProductBrandId(value ? parseInt(value, 10) : "");
                      setBrowsePage(1);
                    }}
                    placeholder="All product brands"
                    options={productBrands.map((brand) => ({
                      value: brand.id,
                      label: brand.name,
                    }))}
                    className="form-input-base"
                    disabled={metadataLoading}
                    aria-label="Product brand"
                  />
                </InputGroup>
                <InputGroup label="Product category" className="md:col-span-3">
                  <SearchableSelect
                    value={productCategoryId}
                    onChange={(value) => {
                      setProductCategoryId(value ? parseInt(value, 10) : "");
                      setBrowsePage(1);
                    }}
                    placeholder="All product categories"
                    options={productCategories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    className="form-input-base"
                    disabled={metadataLoading}
                    aria-label="Product category"
                  />
                </InputGroup>
              </>
            ) : null}

            {showSpareFilters ? (
              <>
                <InputGroup label="Spare part brand" className="md:col-span-3">
                  <SearchableSelect
                    value={spareBrandId}
                    onChange={(value) => {
                      setSpareBrandId(value ? parseInt(value, 10) : "");
                      setBrowsePage(1);
                    }}
                    placeholder="All spare part brands"
                    options={sparePartBrands.map((brand) => ({
                      value: brand.id,
                      label: brand.name,
                    }))}
                    className="form-input-base"
                    disabled={metadataLoading}
                    aria-label="Spare part brand"
                  />
                </InputGroup>
                <InputGroup label="Spare part category" className="md:col-span-3">
                  <SearchableSelect
                    value={spareCategoryId}
                    onChange={(value) => {
                      setSpareCategoryId(value ? parseInt(value, 10) : "");
                      setBrowsePage(1);
                    }}
                    placeholder="All spare part categories"
                    options={sparePartCategories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    className="form-input-base"
                    disabled={metadataLoading}
                    aria-label="Spare part category"
                  />
                </InputGroup>
              </>
            ) : null}
          </FilterBar>

          <div className="rounded-[1.25rem] border border-outline-variant/10 bg-surface-container-low/40 p-4">
            <div className="mb-3">
              <p className="label-caps text-on-surface-variant">
                Compatible bike
              </p>
              <p className="mt-1 text-xs text-on-surface-variant/80">
                Filter by bike brand, model, and year. Universal items remain
                visible.
              </p>
            </div>
            <BikeCompatibilityFilter
              brands={bikeBrands}
              selectedBrandId={bikeBrandId}
              selectedModel={bikeModel}
              selectedYear={bikeYear}
              isLoading={browseLoading || metadataLoading}
              onFilterChange={(compat) => {
                setBikeBrandId(compat.bike_brand_id);
                setBikeModel(compat.bike_model);
                setBikeYear(compat.bike_year);
                setBrowsePage(1);
              }}
            />
          </div>
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
                ? ` · page ${browsePage} of ${browseTotalPages}`
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
                            record.currency_pricing,
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
              page={browsePage}
              totalPages={browseTotalPages}
              onPrevious={() =>
                setBrowsePage((current) => Math.max(1, current - 1))
              }
              onNext={() =>
                setBrowsePage((current) =>
                  Math.min(browseTotalPages, current + 1),
                )
              }
              onPageChange={setBrowsePage}
            />
          </>
        )}
      </section>
    </PageShell>
  );
}
