"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { formatCatalogPriceInEGP } from "@/lib/currencies";
import {
  listProducts,
  listProductCategories,
  listBrands,
  deleteProduct,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  type ProductRecord,
  type ProductCategoryRecord,
  type BrandRecord,
  fetchAllPages,
} from "@/lib/crud-api";
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

  const loadDropdowns = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const [catsRes, brandsRes] = await Promise.all([
        fetchAllPages((p) => listProductCategories(token, p)),
        fetchAllPages((p) => listBrands(token, p)),
      ]);
      setAllCategories(catsRes);
      setBrands(brandsRes.filter((b) => b.type === "products"));
      setBikeBrands(brandsRes.filter((b) => b.type === "bikes"));
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
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="label-caps px-8 py-4 text-left">Image</th>
                <th className="label-caps px-1 py-4 text-left">SKU <br />Part Number</th>
                <th className="label-caps px-8 py-4 text-left">Name</th>
                <th className="label-caps px-8 py-4 text-left">Stock</th>
                <th className="label-caps px-8 py-4 text-left">Alarm on</th>
                <th className="label-caps px-8 py-4 text-left">Cost Price</th>
                <th className="label-caps px-8 py-4 text-left">Sale Price</th>
                <th className="label-caps px-8 py-4 text-left">Category</th>
                <th className="label-caps px-8 py-4 text-left">Brand</th>
                <th className="label-caps px-8 py-4 text-left">Tags</th>
                <th className="label-caps px-8 py-4 text-left">Is Universal</th>
                <th className="label-caps px-8 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="data-row">
                  <td className="mono-data px-8 py-3 text-xs text-on-surface-variant">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt=""
                        className="h-10 w-10 flex-none rounded-xl object-cover"
                      />
                    ) : null}{" "}
                  </td>
                  <td className="mono-data px-4 py-3 text-xs text-on-surface-variant">
                    {product.sku}<br />
                    {product.part_number}
                  </td>
                  <td className="mono-data px-4 py-3 text-xs text-on-surface-variant">
                    {product.name}</td>
                  
                  <td className="px-4 py-3 text-center">
                    <StockBadge
                      stock_quantity={product.stock_quantity}
                      low_stock_alarm={product.low_stock_alarm}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                  {product.stock_quantity}
                  </td>
                  <td className="mono-data px-4 py-3 text-primary">
                    {formatCatalogPriceInEGP(
                      product.cost_price,
                      product.currency_pricing,
                      rates,
                    )}
                  </td>
                  <td className="mono-data px-4 py-3 text-primary">
                    {formatCatalogPriceInEGP(
                      product.sale_price,
                      product.currency_pricing,
                      rates,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="form-chip">
                      {
                        allCategories.find(
                          (c) => c.id === product.products_category_id,
                        )?.name
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="form-chip bg-primary/8 text-primary border-primary/15">
                      {brands.find((b) => b.id === product.brand_id)?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TagsCell tags={product.tags} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="form-chip bg-primary/8 text-primary border-primary/15">
                      {product.universal ? "Universal" : "Specific"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        router.push(`/inventory/products/edit/${product.id}`)
                      }
                      hidden={!canUpdateProducts}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      hidden={!canDeleteProducts}
                      className="text-error hover:underline text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="label-caps px-4 py-3 text-left">Name</th>
                <th className="label-caps px-4 py-3 text-left">Created</th>
                <th className="label-caps px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="data-row">
                  <td className="px-4 py-3 text-on-surface">{cat.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {cat.created_at
                      ? new Date(cat.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      hidden={!canUpdateProductCategories}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      hidden={!canDeleteProductCategories}
                      className="text-error hover:underline text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
