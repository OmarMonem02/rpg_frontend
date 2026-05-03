"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import {
  listSpareParts,
  listSparePartCategories,
  listBrands,
  deleteSparePart,
  createSparePartCategory,
  updateSparePartCategory,
  deleteSparePartCategory,
  type SparePartRecord,
  type SparePartCategoryRecord,
  type BrandRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import {
  EntityFormModal,
  type FieldConfig,
} from "@/components/entity-form-modal";
import { AdvancedFilters } from "@/components/advanced-filters";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  StatusBadge,
  SurfaceCard,
  TabsWrapper,
} from "@/components/ops-ui";

export default function SparePartsPage() {
  const router = useRouter();
  const [spareParts, setSpareParts] = useState<SparePartRecord[]>([]);
  const [categories, setCategories] = useState<SparePartCategoryRecord[]>([]);
  const [allCategories, setAllCategories] = useState<SparePartCategoryRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [categoriesTotalPages, setCategoriesTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use custom filter hook
  const { filters, page, setPage, getCleanFilters, setSearch, setCategory, setBrand, setPriceMin, setPriceMax, setCurrency, logFilters } = useEntityFilters();

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<SparePartCategoryRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadDropdowns = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const [catsRes, brandsRes] = await Promise.all([
        fetchAllPages((p) => listSparePartCategories(token, p)),
        fetchAllPages((p) => listBrands(token, p, { type: "spare_parts" })),
      ]);
      setAllCategories(catsRes);
      setBrands(brandsRes.filter((b) => b.type === "spare_parts"));
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
        listSpareParts(token, page, cleanFilters as Parameters<typeof listSpareParts>[2]),
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
  }, [page, filters, getCleanFilters, categoriesPage]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const getStockBadge = (part: SparePartRecord) => {
    if (part.stock_quantity <= 0)
      return <StatusBadge tone="default">Out of Stock</StatusBadge>;
    if (part.stock_quantity <= 5)
      return (
        <StatusBadge tone="warning">
          Low Stock ({part.stock_quantity})
        </StatusBadge>
      );
    return (
      <StatusBadge tone="success">In Stock ({part.stock_quantity})</StatusBadge>
    );
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
          <select
            value={filters.category_id || ""}
            onChange={(e) => setCategory(e.target.value ? parseInt(e.target.value) : "")}
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
            onChange={(e) => setBrand(e.target.value ? parseInt(e.target.value) : "")}
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
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  SKU
                </th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  Name
                </th>
                <th className="px-4 py-3 text-center font-semibold text-on-surface">
                  Stock
                </th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  Price
                </th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  Category
                </th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  Brand
                </th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {spareParts.map((part) => (
                <tr
                  key={part.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                >
                  <td className="px-4 py-3 text-on-surface font-mono text-xs">
                    {part.sku}
                  </td>
                  <td className="px-4 py-3 text-on-surface">{part.name}</td>
                  <td className="px-4 py-3 text-center">
                    {getStockBadge(part)}
                  </td>
                  <td className="px-4 py-3 text-on-surface">
                    {part.sale_price} {part.currency_pricing}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {
                      allCategories.find(
                        (c) => c.id === part.spare_parts_category_id,
                      )?.name
                    }
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {brands.find((b) => b.id === part.brand_id)?.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        router.push(`/inventory/spare-parts/edit/${part.id}`)
                      }
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDeleteSparePart(part.id)}
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
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                >
                  <td className="px-4 py-3 text-on-surface">{cat.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {cat.created_at
                      ? new Date(cat.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
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
        onPrevious={() => setCategoriesPage((p) => Math.max(1, p - 1))}
        onNext={() => setCategoriesPage((p) => Math.min(categoriesTotalPages, p + 1))}
      />
    </div>
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory Control"
        title="Spare Parts Management"
        description="Operate parts inventory with stronger filtering, clearer stock signals, and guided create or edit flows."
        actions={
          <ActionButton
            tone="primary"
            onClick={() => router.push("/inventory/spare-parts/create")}
          >
            Add Spare Part
          </ActionButton>
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
