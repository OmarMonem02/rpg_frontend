"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  listProducts,
  listProductCategories,
  listBrands,
  deleteProduct,
  patchProduct,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  type ProductRecord,
  type ProductCategoryRecord,
  type BrandRecord,
  type ProductQuickEditFields,
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
import {
  EntityFormModal,
  type FieldConfig,
} from "@/components/entity-form-modal";
import { StockBadge } from "@/components/inventory/stock-badge";
import { InventoryModuleFilters } from "@/components/inventory/InventoryModuleFilters";
import { ActiveFilterChips } from "@/components/inventory/ActiveFilterChips";
import { buildActiveFilterChips } from "@/lib/inventory-filter-utils";
import {
  ActionButton,
  EmptyState,
  PageHero,
  PageShell,
  PaginationControls,
  TabsWrapper,
} from "@/components/ops-ui";
import { useTableColumns, type TableColumnDef } from "@/hooks/useTableColumns";
import { ColumnPicker } from "@/components/inventory/ColumnPicker";
import { useTablePageSize } from "@/hooks/useTablePageSize";
import { PageSizeSelect } from "@/components/inventory/PageSizeSelect";

type ProductsColumnId =
  | "image" | "sku" | "name" | "stock" | "alarm"
  | "cost_price" | "sale_price" | "profit_amount" | "profit_percent" | "max_discount"
  | "category" | "brand"
  | "size" | "color" | "status"
  | "tags" | "universal" | "actions";

const PRODUCTS_COLUMNS: readonly TableColumnDef<ProductsColumnId>[] = [
  { id: "image", label: "Image" },
  { id: "sku", label: "SKU / Part No." },
  { id: "name", label: "Name" },
  { id: "stock", label: "Stock" },
  { id: "alarm", label: "Alarm on" },
  { id: "cost_price", label: "Cost Price" },
  { id: "sale_price", label: "Sale Price" },
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

const PRODUCT_QUICK_EDIT_KEYS = [
  "name",
  "stock_quantity",
  "low_stock_alarm",
  "cost_price",
  "sale_price",
  "sale_margin_type",
  "sale_margin_value",
] as const;

function parseProductQuickEditChanges(
  changes: QuickEditDraft,
): ProductQuickEditFields {
  const payload: ProductQuickEditFields = {};
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

export default function ProductsPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const { rates } = useExchangeRates();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<ProductCategoryRecord[]>([]);
  const [allCategories, setAllCategories] = useState<ProductCategoryRecord[]>(
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
    getModuleApiParams,
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
  } = useEntityFilters();

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ProductCategoryRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const canCreateProducts = permissions.canCreate("products");
  const canUpdateProducts = permissions.canUpdate("products");
  const canDeleteProducts = permissions.canDelete("products");
  const canCreateProductCategories =
    permissions.canCreate("product-categories");
  const canUpdateProductCategories =
    permissions.canUpdate("product-categories");
  const canDeleteProductCategories =
    permissions.canDelete("product-categories");

  const { isVisible, toggle: toggleColumn, reset: resetColumns, hideOptional: hideOptionalColumns, visible: visibleColumns } = useTableColumns(
    "table-cols:products-catalog",
    PRODUCTS_COLUMNS,
  );

  const { pageSize, setPageSize, apiPerPage, isShowAll } = useTablePageSize(
    "table-page-size:products-catalog",
  );

  const quickEdit = useQuickEditRow();
  const validateProductQuickEdit = combineValidators(
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
        fetchAllPages((p) => listProductCategories(token, p)),
        fetchAllPages((p) => listBrands(token, p)),
      ]);
      setAllCategories(catsRes);
      setBrands(filterBrandsByType(brandsRes, "products"));
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

      const apiFilters = getModuleApiParams("products");

      const [productsRes, catsRes] = await Promise.all([
        listProducts(
          token,
          page,
          { ...(apiFilters as Parameters<typeof listProducts>[2]), per_page: apiPerPage },
        ),
        listProductCategories(token, categoriesPage),
      ]);

      setProducts(productsRes.items);
      setTotalPages(productsRes.lastPage);
      setCategories(catsRes.items);
      setCategoriesTotalPages(catsRes.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, getModuleApiParams, categoriesPage, apiPerPage]);

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
          categories: allCategories.map((c) => ({ value: c.id, label: c.name })),
          brands: brands.map((b) => ({ value: b.id, label: b.name })),
          bikeBrands: bikeBrands.map((b) => ({ value: b.id, label: b.name })),
        },
      }),
    [filters, allCategories, brands, bikeBrands, setFilter, setBikeCompatibility, setPriceMin, setPriceMax],
  );

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProductQuickEdit = async (product: ProductRecord) => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    await quickEdit.saveEdit(
      [...PRODUCT_QUICK_EDIT_KEYS],
      validateProductQuickEdit,
      async (changes) => {
        let payload = parseProductQuickEditChanges(changes);

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
            pricingRecordFromItem(product),
            {
              cost_price: payload.cost_price ?? product.cost_price,
              sale_price: "sale_price" in changes
                ? (payload.sale_price ??
                    Number(quickEdit.draft.sale_price)) ||
                  product.sale_price
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

        const updated = await patchProduct(token, product.id, payload);
        setProducts((prev) =>
          prev.map((row) => (row.id === product.id ? updated : row)),
        );
      },
    );
  };

  const handleDeleteProduct = async (id: number) => {
    if (!canDeleteProducts) {
      setError("You do not have permission to delete products.");
      return;
    }
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      await deleteProduct(token, id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const handleOpenCategoryModal = (category?: ProductCategoryRecord) => {
    if (category && !canUpdateProductCategories) return;
    if (!category && !canCreateProductCategories) return;
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
      if (
        (editingCategory && !canUpdateProductCategories) ||
        (!editingCategory && !canCreateProductCategories)
      ) {
        throw new Error(
          "You do not have permission to save product categories.",
        );
      }
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload = { name: String(formData.name) };

      if (editingCategory) {
        await updateProductCategory(token, editingCategory.id, payload);
      } else {
        await createProductCategory(token, payload);
      }

      const catsRes = await listProductCategories(token, categoriesPage);
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
    if (!canDeleteProductCategories) {
      setError("You do not have permission to delete product categories.");
      return;
    }
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const token = getAuthToken();
      if (!token) return;
      await deleteProductCategory(token, id);
      const catsRes = await listProductCategories(token, categoriesPage);
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
      description: "e.g., Helmets, Jackets, Accessories",
      placeholder: "Enter category name",
      value: editingCategory?.name,
    },
  ];

  // Render products tab content
  const productsTabContent = (
    <div className="space-y-4">
      <InventoryModuleFilters
        module="products"
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
          categories: allCategories.map((c) => ({ value: c.id, label: c.name })),
          brands: brands.map((b) => ({ value: b.id, label: b.name })),
        }}
      />

      <ActiveFilterChips chips={filterChips} onClearAll={resetFilters} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your filters or create a new product to begin building the catalog."
          action={
            canCreateProducts ? (
              <ActionButton
                tone="primary"
                onClick={() => router.push("/inventory/products/create")}
              >
                Create Product
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <InventoryListTable>
          <InventoryListTableToolbar label="Product catalog" count={products.length}>
            <PageSizeSelect
              value={pageSize}
              onChange={(size) => { setPageSize(size); setPage(1); }}
            />
            <ColumnPicker
              columns={PRODUCTS_COLUMNS}
              visible={visibleColumns}
              onToggle={toggleColumn}
              onReset={resetColumns}
              onHideOptional={hideOptionalColumns}
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
                  {isVisible("sale_price") && <InventoryListTableTh>Sale Price</InventoryListTableTh>}
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
              {products.map((product) => {
                const editing = quickEdit.isEditing(product.id);
                const profitPricing = pricingRecordFromItem(
                  editing
                    ? {
                        ...product,
                        cost_price:
                          Number(quickEdit.draft.cost_price) || product.cost_price,
                        sale_price:
                          Number(quickEdit.draft.sale_price) || product.sale_price,
                      }
                    : product,
                );
                const showLoss = isPricingLoss(profitPricing, rates);
                return (
                  <InventoryListTableRow key={product.id} editing={editing}>
                    {isVisible("image") && (
                      <InventoryListTableTd>
                        <InventoryItemThumbnail
                          image={product.image}
                          images={product.images}
                          name={product.name}
                        />
                      </InventoryListTableTd>
                    )}
                    {isVisible("sku") && (
                      <InventoryListTableTd variant="mono">
                        {product.sku}
                        <br />
                        {product.part_number || "—"}
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
                            aria-label="Product name"
                          />
                        ) : (
                          product.name
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
                            stock_quantity={product.stock_quantity}
                            low_stock_alarm={product.low_stock_alarm}
                          />
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("alarm") && (
                      <InventoryListTableTd align="center" variant="mono">
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
                          product.low_stock_alarm
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
                            costCurrency={toPricingCurrency(product.cost_currency)}
                            rates={rates}
                            type="number"
                            min={0}
                            step="any"
                            aria-label="Cost price"
                          />
                        ) : (
                          formatCatalogPriceInEGP(
                            product.cost_price,
                            product.cost_currency,
                            rates,
                          )
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("sale_price") && (
                      <InventoryListTableTd variant="primary">
                        <QuickEditSalePriceCell
                          editing={editing}
                          pricing={pricingRecordFromItem(product)}
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
                        {formatMaxDiscount(product, rates)}
                      </InventoryListTableTd>
                    )}
                    {isVisible("category") && (
                      <InventoryListTableTd>
                        <span className="form-chip">
                          {
                            allCategories.find(
                              (c) => c.id === product.products_category_id,
                            )?.name
                          }
                        </span>
                      </InventoryListTableTd>
                    )}
                    {isVisible("brand") && (
                      <InventoryListTableTd>
                        <span className="form-chip bg-primary/8 text-primary border-primary/15">
                          {brands.find((b) => b.id === product.brand_id)?.name}
                        </span>
                      </InventoryListTableTd>
                    )}
                    {isVisible("size") && (
                      <InventoryListTableTd>{product.size || "—"}</InventoryListTableTd>
                    )}
                    {isVisible("color") && (
                      <InventoryListTableTd>{product.color || "—"}</InventoryListTableTd>
                    )}
                    {isVisible("status") && (
                      <InventoryListTableTd>
                        <ItemStatusBadge status={product.item_status} />
                      </InventoryListTableTd>
                    )}
                    {isVisible("tags") && (
                      <InventoryListTableTd>
                        <TagsCell tags={product.tags} />
                      </InventoryListTableTd>
                    )}
                    {isVisible("universal") && (
                      <InventoryListTableTd>
                        <span className="form-chip bg-primary/8 text-primary border-primary/15">
                          {product.universal ? "Universal" : "Specific"}
                        </span>
                      </InventoryListTableTd>
                    )}
                    <InventoryListTableTd align="right" className="whitespace-nowrap">
                      <QuickEditActions
                        isEditing={editing}
                        saving={quickEdit.saving}
                        canSave={quickEdit.hasChanges([
                          ...PRODUCT_QUICK_EDIT_KEYS,
                        ])}
                        showQuickEdit={canUpdateProducts}
                        onStartEdit={() =>
                          quickEdit.startEdit(product.id, {
                            name: product.name,
                            stock_quantity: product.stock_quantity,
                            low_stock_alarm: product.low_stock_alarm,
                            cost_price: product.cost_price,
                            sale_price: product.sale_price,
                            sale_price_strategy: "adjust_margin",
                            sale_margin_type:
                              product.sale_margin_type ?? "percentage",
                            sale_margin_value: product.sale_margin_value ?? 0,
                          })
                        }
                        onSave={() => handleSaveProductQuickEdit(product)}
                        onCancel={quickEdit.cancelEdit}
                      >
                        <InventoryTableSecondaryActions>
                          <InventoryTableActionLink
                            onClick={() =>
                              router.push(
                                `/inventory/products/edit/${product.id}`,
                              )
                            }
                            hidden={!canUpdateProducts}
                          >
                            Edit
                          </InventoryTableActionLink>
                          {/* <InventoryTableActionDivider /> */}
                          <InventoryTableActionLink
                            tone="danger"
                            onClick={() => handleDeleteProduct(product.id)}
                            hidden={!canDeleteProducts}
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
            Organize products into cleaner catalog groups.
          </p>
        </div>
        {canCreateProductCategories ? (
          <ActionButton
            tone="primary"
            onClick={() => handleOpenCategoryModal()}
          >
            Add Category
          </ActionButton>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Create the first category to give your product catalog a stronger structure."
          action={
            canCreateProductCategories ? (
              <ActionButton
                tone="primary"
                onClick={() => handleOpenCategoryModal()}
              >
                Create Category
              </ActionButton>
            ) : undefined
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
                        hidden={!canUpdateProductCategories}
                      >
                        Edit
                      </InventoryTableActionLink>
                      <InventoryTableActionDivider />
                      <InventoryTableActionLink
                        tone="danger"
                        onClick={() => handleDeleteCategory(cat.id)}
                        hidden={!canDeleteProductCategories}
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
        title="Products Management"
        actions={
          <>
            {canUpdateProducts ? (
              <ActionButton
                variant="outline"
                href="/inventory/products/bulk-edit"
              >
                Bulk edit
              </ActionButton>
            ) : null}
            {canCreateProducts ? (
              <ActionButton
                tone="primary"
                onClick={() => router.push("/inventory/products/create")}
              >
                Add Product
              </ActionButton>
            ) : null}
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
            id: "products",
            label: "All Products",
            content: productsTabContent,
          },
          {
            id: "categories",
            label: "Categories",
            content: categoriesTabContent,
          },
        ]}
        defaultTabId="products"
      />

      {/* Category Modal */}
      <EntityFormModal
        title={editingCategory ? "Edit Category" : "Create Category"}
        description={
          editingCategory
            ? "Update the category details used across your products."
            : "Create a product category with a cleaner setup experience for your catalog."
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
