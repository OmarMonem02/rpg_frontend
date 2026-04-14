"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listProducts,
  listProductCategories,
  listBrands,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  type ProductRecord,
  type CreateProductPayload,
  type ProductCategoryRecord,
  type BrandRecord,
  type CreateCategoryPayload,
} from "@/lib/crud-api";
import {
  EntityFormModal,
  type FieldConfig,
} from "@/components/entity-form-modal";
import { TabsWrapper } from "@/components/tabs-wrapper";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  StatusBadge,
} from "@/components/ops-ui";

export default function ProductsPage() {
  // Products State
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<ProductCategoryRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(
    null,
  );
  const [editingCategory, setEditingCategory] =
    useState<ProductCategoryRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">(
    typeof window !== "undefined" && localStorage.getItem("p_cat_filter")
      ? parseInt(localStorage.getItem("p_cat_filter")!)
      : "",
  );
  const [brandFilter, setBrandFilter] = useState<number | "">(
    typeof window !== "undefined" && localStorage.getItem("p_brand_filter")
      ? parseInt(localStorage.getItem("p_brand_filter")!)
      : "",
  );

  // Load products
  const loadProducts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listProducts(token, page, {
        search: searchFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        brand_id: brandFilter ? Number(brandFilter) : undefined,
      });
      setProducts(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const result = await listProductCategories(token, 1);
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
      const result = await listBrands(token, 1, "products");
      setBrands(result.items);
    } catch (err) {
      console.error("Failed to load brands:", err);
    } finally {
      setBrandsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
    loadCategories();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("p_cat_filter", String(categoryFilter));
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("p_brand_filter", String(brandFilter));
    }
  }, [brandFilter]);

  useEffect(() => {
    loadProducts();
  }, [page, searchFilter, categoryFilter, brandFilter]);

  // Products Modal Handlers
  const handleOpenProductModal = (product?: ProductRecord) => {
    setEditingProduct(product || null);
    setSubmitError(null);
    setProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmitProduct = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateProductPayload = {
        name: String(formData.name),
        sku: String(formData.sku),
        stock_quantity: formData.stock_quantity
          ? Number(formData.stock_quantity)
          : 0,
        low_stock_alarm: formData.low_stock_alarm
          ? Number(formData.low_stock_alarm)
          : 0,
        products_category_id: Number(formData.products_category_id),
        brand_id: Number(formData.brand_id),
        currency_pricing: String(formData.currency_pricing) as "EGP" | "USD",
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        max_discount_type: String(formData.max_discount_type) as
          | "fixed"
          | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        universal: formData.universal === true,
        notes: formData.notes ? String(formData.notes) : undefined,
      };

      if (editingProduct) {
        await updateProduct(token, editingProduct.id, payload);
      } else {
        await createProduct(token, payload);
      }

      await loadProducts();
      handleCloseProductModal();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save product",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteProduct(token, id);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  // Category Modal Handlers
  const handleOpenCategoryModal = (category?: ProductCategoryRecord) => {
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
        await updateProductCategory(token, editingCategory.id, payload);
      } else {
        await createProductCategory(token, payload);
      }

      await loadCategories();
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
      if (!token) throw new Error("Authentication required");
      await deleteProductCategory(token, id);
      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    }
  };

  // Helper function to get stock status badge
  const getStockBadge = (product: ProductRecord) => {
    if (product.stock_quantity === 0) {
      return (
        <StatusBadge tone="danger">
          Out of Stock {product.stock_quantity}
        </StatusBadge>
      );
    }
    if (product.stock_quantity <= product.low_stock_alarm) {
      return (
        <StatusBadge tone="warning">
          Low Stock {product.stock_quantity}
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="success">
        In Stock {product.stock_quantity}
      </StatusBadge>
    );
  };

  const productModalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Product Name",
      type: "text",
      required: true,
      section: "Basic Info",
      sectionDescription:
        "Start with the core identity your sales and inventory teams will recognize.",
      description:
        "Use the product name that should appear in your catalog and stock screens.",
      placeholder: "Enter product name",
      value: editingProduct?.name,
      helperTone: "featured",
      summaryValue: ({ value }) => (value ? String(value) : undefined),
    },
    {
      name: "sku",
      label: "SKU",
      type: "text",
      required: true,
      section: "Basic Info",
      description: "Keep the SKU short, unique, and easy to search.",
      placeholder: "e.g., PROD-001",
      value: editingProduct?.sku,
      summaryValue: ({ value }) => (value ? `SKU ${String(value)}` : undefined),
    },
    {
      name: "products_category_id",
      label: "Category",
      type: "select",
      required: true,
      section: "Classification",
      sectionDescription:
        "Group the product for clearer catalog browsing and reporting.",
      description: "Choose the main product category.",
      options: categories.map((c) => ({ value: c.id, label: c.name })),
      value: editingProduct?.products_category_id,
    },
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      required: true,
      section: "Classification",
      description: "Pick the brand your team uses for purchasing and display.",
      options: brands.map((b) => ({ value: b.id, label: b.name })),
      value: editingProduct?.brand_id,
      disabled: brandsLoading,
    },
    {
      name: "stock_quantity",
      label: "Stock Quantity",
      type: "number",
      section: "Inventory",
      sectionDescription:
        "Set the operating quantities that control stock health.",
      description: "Enter the opening stock count for this product.",
      placeholder: "0",
      value: editingProduct?.stock_quantity ?? 0,
      min: 0,
      helperTone: "featured",
    },
    {
      name: "low_stock_alarm",
      label: "Low Stock Alarm",
      type: "number",
      section: "Inventory",
      description: "Set the threshold where the product becomes low stock.",
      placeholder: "5",
      value: editingProduct?.low_stock_alarm ?? 0,
      min: 0,
    },
    {
      name: "cost_price",
      label: "Cost Price",
      type: "number",
      required: true,
      section: "Pricing",
      sectionDescription:
        "Define the financial baseline before the product goes live.",
      description: "Enter your purchase or landed cost per unit.",
      placeholder: "0.00",
      value: editingProduct?.cost_price ?? 0,
      min: 0,
      step: "0.01",
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined
          ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}`
          : undefined,
    },
    {
      name: "sale_price",
      label: "Sale Price",
      type: "number",
      required: true,
      section: "Pricing",
      description: "Set the standard selling price for this product.",
      placeholder: "0.00",
      value: editingProduct?.sale_price ?? 0,
      min: 0,
      step: "0.01",
      helperTone: "featured",
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined
          ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}`
          : undefined,
    },
    {
      name: "currency_pricing",
      label: "Currency",
      type: "select",
      required: true,
      section: "Pricing",
      description: "Choose the currency shown across pricing surfaces.",
      options: [
        { value: "EGP", label: "Egyptian Pound (EGP)" },
        { value: "USD", label: "US Dollar (USD)" },
      ],
      value: editingProduct?.currency_pricing ?? "EGP",
    },
    {
      name: "max_discount_type",
      label: "Discount Type",
      type: "select",
      required: true,
      section: "Discount",
      sectionDescription:
        "Control how much pricing flexibility the team has at sale time.",
      description:
        "Choose whether the cap is percentage-based or a fixed value.",
      options: [
        { value: "percentage", label: "Percentage (%)" },
        { value: "fixed", label: "Fixed Amount" },
      ],
      value: editingProduct?.max_discount_type ?? "percentage",
    },
    {
      name: "max_discount_value",
      label: "Max Discount Value",
      type: "number",
      section: "Discount",
      description: "Set the highest discount allowed for this product.",
      placeholder: "0",
      value: editingProduct?.max_discount_value ?? 0,
      min: 0,
      step: "0.01",
    },
    {
      name: "universal",
      label: "Universal Product",
      type: "toggle",
      section: "Discount",
      description:
        "Use this when the product should be treated as universally applicable.",
      value: editingProduct?.universal ?? false,
      summaryValue: ({ value }) =>
        value === true ? "Universal product" : undefined,
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Notes",
      sectionDescription:
        "Capture details that help sales or operations later.",
      description: "Add specifications, selling points, or internal notes.",
      placeholder: "e.g., Material, specifications, compatibility...",
      value: editingProduct?.notes,
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
      description: "e.g., Accessories, Bikes, Parts",
      placeholder: "Enter category name",
      value: editingCategory?.name,
    },
  ];

  // Render products tab content
  const productsTabContent = (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-on-surface">Products</h2>
        <ActionButton tone="primary" onClick={() => handleOpenProductModal()}>
          Add Product
        </ActionButton>
      </div>

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-error text-sm">
          {error}
        </div>
      )}

      <FilterBar>
        <InputGroup label="Search" className="md:col-span-5">
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setPage(1);
            }}
            className="form-input-base"
          />
        </InputGroup>
        <InputGroup label="Category" className="md:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value ? parseInt(e.target.value) : "");
              setPage(1);
            }}
            className="form-input-base"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </InputGroup>
        <InputGroup label="Brand" className="md:col-span-4">
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value ? parseInt(e.target.value) : "");
              setPage(1);
            }}
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Adjust filters or create a product to start the catalog."
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
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  universal
                </th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">
                  discount
                </th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                >
                  <td className="px-4 py-3 text-on-surface font-mono text-xs">
                    {product.sku}
                  </td>
                  <td className="px-4 py-3 text-on-surface">{product.name}</td>
                  <td className="px-4 py-3 text-center">
                    {getStockBadge(product)}
                  </td>
                  <td className="px-4 py-3 text-on-surface">
                    {product.sale_price} {product.currency_pricing}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {
                      categories.find(
                        (c) => c.id === product.products_category_id,
                      )?.name
                    }
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {brands.find((b) => b.id === product.brand_id)?.name}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {product.universal ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {product.max_discount_value}{" "}
                    {product.max_discount_type ? product.currency_pricing : "%"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenProductModal(product)}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
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
        <h2 className="text-lg font-semibold text-on-surface">Categories</h2>
        <ActionButton tone="primary" onClick={() => handleOpenCategoryModal()}>
          Add Category
        </ActionButton>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Create a category to structure the product catalog."
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
    </div>
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory Control"
        title="Products Management"
        description="Operate products with the same inventory-first system used for spare parts: clearer filters, cleaner stock status, and guided forms."
      />

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

      {/* Product Modal */}
      <EntityFormModal
        title={editingProduct ? "Edit Product" : "Create Product"}
        description={
          editingProduct
            ? "Update the product profile, stock settings, and pricing from one focused form."
            : "Create a polished product entry with inventory, pricing, and sales settings clearly grouped together."
        }
        fields={productModalFields}
        isOpen={productModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseProductModal}
        onSubmit={handleSubmitProduct}
        submitLabel={editingProduct ? "Save Product" : "Create Product"}
        heroLabel="Products"
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
