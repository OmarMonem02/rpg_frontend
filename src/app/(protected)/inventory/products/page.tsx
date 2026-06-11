"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { isPricingLoss } from "@/lib/catalog-pricing";
import { formatCatalogPriceInEGP } from "@/lib/currencies";
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
  QuickEditInput,
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
import { BikeCompatibilityFilter } from "@/components/BikeCompatibilityFilter";
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
  TabsWrapper,
} from "@/components/ops-ui";

const PRODUCT_QUICK_EDIT_KEYS = [
  "name",
  "stock_quantity",
  "low_stock_alarm",
  "cost_price",
  "sale_price",
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

  const quickEdit = useQuickEditRow();
  const validateProductQuickEdit = combineValidators(
    validateNonEmptyName,
    (draft) =>
      validateNonNegativeIntegers(draft, [
        "stock_quantity",
        "low_stock_alarm",
      ]),
    (draft) =>
      validateNonNegativeNumbers(draft, ["cost_price", "sale_price"]),
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

      const cleanFilters = getCleanFilters();

      const [productsRes, catsRes] = await Promise.all([
        listProducts(
          token,
          page,
          cleanFilters as Parameters<typeof listProducts>[2],
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
  }, [page, getCleanFilters, categoriesPage]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveDataRefresh(loadData);

  const handleSaveProductQuickEdit = async (product: ProductRecord) => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    await quickEdit.saveEdit(
      [...PRODUCT_QUICK_EDIT_KEYS],
      validateProductQuickEdit,
      async (changes) => {
        const updated = await patchProduct(
          token,
          product.id,
          parseProductQuickEditChanges(changes),
        );
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
          <select
            value={filters.category_id || ""}
            onChange={(e) =>
              setCategory(e.target.value ? parseInt(e.target.value) : "")
            }
            className="form-input-base"
          >
            <option value="">All Categories</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </InputGroup>
        <InputGroup label="Brand" className="md:col-span-4">
          <select
            value={filters.brand_id || ""}
            onChange={(e) =>
              setBrand(e.target.value ? parseInt(e.target.value) : "")
            }
            className="form-input-base"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
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
            Filter products by bike brand, model, and year. Universal products
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
          <InventoryListTableToolbar label="Product catalog" count={products.length} />
          <InventoryListTableScroll>
            <InventoryListTableElement minWidth="1280px">
              <InventoryListTableHead>
                <tr>
                  <InventoryListTableTh className="w-14">Image</InventoryListTableTh>
                  <InventoryListTableTh>
                    SKU
                    <br />
                    Part Number
                  </InventoryListTableTh>
                  <InventoryListTableTh>Name</InventoryListTableTh>
                  <InventoryListTableTh align="center">Stock</InventoryListTableTh>
                  <InventoryListTableTh align="center">Alarm on</InventoryListTableTh>
                  <InventoryListTableTh>Cost Price</InventoryListTableTh>
                  <InventoryListTableTh>Sale Price</InventoryListTableTh>
                  <InventoryListTableTh>Category</InventoryListTableTh>
                  <InventoryListTableTh>Brand</InventoryListTableTh>
                  <InventoryListTableTh>Tags</InventoryListTableTh>
                  <InventoryListTableTh>Universal</InventoryListTableTh>
                  <InventoryListTableTh align="center">Actions</InventoryListTableTh>
                </tr>
              </InventoryListTableHead>
              <InventoryListTableBody>
              {products.map((product) => {
                const editing = quickEdit.isEditing(product.id);
                return (
                  <InventoryListTableRow key={product.id} editing={editing}>
                    <InventoryListTableTd>
                      <InventoryItemThumbnail
                        image={product.image}
                        name={product.name}
                      />
                    </InventoryListTableTd>
                    <InventoryListTableTd variant="mono">
                      {product.sku}
                      <br />
                      {product.part_number || "—"}
                    </InventoryListTableTd>
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
                    <InventoryListTableTd variant="primary">
                      {editing ? (
                        <QuickEditInput
                          value={quickEdit.draft.cost_price ?? ""}
                          onChange={(value) =>
                            quickEdit.updateField("cost_price", value)
                          }
                          type="number"
                          min={0}
                          step="any"
                          aria-label="Cost price"
                        />
                      ) : (
                        formatCatalogPriceInEGP(
                          product.cost_price,
                          product.cost_currency ?? product.currency_pricing,
                          rates,
                        )
                      )}
                    </InventoryListTableTd>
                    <InventoryListTableTd variant="primary">
                      {editing ? (
                        <QuickEditInput
                          value={quickEdit.draft.sale_price ?? ""}
                          onChange={(value) =>
                            quickEdit.updateField("sale_price", value)
                          }
                          type="number"
                          min={0}
                          step="any"
                          aria-label="Sale price"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          {formatCatalogPriceInEGP(
                            product.sale_price,
                            product.sale_currency ?? product.currency_pricing,
                            rates,
                          )}
                          {rates &&
                          isPricingLoss(
                            {
                              cost_price: product.cost_price,
                              cost_currency:
                                product.cost_currency ?? product.currency_pricing,
                              sale_price: product.sale_price,
                              sale_currency:
                                product.sale_currency ?? product.currency_pricing,
                            },
                            rates,
                          ) ? (
                            <span className="rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-error">
                              Loss
                            </span>
                          ) : null}
                        </span>
                      )}
                    </InventoryListTableTd>
                    <InventoryListTableTd>
                      <span className="form-chip">
                        {
                          allCategories.find(
                            (c) => c.id === product.products_category_id,
                          )?.name
                        }
                      </span>
                    </InventoryListTableTd>
                    <InventoryListTableTd>
                      <span className="form-chip bg-primary/8 text-primary border-primary/15">
                        {brands.find((b) => b.id === product.brand_id)?.name}
                      </span>
                    </InventoryListTableTd>
                    <InventoryListTableTd>
                      <TagsCell tags={product.tags} />
                    </InventoryListTableTd>
                    <InventoryListTableTd>
                      <span className="form-chip bg-primary/8 text-primary border-primary/15">
                        {product.universal ? "Universal" : "Specific"}
                      </span>
                    </InventoryListTableTd>
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

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
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
