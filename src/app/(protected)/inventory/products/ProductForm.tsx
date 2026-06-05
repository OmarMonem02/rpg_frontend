"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import {
  listProductCategories,
  listBrands,
  createBrand,
  createProduct,
  updateProduct,
  type ProductRecord,
  type CreateProductPayload,
  type ProductCategoryRecord,
  type BrandRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import { CURRENCY_SELECT_OPTIONS, toPricingCurrency } from "@/lib/currencies";
import { EntityForm, type FieldConfig } from "@/components/entity-form";
import { PageShell } from "@/components/ops-ui";

interface ProductFormProps {
  initialData?: ProductRecord | null;
  mode: "create" | "edit";
}

export function ProductForm({ initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const permissions = usePermissions();
  const [categories, setCategories] = useState<ProductCategoryRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreateBrands = permissions.canCreate("brands");

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const [catRes, brandRes] = await Promise.all([
          fetchAllPages((p) => listProductCategories(token, p)),
          fetchAllPages((p) => listBrands(token, p, { type: "products" })),
        ]);
        setCategories(catRes);
        setBrands(brandRes.filter((b) => b.type === "products"));
      } catch (err) {
        console.error("Failed to load dependencies:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDependencies();
  }, []);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateProductPayload = {
        name: String(formData.name),
        sku: String(formData.sku),
        image: formData.image ? String(formData.image) : undefined,
        image_public_id: formData.image_public_id
          ? String(formData.image_public_id)
          : undefined,
        stock_quantity: formData.stock_quantity ? Number(formData.stock_quantity) : 0,
        low_stock_alarm: formData.low_stock_alarm ? Number(formData.low_stock_alarm) : 0,
        products_category_id: Number(formData.products_category_id),
        brand_id: Number(formData.brand_id),
        currency_pricing: toPricingCurrency(String(formData.currency_pricing)),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        max_discount_type: String(formData.max_discount_type) as "fixed" | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        universal: formData.universal === true,
        notes: formData.notes ? String(formData.notes) : undefined,
      };

      if (mode === "edit" && initialData) {
        await updateProduct(token, initialData.id, payload);
      } else {
        await createProduct(token, payload);
      }

      router.push("/inventory/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formKey = mode === "edit" && initialData ? `edit-${initialData.id}` : "create";

  const fields: FieldConfig[] = useMemo(() => [
    {
      name: "name",
      label: "Product Name",
      type: "text",
      required: true,
      section: "Basic Info",
      sectionDescription: "Start with the core identity your sales and inventory teams will recognize.",
      description: "Use the product name that should appear in your catalog and stock screens.",
      placeholder: "Enter product name",
      value: initialData?.name,
      helperTone: "featured",
    },
    {
      name: "sku",
      label: "SKU",
      type: "text",
      required: true,
      section: "Basic Info",
      description: "Keep the SKU short, unique, and easy to search.",
      placeholder: "e.g., PROD-001",
      value: initialData?.sku,
    },
    {
      name: "image",
      label: "Product Photo",
      type: "image",
      section: "Basic Info",
      description: "Upload a file or paste an image URL for the main catalog photo.",
      value: initialData?.image,
      imagePublicIdField: "image_public_id",
      uploadFolder: "rpg-system/products",
      span: 2,
    },
    {
      name: "products_category_id",
      label: "Category",
      type: "select",
      required: true,
      section: "Classification",
      sectionDescription: "Group the product for clearer catalog browsing and reporting.",
      description: "Choose the main product category.",
      options: () => categories.map((c) => ({ value: c.id, label: c.name })),
      value: initialData?.products_category_id,
    },
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      required: true,
      section: "Classification",
      description: "Pick the brand your team uses for purchasing and display.",
      options: () => brands.map((b) => ({ value: b.id, label: b.name })),
      value: initialData?.brand_id,
      quickCreate: {
        title: "Add Brand",
        description: "Create a product brand without leaving this form.",
        submitLabel: "Create & Select",
        enabled: canCreateBrands,
        fields: [
          {
            name: "name",
            label: "Brand Name",
            type: "text",
            required: true,
            placeholder: "e.g., Honda, Yamaha",
          },
        ],
        onCreate: async (data) => {
          const token = getAuthToken();
          if (!token) throw new Error("Authentication required");
          const created = await createBrand(token, {
            name: String(data.name),
            type: "products",
          });
          setBrands((prev) => [...prev, created]);
          return { id: created.id };
        },
      },
    },
    {
      name: "stock_quantity",
      label: "Stock Quantity",
      type: "number",
      section: "Inventory",
      sectionDescription: "Set the operating quantities that control stock health.",
      description: "Enter the opening stock count for this product.",
      placeholder: "0",
      value: initialData?.stock_quantity ?? 0,
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
      value: initialData?.low_stock_alarm ?? 0,
      min: 0,
    },
    {
      name: "cost_price",
      label: "Cost Price",
      type: "number",
      required: true,
      section: "Pricing",
      sectionDescription: "Define the financial baseline before the product goes live.",
      description: "Enter your purchase or landed cost per unit.",
      placeholder: "0.00",
      value: initialData?.cost_price ?? 0,
      min: 0,
      step: "0.01",
    },
    {
      name: "sale_price",
      label: "Sale Price",
      type: "number",
      required: true,
      section: "Pricing",
      description: "Set the standard selling price for this product.",
      placeholder: "0.00",
      value: initialData?.sale_price ?? 0,
      min: 0,
      step: "0.01",
      helperTone: "featured",
    },
    {
      name: "currency_pricing",
      label: "Currency",
      type: "select",
      required: true,
      section: "Pricing",
      description: "Choose the currency shown across pricing surfaces.",
      options: CURRENCY_SELECT_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      value: initialData?.currency_pricing ?? "EGP",
    },
    {
      name: "max_discount_type",
      label: "Discount Type",
      type: "select",
      required: true,
      section: "Discount",
      sectionDescription: "Control how much pricing flexibility the team has at sale time.",
      description: "Choose whether the cap is percentage-based or a fixed value.",
      options: [
        { value: "percentage", label: "Percentage (%)" },
        { value: "fixed", label: "Fixed Amount" },
      ],
      value: initialData?.max_discount_type ?? "percentage",
    },
    {
      name: "max_discount_value",
      label: "Max Discount Value",
      type: "number",
      section: "Discount",
      description: "Set the highest discount allowed for this product.",
      placeholder: "0",
      value: initialData?.max_discount_value ?? 0,
      min: 0,
      step: "0.01",
    },
    {
      name: "universal",
      label: "Universal Product",
      type: "toggle",
      section: "Discount",
      description: "Use this when the product should be treated as universally applicable.",
      value: initialData?.universal ?? false,
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Notes",
      sectionDescription: "Capture details that help sales or operations later.",
      description: "Add specifications, selling points, or internal notes.",
      placeholder: "e.g., Material, specifications, compatibility...",
      value: initialData?.notes,
      rows: 3,
    },
  ], [
    mode,
    initialData,
    categories,
    brands,
    canCreateBrands,
  ]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <EntityForm
        formKey={formKey}
        title={mode === "edit" ? "Edit Product" : "Create Product"}
        description={mode === "edit" ? "Update product profile, stock settings, and pricing." : "Create a polished product entry with inventory, pricing, and sales settings."}
        fields={fields}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/inventory/products")}
        isLoading={isSubmitting}
        error={error ?? undefined}
        submitLabel={mode === "edit" ? "Save Changes" : "Create Product"}
        heroLabel="Inventory"
        variant="page"
      />
    </div>
  );
}
