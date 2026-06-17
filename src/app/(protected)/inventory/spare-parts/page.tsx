"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import {
  formatCatalogProfitAmount,
  formatCatalogProfitPercent,
  isPricingLoss,
  pricingRecordFromItem,
  resolveMarginQuickEditPricing,
  type SaleMarginType,
  type SalePriceQuickEditStrategy,
} from "@/lib/catalog-pricing";
import { formatCatalogPriceInEGP, toPricingCurrency } from "@/lib/currencies";
import { formatMaxDiscount } from "@/lib/item-lookup";
import { ItemStatusBadge } from "@/lib/inventory-item-attributes";
import {
  listSpareParts,
  listSparePartCategories,
  listBrands,
  deleteSparePart,
  updateSparePart,
  buildSparePartQuickEditPayload,
  createSparePartCategory,
  updateSparePartCategory,
  deleteSparePartCategory,
  type SparePartRecord,
  type SparePartCategoryRecord,
  type BrandRecord,
  type SparePartQuickEditFields,
  fetchAllPages,
} from "@/lib/crud-api";
import { filterBrandsByType } from "@/lib/brand-types";
import {
  QuickEditActions,
  QuickEditCostPriceCell,
  QuickEditInput,
  QuickEditSalePriceCell,
  combineValidators,
  useQuickEditRow,
  validateNonEmptyName,
  validateNonNegativeIntegers,
  validateNonNegativeNumbers,
  type QuickEditDraft,
} from "@/components/inventory/quick-edit";
import {
  InventoryItemThumbnail,
  InventoryListTable,
  InventoryListTableBody,
  InventoryListTableElement,
  InventoryListTableError,
  InventoryListTableHead,
  InventoryListTableRow,
  InventoryListTableScroll,
  InventoryListTableTd,
  InventoryListTableTh,
  InventoryListTableToolbar,
  InventoryTableActionDivider,
  InventoryTableActionLink,
  InventoryTableSecondaryActions,
} from "@/components/inventory/list-table";
import { BikeCompatibilityFilter } from "@/components/BikeCompatibilityFilter";
import {
  EntityFormModal,
  type FieldConfig,
} from "@/components/entity-form-modal";
import { AdvancedFilters } from "@/components/advanced-filters";
import { StockBadge } from "@/components/inventory/stock-badge";
import { TagInput } from "@/components/TagInput";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SearchableSelect,
  TabsWrapper,
} from "@/components/ops-ui";
import { useTableColumns, type TableColumnDef } from "@/hooks/useTableColumns";
import { ColumnPicker } from "@/components/inventory/ColumnPicker";
import { useTablePageSize } from "@/hooks/useTablePageSize";
import { PageSizeSelect } from "@/components/inventory/PageSizeSelect";

type SparePartsColumnId =
  | "image" | "sku" | "name" | "stock" | "alarm"
  | "cost_price" | "price" | "profit_amount" | "profit_percent" | "max_discount"
  | "category" | "brand"
  | "size" | "color" | "status"
  | "tags" | "universal" | "actions";

const SPARE_PARTS_COLUMNS: readonly TableColumnDef<SparePartsColumnId>[] = [
  { id: "image", label: "Image" },
  { id: "sku", label: "SKU / Part No." },
  { id: "name", label: "Name" },
  { id: "stock", label: "Stock" },
  { id: "alarm", label: "Alarm on" },
  { id: "cost_price", label: "Cost Price" },
  { id: "price", label: "Price" },
  { id: "profit_amount", label: "Profit" },
  { id: "profit_percent", label: "Profit %" },
  { id: "max_discount", label: "Max Discount" },
  { id: "category", label: "Category" },
  { id: "brand", label: "Brand" },
  { id: "size", label: "Size" },
  { id: "color", label: "Color" },
  { id: "status", label: "Status" },
  { id: "tags", label: "Tags" },
  { id: "universal", label: "Universal" },
  { id: "actions", label: "Actions", required: true },
];

const SPARE_PART_QUICK_EDIT_KEYS = [
  "name",
  "stock_quantity",
  "low_stock_alarm",
  "cost_price",
  "sale_price",
  "sale_margin_type",
  "sale_margin_value",
] as const;

function parseSparePartQuickEditChanges(
  changes: QuickEditDraft,
): SparePartQuickEditFields {
  const payload: SparePartQuickEditFields = {};
  if ("name" in changes) payload.name = changes.name.trim();
  if ("stock_quantity" in changes) {
    payload.stock_quantity = Number(changes.stock_quantity);
  }
  if ("low_stock_alarm" in changes) {
    payload.low_stock_alarm = Number(changes.low_stock_alarm);
  }
  if ("cost_price" in changes) payload.cost_price = Number(changes.cost_price);
  if ("sale_price" in changes) payload.sale_price = Number(changes.sale_price);
  return payload;
}

function TagsCell({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) {
    return <span className="text-xs text-on-surface-variant">—</span>;
  }

  const visible = tags.slice(0, 1);
  const remaining = tags.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <span key={tag} className="form-chip text-xs">
          {tag}
        </span>
      ))}
      {remaining > 0 ? (
        <span className="text-xs text-on-surface-variant">+{remaining} more</span>
      ) : null}
    </div>
  );
}

export default function SparePartsPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const { rates } = useExchangeRates();
  const canUpdateSpareParts = permissions.canUpdate("spare-parts");
  const [spareParts, setSpareParts] = useState<SparePartRecord[]>([]);
  const [categories, setCategories] = useState<SparePartCategoryRecord[]>([]);
  const [allCategories, setAllCategories] = useState<SparePartCategoryRecord[]>(
    [],
  );
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [bikeBrands, setBikeBrands] = useState<BrandRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [categoriesTotalPages, setCategoriesTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use custom filter hook
  const {
    filters,
    page,
    setPage,
    getCleanFilters,
    setSearch,
    setCategory,
    setBrand,
    setPriceMin,
    setPriceMax,
    setCurrency,
    setBikeCompatibility,
    setTags,
  } = useEntityFilters();

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<SparePartCategoryRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { isVisible, toggle: toggleColumn, reset: resetColumns, visible: visibleColumns } = useTableColumns(
    "table-cols:spare-parts-catalog",
    SPARE_PARTS_COLUMNS,
  );

  const { pageSize, setPageSize, apiPerPage, isShowAll } = useTablePageSize(
    "table-page-size:spare-parts-catalog",
  );

  const quickEdit = useQuickEditRow();
  const validateSparePartQuickEdit = combineValidators(
    validateNonEmptyName,
    (draft) =>
      validateNonNegativeIntegers(draft, [
        "stock_quantity",
        "low_stock_alarm",
      ]),
    (draft) =>
      validateNonNegativeNumbers(draft, [
        "cost_price",
        "sale_price",
        "sale_margin_value",
      ]),
  );

  const loadDropdowns = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const [catsRes, brandsRes] = await Promise.all([
        fetchAllPages((p) => listSparePartCategories(token, p)),
        fetchAllPages((p) => listBrands(token, p)),
      ]);
      setAllCategories(catsRes);
      setBrands(filterBrandsByType(brandsRes, "spare_parts"));
      setBikeBrands(filterBrandsByType(brandsRes, "bikes"));
    } catch (err) {
      console.error("Failed to load dropdowns:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const cleanFilters = getCleanFilters();

      const [partsRes, catsRes] = await Promise.all([
        listSpareParts(
          token,
          page,
          { ...(cleanFilters as Parameters<typeof listSpareParts>[2]), per_page: apiPerPage },
        ),
        listSparePartCategories(token, categoriesPage),
      ]);

      setSpareParts(partsRes.items);
      setTotalPages(partsRes.lastPage);
      setCategories(catsRes.items);
      setCategoriesTotalPages(catsRes.lastPage);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load spare parts",
      );
    } finally {
      setLoading(false);
    }
  }, [page, getCleanFilters, categoriesPage, apiPerPage]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSparePartQuickEdit = async (part: SparePartRecord) => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    await quickEdit.saveEdit(
      [...SPARE_PART_QUICK_EDIT_KEYS],
      validateSparePartQuickEdit,
      async (changes) => {
        let payload = parseSparePartQuickEditChanges(changes);

        const marginPricingTouched =
          "sale_price" in changes ||
          "sale_margin_type" in changes ||
          "sale_margin_value" in changes;

        if (marginPricingTouched) {
          const strategy = (quickEdit.draft.sale_price_strategy ===
          "switch_manual"
            ? "switch_manual"
            : "adjust_margin") as SalePriceQuickEditStrategy;
          const draftMarginType = (
            quickEdit.draft.sale_margin_type === "fixed"
              ? "fixed"
              : "percentage"
          ) as SaleMarginType;
          const pricingResult = resolveMarginQuickEditPricing(
            pricingRecordFromItem(part),
            {
              cost_price: payload.cost_price ?? part.cost_price,
              sale_price: "sale_price" in changes
                ? (payload.sale_price ??
                    Number(quickEdit.draft.sale_price)) ||
                  part.sale_price
                : undefined,
              sale_margin_type: draftMarginType,
              sale_margin_value: "sale_margin_value" in changes
                ? Number(quickEdit.draft.sale_margin_value) || 0
                : undefined,
            },
            rates ?? { usdToEgp: 1, eurToEgp: 1 },
            strategy,
          );
          if (!pricingResult.ok) {
            throw new Error(pricingResult.error);
          }
          payload = { ...payload, ...pricingResult.fields };
        }

        const updated = await updateSparePart(
          token,
          part.id,
          buildSparePartQuickEditPayload(part, payload),
        );
        setSpareParts((prev) =>
          prev.map((row) => (row.id === part.id ? updated : row)),
        );
      },
    );
  };

  const handleDeleteSparePart = async (id: number) => {
    if (!confirm("Are you sure you want to delete this spare part?")) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      await deleteSparePart(token, id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete spare part",
      );
    }
  };

  const handleOpenCategoryModal = (category?: SparePartCategoryRecord) => {
    setEditingCategory(category || null);
    setSubmitError(null);
    setCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleSubmitCategory = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload = { name: String(formData.name) };

      if (editingCategory) {
        await updateSparePartCategory(token, editingCategory.id, payload);
      } else {
        await createSparePartCategory(token, payload);
      }

      const catsRes = await listSparePartCategories(token, categoriesPage);
      setCategories(catsRes.items);
      setCategoriesTotalPages(catsRes.lastPage);
      loadDropdowns();
      handleCloseCategoryModal();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save category",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      await deleteSparePartCategory(token, id);
      const catsRes = await listSparePartCategories(token, categoriesPage);
      setCategories(catsRes.items);
      setCategoriesTotalPages(catsRes.lastPage);
      loadDropdowns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    }
  };

  const categoryModalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Category Name",
      type: "text",
      required: true,
      section: "Basic Information",
      description: "e.g., Engine Components, Braking, Electrical",
      placeholder: "Enter category name",
      value: editingCategory?.name,
    },
  ];

  // Render spare parts tab content
  const sparePartsTabContent = (
    <div className="space-y-4">
      <FilterBar className="md:grid-cols-12">
        <InputGroup label="Search" className="md:col-span-4">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={filters.search || ""}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input-base"
          />
        </InputGroup>
        <InputGroup label="Category" className="md:col-span-4">
          <SearchableSelect
            value={filters.category_id || ""}
            onChange={(value) =>
              setCategory(value ? parseInt(value) : "")
            }
            placeholder="All Categories"
            options={allCategories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            className="form-input-base"
          />
        </InputGroup>
        <InputGroup label="Brand" className="md:col-span-4">
          <SearchableSelect
            value={filters.brand_id || ""}
            onChange={(value) =>
              setBrand(value ? parseInt(value) : "")
            }
            placeholder="All Brands"
            options={brands.map((b) => ({
              value: b.id,
              label: b.name,
            }))}
            className="form-input-base"
          />
        </InputGroup>
      </FilterBar>

      <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4">
        <TagInput
          label="Tags"
          value={filters.tags ?? []}
          onChange={setTags}
          placeholder="e.g., Black"
          addButtonLabel="Add tag"
          description="Add one or more tags to narrow results. Items must match every tag."
        />
      </div>

      <AdvancedFilters
        priceMin={filters.price_min}
        setPriceMin={setPriceMin}
        priceMax={filters.price_max}
        setPriceMax={setPriceMax}
        currency={filters.currency || "all"}
        setCurrency={setCurrency}
        showPriceFilters={true}
        showCurrencyFilter={true}
      />

      <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-4">
        <div className="mb-3">
          <p className="label-caps text-on-surface-variant">Compatible Bike</p>
          <p className="mt-1 text-xs text-on-surface-variant/80">
            Filter spare parts by bike brand, model, and year. Universal parts
            remain visible.
          </p>
        </div>
        <BikeCompatibilityFilter
          brands={bikeBrands}
          selectedBrandId={filters.bike_brand_id}
          selectedModel={filters.bike_model}
          selectedYear={filters.bike_year}
          isLoading={loading}
          onFilterChange={(compat) => setBikeCompatibility(compat)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : spareParts.length === 0 ? (
        <EmptyState
          title="No spare parts found"
          description="Try adjusting your filters or create a new spare part to begin building the catalog."
          action={
            <ActionButton
              tone="primary"
              onClick={() => router.push("/inventory/spare-parts/create")}
            >
              Create Spare Part
            </ActionButton>
          }
        />
      ) : (
        <InventoryListTable>
          <InventoryListTableToolbar label="Spare parts catalog" count={spareParts.length}>
            <PageSizeSelect
              value={pageSize}
              onChange={(size) => { setPageSize(size); setPage(1); }}
            />
            <ColumnPicker
              columns={SPARE_PARTS_COLUMNS}
              visible={visibleColumns}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </InventoryListTableToolbar>
          <InventoryListTableScroll>
            <InventoryListTableElement minWidth="1520px">
              <InventoryListTableHead>
                <tr>
                  {isVisible("image") && <InventoryListTableTh className="w-14">Image</InventoryListTableTh>}
                  {isVisible("sku") && (
                    <InventoryListTableTh>
                      SKU
                      <br />
                      Part Number
                    </InventoryListTableTh>
                  )}
                  {isVisible("name") && <InventoryListTableTh>Name</InventoryListTableTh>}
                  {isVisible("stock") && <InventoryListTableTh align="center">Stock</InventoryListTableTh>}
                  {isVisible("alarm") && <InventoryListTableTh align="center">Alarm on</InventoryListTableTh>}
                  {isVisible("cost_price") && <InventoryListTableTh>Cost Price</InventoryListTableTh>}
                  {isVisible("price") && <InventoryListTableTh>Price</InventoryListTableTh>}
                  {isVisible("profit_amount") && <InventoryListTableTh>Profit</InventoryListTableTh>}
                  {isVisible("profit_percent") && <InventoryListTableTh>Profit %</InventoryListTableTh>}
                  {isVisible("max_discount") && <InventoryListTableTh>Max Discount</InventoryListTableTh>}
                  {isVisible("category") && <InventoryListTableTh>Category</InventoryListTableTh>}
                  {isVisible("brand") && <InventoryListTableTh>Brand</InventoryListTableTh>}
                  {isVisible("size") && <InventoryListTableTh>Size</InventoryListTableTh>}
                  {isVisible("color") && <InventoryListTableTh>Color</InventoryListTableTh>}
                  {isVisible("status") && <InventoryListTableTh>Status</InventoryListTableTh>}
                  {isVisible("tags") && <InventoryListTableTh>Tags</InventoryListTableTh>}
                  {isVisible("universal") && <InventoryListTableTh>Universal</InventoryListTableTh>}
                  <InventoryListTableTh align="center">Actions</InventoryListTableTh>
                </tr>
              </InventoryListTableHead>
              <InventoryListTableBody>
              {spareParts.map((part) => {
                const editing = quickEdit.isEditing(part.id);
                const profitPricing = pricingRecordFromItem(
                  editing
                    ? {
                        ...part,
                        cost_price:
                          Number(quickEdit.draft.cost_price) || part.cost_price,
                        sale_price:
                          Number(quickEdit.draft.sale_price) || part.sale_price,
                      }
                    : part,
                );
                const showLoss = isPricingLoss(profitPricing, rates);
                return (
                  <InventoryListTableRow key={part.id} editing={editing}>
                    {isVisible("image") && (
                      <InventoryListTableTd>
                        <InventoryItemThumbnail image={part.image} images={part.images} name={part.name} />
                      </InventoryListTableTd>
                    )}
                    {isVisible("sku") && (
                      <InventoryListTableTd variant="mono">
                        {part.sku}
                        <br />
                        {part.part_number || "—"}
                      </InventoryListTableTd>
                    )}
                    {isVisible("name") && (
                      <InventoryListTableTd variant="name">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.name ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("name", value)
                            }
                            aria-label="Spare part name"
                          />
                        ) : (
                          part.name
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("stock") && (
                      <InventoryListTableTd align="center">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.stock_quantity ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("stock_quantity", value)
                            }
                            type="number"
                            min={0}
                            step={1}
                            align="center"
                            aria-label="Stock quantity"
                          />
                        ) : (
                          <StockBadge
                            stock_quantity={part.stock_quantity}
                            low_stock_alarm={part.low_stock_alarm}
                          />
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("alarm") && (
                      <InventoryListTableTd align="center">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.low_stock_alarm ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("low_stock_alarm", value)
                            }
                            type="number"
                            min={0}
                            step={1}
                            align="center"
                            aria-label="Low stock alarm"
                          />
                        ) : (
                          <span className="form-chip bg-primary/8 text-primary border-primary/15">
                            {part.low_stock_alarm}
                          </span>
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("cost_price") && (
                      <InventoryListTableTd variant="primary">
                        {editing ? (
                          <QuickEditCostPriceCell
                            value={quickEdit.draft.cost_price ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("cost_price", value)
                            }
                            costCurrency={toPricingCurrency(part.cost_currency)}
                            rates={rates}
                            type="number"
                            min={0}
                            step="any"
                            aria-label="Cost price"
                          />
                        ) : (
                          formatCatalogPriceInEGP(
                            part.cost_price,
                            part.cost_currency,
                            rates,
                          )
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("price") && (
                      <InventoryListTableTd variant="primary">
                        <QuickEditSalePriceCell
                          editing={editing}
                          pricing={pricingRecordFromItem(part)}
                          rates={rates}
                          salePriceValue={quickEdit.draft.sale_price ?? ""}
                          salePriceStrategy={
                            quickEdit.draft.sale_price_strategy ===
                            "switch_manual"
                              ? "switch_manual"
                              : "adjust_margin"
                          }
                          saleMarginType={
                            quickEdit.draft.sale_margin_type === "fixed"
                              ? "fixed"
                              : "percentage"
                          }
                          saleMarginValue={
                            quickEdit.draft.sale_margin_value ?? ""
                          }
                          onSalePriceChange={(value) =>
                            quickEdit.updateField("sale_price", value)
                          }
                          onStrategyChange={(strategy) =>
                            quickEdit.updateField("sale_price_strategy", strategy)
                          }
                          onSaleMarginTypeChange={(type) =>
                            quickEdit.updateField("sale_margin_type", type)
                          }
                          onSaleMarginValueChange={(value) =>
                            quickEdit.updateField("sale_margin_value", value)
                          }
                        />
                      </InventoryListTableTd>
                    )}
                    {isVisible("profit_amount") && (
                      <InventoryListTableTd
                        variant="mono"
                        className={showLoss ? "text-warning" : undefined}
                      >
                        {formatCatalogProfitAmount(profitPricing, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("profit_percent") && (
                      <InventoryListTableTd
                        variant="mono"
                        className={showLoss ? "text-warning" : undefined}
                      >
                        {formatCatalogProfitPercent(profitPricing, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("max_discount") && (
                      <InventoryListTableTd variant="muted">
                        {formatMaxDiscount(part, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("category") && (
                      <InventoryListTableTd>
                        <span className="form-chip">
                          {
                            allCategories.find(
                              (c) => c.id === part.spare_parts_category_id,
                            )?.name
                          }
                        </span>
                      </InventoryListTableTd>
                    )}
                    {isVisible("brand") && (
                      <InventoryListTableTd>
                        <span className="form-chip bg-primary/8 text-primary border-primary/15">
                          {brands.find((b) => b.id === part.brand_id)?.name}
                        </span>
                      </InventoryListTableTd>
                    )}
                    {isVisible("size") && (
                      <InventoryListTableTd>
                        {part.size || "—"}
                      </InventoryListTableTd>
                    )}
                    {isVisible("color") && (
                      <InventoryListTableTd>
                        {part.color || "—"}
                      </InventoryListTableTd>
                    )}
                    {isVisible("status") && (
                      <InventoryListTableTd>
                        <ItemStatusBadge status={part.item_status} />
                      </InventoryListTableTd>
                    )}
                    {isVisible("tags") && (
                      <InventoryListTableTd>
                        <TagsCell tags={part.tags} />
                      </InventoryListTableTd>
                    )}
                    {isVisible("universal") && (
                      <InventoryListTableTd>
                        <span className="form-chip bg-primary/8 text-primary border-primary/15">
                          {part.universal ? "Universal" : "Specific"}
                        </span>
                      </InventoryListTableTd>
                    )}
                    <InventoryListTableTd align="right" className="whitespace-nowrap">
                      <QuickEditActions
                        isEditing={editing}
                        saving={quickEdit.saving}
                        canSave={quickEdit.hasChanges([
                          ...SPARE_PART_QUICK_EDIT_KEYS,
                        ])}
                        showQuickEdit={canUpdateSpareParts}
                        onStartEdit={() =>
                          quickEdit.startEdit(part.id, {
                            name: part.name,
                            stock_quantity: part.stock_quantity,
                            low_stock_alarm: part.low_stock_alarm,
                            cost_price: part.cost_price,
                            sale_price: part.sale_price,
                            sale_price_strategy: "adjust_margin",
                            sale_margin_type:
                              part.sale_margin_type ?? "percentage",
                            sale_margin_value: part.sale_margin_value ?? 0,
                          })
                        }
                        onSave={() => handleSaveSparePartQuickEdit(part)}
                        onCancel={quickEdit.cancelEdit}
                      >
                        <InventoryTableSecondaryActions>
                          <InventoryTableActionLink
                            onClick={() =>
                              router.push(
                                `/inventory/spare-parts/edit/${part.id}`,
                              )
                            }
                            hidden={!canUpdateSpareParts}
                          >
                            Edit
                          </InventoryTableActionLink>
                          <InventoryTableActionDivider />
                          <InventoryTableActionLink
                            tone="danger"
                            onClick={() => handleDeleteSparePart(part.id)}
                          >
                            Delete
                          </InventoryTableActionLink>
                        </InventoryTableSecondaryActions>
                      </QuickEditActions>
                      {editing && quickEdit.rowError ? (
                        <InventoryListTableError message={quickEdit.rowError} />
                      ) : null}
                    </InventoryListTableTd>
                  </InventoryListTableRow>
                );
              })}
              </InventoryListTableBody>
            </InventoryListTableElement>
          </InventoryListTableScroll>
        </InventoryListTable>
      )}

      {!isShowAll && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPrevious={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  );

  // Render categories tab content
  const categoriesTabContent = (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">Categories</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Organize spare parts into cleaner catalog groups.
          </p>
        </div>
        <ActionButton tone="primary" onClick={() => handleOpenCategoryModal()}>
          Add Category
        </ActionButton>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Create the first category to give your spare-parts inventory a stronger structure."
          action={
            <ActionButton
              tone="primary"
              onClick={() => handleOpenCategoryModal()}
            >
              Create Category
            </ActionButton>
          }
        />
      ) : (
        <InventoryListTable>
          <InventoryListTableToolbar label="Categories" count={categories.length} />
          <InventoryListTableScroll>
            <InventoryListTableElement minWidth="560px">
              <InventoryListTableHead>
                <tr>
                  <InventoryListTableTh>Name</InventoryListTableTh>
                  <InventoryListTableTh>Created</InventoryListTableTh>
                  <InventoryListTableTh align="center">Actions</InventoryListTableTh>
                </tr>
              </InventoryListTableHead>
              <InventoryListTableBody>
              {categories.map((cat) => (
                <InventoryListTableRow key={cat.id}>
                  <InventoryListTableTd variant="name">{cat.name}</InventoryListTableTd>
                  <InventoryListTableTd variant="muted">
                    {cat.created_at
                      ? new Date(cat.created_at).toLocaleDateString()
                      : "-"}
                  </InventoryListTableTd>
                  <InventoryListTableTd align="right" className="whitespace-nowrap">
                    <InventoryTableSecondaryActions>
                      <InventoryTableActionLink
                        onClick={() => handleOpenCategoryModal(cat)}
                      >
                        Edit
                      </InventoryTableActionLink>
                      {/* <InventoryTableActionDivider /> */}
                      <InventoryTableActionLink
                        tone="danger"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        Delete
                      </InventoryTableActionLink>
                    </InventoryTableSecondaryActions>
                  </InventoryListTableTd>
                </InventoryListTableRow>
              ))}
              </InventoryListTableBody>
            </InventoryListTableElement>
          </InventoryListTableScroll>
        </InventoryListTable>
      )}

      <PaginationControls
        page={categoriesPage}
        totalPages={categoriesTotalPages}
        onPageChange={setCategoriesPage}
        onPrevious={() => setCategoriesPage((p) => Math.max(1, p - 1))}
        onNext={() =>
          setCategoriesPage((p) => Math.min(categoriesTotalPages, p + 1))
        }
      />
    </div>
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory Control"
        title="Spare Parts Management"
        actions={
          <>
            {canUpdateSpareParts ? (
              <ActionButton
                variant="outline"
                href="/inventory/spare-parts/bulk-edit"
              >
                Bulk edit
              </ActionButton>
            ) : null}
            <ActionButton
              tone="primary"
              onClick={() => router.push("/inventory/spare-parts/create")}
            >
              Add Spare Part
            </ActionButton>
          </>
        }
      />

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error mb-4">
          {error}
        </div>
      )}

      <TabsWrapper
        tabs={[
          {
            id: "parts",
            label: "All Spare Parts",
            content: sparePartsTabContent,
          },
          {
            id: "categories",
            label: "Categories",
            content: categoriesTabContent,
          },
        ]}
        defaultTabId="parts"
      />

      <EntityFormModal
        title={editingCategory ? "Edit Category" : "Create Category"}
        description={
          editingCategory
            ? "Adjust the category details for better organization."
            : "Create a new spare parts category so your inventory stays organized from the start."
        }
        fields={categoryModalFields}
        isOpen={categoryModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseCategoryModal}
        onSubmit={handleSubmitCategory}
        submitLabel={editingCategory ? "Save Category" : "Create Category"}
        heroLabel="Category Setup"
      />
    </PageShell>
  );
}
