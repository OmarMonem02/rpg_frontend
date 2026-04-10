"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listSpareParts,
  listSparePartCategories,
  listBrands,
  listBikeBlueprints,
  createSparePart,
  updateSparePart,
  deleteSparePart,
  createSparePartCategory,
  updateSparePartCategory,
  deleteSparePartCategory,
  assignBlueprintsToSparePart,
  type SparePartRecord,
  type CreateSparePartPayload,
  type SparePartCategoryRecord,
  type BrandRecord,
  type BikeBlueprintRecord,
  type CreateCategoryPayload,
} from "@/lib/crud-api";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import { TabsWrapper } from "@/components/tabs-wrapper";

export default function SparePartsPage() {
  // Spare Parts State
  const [spareParts, setSpareParts] = useState<SparePartRecord[]>([]);
  const [categories, setCategories] = useState<SparePartCategoryRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [sparePartModalOpen, setSparePartModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingSparePart, setEditingSparePart] = useState<SparePartRecord | null>(null);
  const [editingCategory, setEditingCategory] = useState<SparePartCategoryRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">(
    typeof window !== "undefined" && localStorage.getItem("sp_cat_filter")
      ? parseInt(localStorage.getItem("sp_cat_filter")!)
      : ""
  );
  const [brandFilter, setBrandFilter] = useState<number | "">(
    typeof window !== "undefined" && localStorage.getItem("sp_brand_filter")
      ? parseInt(localStorage.getItem("sp_brand_filter")!)
      : ""
  );

  // Load spare parts
  const loadSpareParts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSpareParts(token, page, {
        search: searchFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        brand_id: brandFilter ? Number(brandFilter) : undefined,
      });
      setSpareParts(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spare parts");
    } finally {
      setLoading(false);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const result = await listSparePartCategories(token, 1);
      setCategories(result.items);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  // Load brands
  const loadBrands = async () => {
    try {
      setBrandsLoading(true);
      const token = getAuthToken();
      if (!token) return;
      const result = await listBrands(token, 1, "spare_parts");
      setBrands(result.items);
    } catch (err) {
      console.error("Failed to load brands:", err);
    } finally {
      setBrandsLoading(false);
    }
  };

  // Load bike blueprints
  const loadBlueprints = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const result = await listBikeBlueprints(token, 1);
      setBlueprints(result.items);
    } catch (err) {
      console.error("Failed to load blueprints:", err);
    }
  };

  useEffect(() => {
    loadBrands();
    loadCategories();
    loadBlueprints();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sp_cat_filter", String(categoryFilter));
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sp_brand_filter", String(brandFilter));
    }
  }, [brandFilter]);

  useEffect(() => {
    loadSpareParts();
  }, [page, searchFilter, categoryFilter, brandFilter]);

  // Spare Parts Modal Handlers
  const handleOpenSparePartModal = (part?: SparePartRecord) => {
    setEditingSparePart(part || null);
    setSubmitError(null);
    setSparePartModalOpen(true);
  };

  const handleCloseSparePartModal = () => {
    setSparePartModalOpen(false);
    setEditingSparePart(null);
  };

  const handleSubmitSparePart = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateSparePartPayload = {
        name: String(formData.name),
        sku: String(formData.sku),
        part_number: formData.part_number ? String(formData.part_number) : undefined,
        stock_quantity: formData.stock_quantity ? Number(formData.stock_quantity) : 0,
        low_stock_alarm: formData.low_stock_alarm ? Number(formData.low_stock_alarm) : 0,
        spare_parts_category_id: Number(formData.spare_parts_category_id),
        brand_id: Number(formData.brand_id),
        currency_pricing: String(formData.currency_pricing) as "EGP" | "USD",
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        max_discount_type: String(formData.max_discount_type) as "fixed" | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        universal: formData.universal === true,
        notes: formData.notes ? String(formData.notes) : undefined,
      };

      let sparePart: SparePartRecord;
      if (editingSparePart) {
        sparePart = await updateSparePart(token, editingSparePart.id, payload);
      } else {
        sparePart = await createSparePart(token, payload);
      }

      // Assign blueprints if selected
      const selectedBlueprints = formData.blueprint_ids as number[];
      if (selectedBlueprints && selectedBlueprints.length > 0) {
        await assignBlueprintsToSparePart(token, sparePart.id, selectedBlueprints);
      }

      await loadSpareParts();
      handleCloseSparePartModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save spare part");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSparePart = async (id: number) => {
    if (!confirm("Are you sure you want to delete this spare part?")) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteSparePart(token, id);
      await loadSpareParts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete spare part");
    }
  };

  // Category Modal Handlers
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

      const payload: CreateCategoryPayload = {
        name: String(formData.name),
      };

      if (editingCategory) {
        await updateSparePartCategory(token, editingCategory.id, payload);
      } else {
        await createSparePartCategory(token, payload);
      }

      await loadCategories();
      handleCloseCategoryModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteSparePartCategory(token, id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  // Helper function to get stock status badge
  const getStockBadge = (part: SparePartRecord) => {
    if (part.stock_quantity === 0) {
      return <span className="inline-block rounded bg-error/20 px-2 py-1 text-xs text-error">Out of Stock</span>;
    }
    if (part.stock_quantity <= part.low_stock_alarm) {
      return <span className="inline-block rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-700">Low Stock</span>;
    }
    return <span className="inline-block rounded bg-green-500/20 px-2 py-1 text-xs text-green-700">In Stock</span>;
  };

  const sparePartModalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Part Name",
      type: "text",
      required: true,
      section: "Basic Info",
      sectionDescription: "Start with the part identity your team uses every day.",
      description: "Use the customer-facing or warehouse-recognized part name.",
      placeholder: "Enter part name",
      value: editingSparePart?.name,
      helperTone: "featured",
      summaryValue: ({ value }) => (value ? String(value) : undefined),
    },
    {
      name: "sku",
      label: "SKU",
      type: "text",
      required: true,
      section: "Basic Info",
      description: "Keep the SKU unique and easy to scan in inventory.",
      placeholder: "e.g., SKU-001",
      value: editingSparePart?.sku,
      summaryValue: ({ value }) => (value ? `SKU ${String(value)}` : undefined),
    },
    {
      name: "part_number",
      label: "Part Number",
      type: "text",
      section: "Basic Info",
      description: "Add the maker reference if your team uses manufacturer numbers.",
      placeholder: "e.g., MPN-12345",
      value: editingSparePart?.part_number,
    },
    {
      name: "spare_parts_category_id",
      label: "Category",
      type: "select",
      required: true,
      section: "Classification",
      sectionDescription: "Place the part under the right shelf and supplier grouping.",
      description: "Choose the main spare-parts category.",
      options: categories.map((c) => ({ value: c.id, label: c.name })),
      value: editingSparePart?.spare_parts_category_id,
    },
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      required: true,
      section: "Classification",
      description: "Pick the source brand used in purchasing and reporting.",
      options: brands.map((b) => ({ value: b.id, label: b.name })),
      value: editingSparePart?.brand_id,
      disabled: brandsLoading,
    },
    {
      name: "stock_quantity",
      label: "Stock Quantity",
      type: "number",
      section: "Inventory",
      sectionDescription: "Set the operational numbers that drive stock visibility.",
      description: "Add the opening stock count for this part.",
      placeholder: "0",
      value: editingSparePart?.stock_quantity ?? 0,
      min: 0,
      helperTone: "featured",
    },
    {
      name: "low_stock_alarm",
      label: "Low Stock Alarm",
      type: "number",
      section: "Inventory",
      description: "Set when the team should treat this part as low stock.",
      placeholder: "5",
      value: editingSparePart?.low_stock_alarm ?? 0,
      min: 0,
    },
    {
      name: "cost_price",
      label: "Cost Price",
      type: "number",
      required: true,
      section: "Pricing",
      sectionDescription: "Define the financial baseline before the part goes live.",
      description: "Enter your landed or purchase cost per unit.",
      placeholder: "0.00",
      value: editingSparePart?.cost_price ?? 0,
      min: 0,
      step: "0.01",
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}` : undefined,
    },
    {
      name: "sale_price",
      label: "Sale Price",
      type: "number",
      required: true,
      section: "Pricing",
      description: "Set the selling price your staff should use.",
      placeholder: "0.00",
      value: editingSparePart?.sale_price ?? 0,
      min: 0,
      step: "0.01",
      helperTone: "featured",
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}` : undefined,
    },
    {
      name: "currency_pricing",
      label: "Currency",
      type: "select",
      required: true,
      section: "Pricing",
      description: "Choose the currency shown in inventory and sales.",
      options: [
        { value: "EGP", label: "Egyptian Pound (EGP)" },
        { value: "USD", label: "US Dollar (USD)" },
      ],
      value: editingSparePart?.currency_pricing ?? "EGP",
    },
    {
      name: "max_discount_type",
      label: "Discount Type",
      type: "select",
      required: true,
      section: "Compatibility",
      sectionDescription: "Control discount policy and where this part can be used.",
      description: "Choose whether the discount cap is percentage-based or fixed.",
      options: [
        { value: "percentage", label: "Percentage (%)" },
        { value: "fixed", label: "Fixed Amount" },
      ],
      value: editingSparePart?.max_discount_type ?? "percentage",
    },
    {
      name: "max_discount_value",
      label: "Max Discount Value",
      type: "number",
      section: "Compatibility",
      description: "Set the highest discount your team can apply.",
      placeholder: "0",
      value: editingSparePart?.max_discount_value ?? 0,
      min: 0,
      step: "0.01",
    },
    {
      name: "blueprint_ids",
      label: "Compatible Bike Blueprints",
      type: "multiselect",
      section: "Compatibility",
      description: "Choose the bike blueprints this part fits when it is not universal.",
      options: blueprints.map((bp) => ({
        value: bp.id,
        label: `${bp.model} ${bp.year}`,
      })),
      disabled: (formData) => formData.universal === true,
      span: 2,
      summaryValue: ({ value }) =>
        Array.isArray(value) && value.length > 0 ? `${value.length} blueprint${value.length === 1 ? "" : "s"} linked` : undefined,
    },
    {
      name: "universal",
      label: "Universal Part",
      type: "toggle",
      section: "Compatibility",
      description: "Enable this when the part fits all bikes and blueprint matching is not needed.",
      value: editingSparePart?.universal ?? false,
      helperTone: "featured",
      summaryValue: ({ value }) => (value === true ? "Universal compatibility" : "Blueprint-based compatibility"),
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Notes",
      sectionDescription: "Add any extra context the team may need later.",
      description: "Capture fitment notes, supplier remarks, or quality details.",
      placeholder: "e.g., OEM quality, compatible with...",
      value: editingSparePart?.notes,
      rows: 3,
    },
  ];

  const categoryModalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Category Name",
      type: "text",
      required: true,
      section: "Basic Information",
      description: "e.g., Engine Parts, Brake System, Filters",
      placeholder: "Enter category name",
      value: editingCategory?.name,
    },
  ];

  // Render spare parts tab content
  const sparePartsTabContent = (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-on-surface">Spare Parts</h2>
        <button
          onClick={() => handleOpenSparePartModal()}
          className="rounded bg-primary px-4 py-2 text-on-primary hover:opacity-90"
        >
          + Add Spare Part
        </button>
      </div>

      {error && <div className="rounded bg-error/20 p-4 text-error text-sm">{error}</div>}

      <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by name, SKU..."
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-on-surface"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value ? parseInt(e.target.value) : "");
            setPage(1);
          }}
          className="rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-on-surface"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.target.value ? parseInt(e.target.value) : "");
            setPage(1);
          }}
          className="rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-on-surface"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : spareParts.length === 0 ? (
        <div className="rounded border border-outline-variant/15 bg-surface-container p-8 text-center text-on-surface-variant">
          No spare parts found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-ghost-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                <th className="px-4 py-3 text-center font-semibold text-on-surface">Stock</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Price</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Brand</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {spareParts.map((part) => (
                <tr key={part.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface font-mono text-xs">{part.sku}</td>
                  <td className="px-4 py-3 text-on-surface">{part.name}</td>
                  <td className="px-4 py-3 text-center">{getStockBadge(part)}</td>
                  <td className="px-4 py-3 text-on-surface">
                    {part.sale_price} {part.currency_pricing}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {categories.find((c) => c.id === part.spare_parts_category_id)?.name}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {brands.find((b) => b.id === part.brand_id)?.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenSparePartModal(part)}
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

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-on-surface-variant">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  // Render categories tab content
  const categoriesTabContent = (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-on-surface">Categories</h2>
        <button
          onClick={() => handleOpenCategoryModal()}
          className="rounded bg-primary px-4 py-2 text-on-primary hover:opacity-90"
        >
          + Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded border border-outline-variant/15 bg-surface-container p-8 text-center text-on-surface-variant">
          No categories found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-ghost-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface">{cat.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {cat.created_at ? new Date(cat.created_at).toLocaleDateString() : "-"}
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
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="mb-6 font-display text-2xl font-semibold text-on-surface">Spare Parts Management</h1>

      <TabsWrapper
        tabs={[
          { id: "parts", label: "All Spare Parts", content: sparePartsTabContent },
          { id: "categories", label: "Categories", content: categoriesTabContent },
        ]}
        defaultTabId="parts"
      />

      {/* Spare Part Modal */}
      <EntityFormModal
        title={editingSparePart ? "Edit Spare Part" : "Create Spare Part"}
        description={
          editingSparePart
            ? "Refine stock, pricing, and compatibility details for this spare part."
            : "Build a clean spare part entry with inventory, pricing, and compatibility details in one guided flow."
        }
        fields={sparePartModalFields}
        isOpen={sparePartModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseSparePartModal}
        onSubmit={handleSubmitSparePart}
        submitLabel={editingSparePart ? "Save Spare Part" : "Create Spare Part"}
        heroLabel="Spare Parts"
      />

      {/* Category Modal */}
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
    </div>
  );
}
