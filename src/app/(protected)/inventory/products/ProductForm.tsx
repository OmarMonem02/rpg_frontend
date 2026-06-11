"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import {
  listProductCategories,
  listBrands,
  listBikeBlueprints,
  createBrand,
  createProductCategory,
  createProduct,
  updateProduct,
  type ProductRecord,
  type CreateProductPayload,
  type UpdateProductPayload,
  type ProductCategoryRecord,
  type BrandRecord,
  type BikeBlueprintRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import { buildCatalogPricingPayload } from "@/lib/catalog-pricing";
import {
  buildBlueprintYearRangeFields,
  createBlueprintsFromFormData,
} from "@/lib/blueprint-year-range-fields";
import { EntityForm, type FieldConfig } from "@/components/entity-form";
import { PageShell } from "@/components/ops-ui";
import { filterBrandsByType } from "@/lib/brand-types";

interface ProductFormProps {
  initialData?: ProductRecord | null;
  mode: "create" | "edit";
}

export function ProductForm({ initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const permissions = usePermissions();
  const [categories, setCategories] = useState<ProductCategoryRecord[]>([]);
  const [brandRows, setBrandRows] = useState<BrandRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [currentBlueprintIds, setCurrentBlueprintIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreateBrands = permissions.canCreate("brands");
  const canCreateBlueprints = permissions.canCreate("bike-blueprints");
  const canCreateProductCategories = permissions.canCreate("product-categories");

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const [catRes, brandsRes, blueprintRows] = await Promise.all([
          fetchAllPages((p) => listProductCategories(token, p)),
          fetchAllPages((p) => listBrands(token, p)),
          fetchAllPages((p) => listBikeBlueprints(token, p)),
        ]);
        setCategories(catRes);
        setBrandRows(brandsRes);
        setBlueprints(blueprintRows);
      } catch (err) {
        console.error("Failed to load dependencies:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDependencies();
  }, []);

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setCurrentBlueprintIds(initialData.bike_blueprint_ids ?? []);
    }
  }, [mode, initialData]);

  const brands = useMemo(
    () => filterBrandsByType(brandRows, "products"),
    [brandRows],
  );
  const bikeBrands = useMemo(
    () => filterBrandsByType(brandRows, "bikes"),
    [brandRows],
  );
  const bikeBrandNameById = useMemo(
    () => new Map(bikeBrands.map((brand) => [brand.id, brand.name])),
    [bikeBrands],
  );

  const buildBikeBrandQuickCreate = useCallback((): FieldConfig["quickCreate"] => ({
    title: "Add Bike Brand",
    description: "Create a motorcycle manufacturer brand for blueprint linking.",
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
        types: ["bikes"],
      });
      setBrandRows((prev) => [...prev, created]);
      return { id: created.id };
    },
  }), [canCreateBrands]);

  const blueprintQuickCreateFields: FieldConfig[] = useMemo(
    () => [
      {
        name: "brand_id",
        label: "Manufacturer Brand",
        type: "select",
        required: true,
        section: "Identity",
        description: "Select the motorcycle brand (e.g., Honda, Yamaha).",
        options: () => bikeBrands.map((b) => ({ value: b.id, label: b.name })),
        quickCreate: buildBikeBrandQuickCreate(),
      },
      {
        name: "model",
        label: "Model Name",
        type: "text",
        required: true,
        section: "Identity",
        placeholder: "e.g., MT-07",
      },
      ...buildBlueprintYearRangeFields({ maxYear: 2100 }),
    ],
    [bikeBrands, buildBikeBrandQuickCreate],
  );

  const blueprintYears = useMemo(() => {
    const years = Array.from(
      new Set(blueprints.map((blueprint) => blueprint.year)),
    ).sort((a, b) => a - b);
    return years.map((year) => ({ value: year, label: String(year) }));
  }, [blueprints]);

  const parseOptionalNumber = (value: unknown): number | undefined => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const yearFrom = parseOptionalNumber(formData.blueprint_year_from);
      const yearTo = parseOptionalNumber(formData.blueprint_year_to);
      if (
        typeof yearFrom === "number" &&
        typeof yearTo === "number" &&
        yearFrom > yearTo
      ) {
        throw new Error("Compatibility year range is invalid (From year > To year).");
      }

      const isUniversal = Boolean(formData.universal);
      const selectedBlueprintsRaw = Array.isArray(formData.blueprint_ids)
        ? (formData.blueprint_ids as number[])
        : [];
      if (!isUniversal && selectedBlueprintsRaw.length === 0) {
        throw new Error(
          "Please select at least one Compatible Bike Blueprint (or enable Universal Product).",
        );
      }

      const selectedBlueprints = isUniversal ? [] : selectedBlueprintsRaw;

      const basePayload: UpdateProductPayload = {
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
        ...buildCatalogPricingPayload(formData),
        max_discount_type: String(formData.max_discount_type) as "fixed" | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        universal: isUniversal,
        notes: formData.notes ? String(formData.notes) : undefined,
        tags: Array.isArray(formData.tags)
          ? (formData.tags as string[]).filter((tag) => String(tag).trim())
          : undefined,
      };

      if (mode === "edit" && initialData) {
        await updateProduct(token, initialData.id, {
          ...basePayload,
          bike_blueprint_ids: selectedBlueprints,
        });
      } else {
        const createPayload: CreateProductPayload = {
          ...basePayload,
          bike_blueprint_ids:
            selectedBlueprints.length > 0 ? selectedBlueprints : undefined,
        };
        await createProduct(token, createPayload);
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
      quickCreate: {
        title: "Add Category",
        description: "Create a product category without leaving this form.",
        submitLabel: "Create & Select",
        enabled: canCreateProductCategories,
        fields: [
          {
            name: "name",
            label: "Category Name",
            type: "text",
            required: true,
            placeholder: "e.g., Helmets, Gloves",
          },
        ],
        onCreate: async (data) => {
          const token = getAuthToken();
          if (!token) throw new Error("Authentication required");
          const created = await createProductCategory(token, {
            name: String(data.name),
          });
          setCategories((prev) => [...prev, created]);
          return { id: created.id };
        },
      },
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
            types: ["products"],
          });
          setBrandRows((prev) => [...prev, created]);
          return { id: created.id };
        },
      },
    },
    {
      name: "tags",
      label: "Tags",
      type: "tags",
      section: "Classification",
      description:
        "Add labels like Metallic, Black, or High Load to help find this item later.",
      placeholder: "e.g., Black",
      value: initialData?.tags ?? [],
      span: 2,
    },
    {
      name: "catalog_pricing",
      label: "Pricing",
      type: "pricing",
      required: true,
      section: "Pricing",
      sectionDescription: "Define cost and sale currencies, optional margin-based sale pricing, and discount policy.",
      value: initialData,
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
      name: "stock_quantity",
      label: "Stock Quantity",
      type: "number",
      section: "Inventory",
      sectionDescription: "Set the operating quantities that control stock health.",
      description: "Enter the opening stock count for this product.",
      placeholder: "0",
      required: true,
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
      required: true,
      value: initialData?.low_stock_alarm ?? 0,
      min: 0,
    },
    
    
    {
      name: "universal",
      label: "Universal Product",
      type: "toggle",
      section: "Compatibility",
      description:
        "When off, select at least one compatible bike blueprint below. When on, the product applies broadly without blueprint links.",
      value: mode === "create" ? true : (initialData?.universal ?? false),
      helperTone: "featured",
    },
    {
      name: "blueprint_brand_id",
      label: "Filter by Blueprint Brand",
      type: "select",
      section: "Compatibility",
      description: "Narrow compatibility options by bike brand before selecting blueprints.",
      options: () => bikeBrands.map((brand) => ({ value: brand.id, label: brand.name })),
      disabled: (formData) => formData.universal === true,
      value: "",
      quickCreate: buildBikeBrandQuickCreate(),
    },
    {
      name: "blueprint_model_search",
      label: "Filter by Model",
      type: "text",
      section: "Compatibility",
      description: "Search model names like MT, CB, R1, or GS.",
      placeholder: "Type model keyword",
      disabled: (formData) => formData.universal === true,
      value: "",
    },
    {
      name: "blueprint_year_from",
      label: "Year From",
      type: "select",
      section: "Compatibility",
      description: "Set the first production year in the compatibility range.",
      options: blueprintYears,
      disabled: (formData) => formData.universal === true,
      value: "",
      onValueChange: ({ value, formData }) => {
        const selectedFrom = parseOptionalNumber(value);
        const selectedTo = parseOptionalNumber(formData.blueprint_year_to);
        if (
          selectedFrom !== undefined &&
          selectedTo !== undefined &&
          selectedFrom > selectedTo
        ) {
          return { blueprint_year_to: String(selectedFrom) };
        }
      },
    },
    {
      name: "blueprint_year_to",
      label: "Year To",
      type: "select",
      section: "Compatibility",
      description: "Set the last production year in the compatibility range.",
      options: (formData) => {
        const selectedFrom = parseOptionalNumber(formData.blueprint_year_from);
        if (selectedFrom === undefined) {
          return blueprintYears;
        }
        return blueprintYears.filter((year) => Number(year.value) >= selectedFrom);
      },
      disabled: (formData) => formData.universal === true,
      value: "",
    },
    {
      name: "blueprint_ids",
      label: "Compatible Bike Blueprints",
      type: "multiselect",
      required: true,
      section: "Compatibility",
      description:
        "Choose one or more bike blueprints. Use brand, model, and year range filters above to narrow the list. Already selected blueprints stay selected even if they are hidden by current filters.",
      options: (formData) => {
        const selectedBrandId = parseOptionalNumber(formData.blueprint_brand_id);
        const modelSearch = String(formData.blueprint_model_search || "")
          .trim()
          .toLowerCase();
        const yearFrom = parseOptionalNumber(formData.blueprint_year_from);
        const yearTo = parseOptionalNumber(formData.blueprint_year_to);
        const selectedBlueprintIds = Array.isArray(formData.blueprint_ids)
          ? (formData.blueprint_ids as number[])
          : [];
        const selectedSet = new Set(selectedBlueprintIds);

        const matchesFilters = (bp: BikeBlueprintRecord) => {
          const matchesBrand = selectedBrandId !== undefined
            ? bp.brand_id === selectedBrandId
            : true;
          const matchesModel = modelSearch.length > 0
            ? bp.model.toLowerCase().includes(modelSearch)
            : true;
          const matchesYearFrom = yearFrom !== undefined
            ? bp.year >= yearFrom
            : true;
          const matchesYearTo = yearTo !== undefined
            ? bp.year <= yearTo
            : true;
          return matchesBrand && matchesModel && matchesYearFrom && matchesYearTo;
        };

        const selectedOrdered = [...blueprints]
          .filter((bp) => selectedSet.has(bp.id))
          .sort((a, b) => {
            const bnA = bikeBrandNameById.get(a.brand_id) || "";
            const bnB = bikeBrandNameById.get(b.brand_id) || "";
            const byBrand = bnA.localeCompare(bnB);
            if (byBrand !== 0) return byBrand;
            const byModel = a.model.localeCompare(b.model);
            if (byModel !== 0) return byModel;
            return a.year - b.year;
          });

        const filteredUnselected = blueprints.filter(
          (bp) => !selectedSet.has(bp.id) && matchesFilters(bp),
        );

        const orderedBlueprints = [...selectedOrdered, ...filteredUnselected];

        return orderedBlueprints.map((bp) => {
          const brandName = bikeBrandNameById.get(bp.brand_id) || `Brand ${bp.brand_id}`;
          return {
            value: bp.id,
            label: `${brandName} • ${bp.model} • ${bp.year}`,
          };
        });
      },
      disabled: (formData) => formData.universal === true,
      span: 2,
      value: mode === "edit" ? currentBlueprintIds : undefined,
      quickCreate: {
        title: "Add Bike Blueprint",
        description:
          "Define a bike model and year, then add it to compatible blueprints.",
        submitLabel: "Create & Add",
        enabled: canCreateBlueprints,
        mode: "multiselect-append",
        fields: blueprintQuickCreateFields,
        onCreate: async (data) => {
          const token = getAuthToken();
          if (!token) throw new Error("Authentication required");
          const result = await createBlueprintsFromFormData(token, data);
          setBlueprints((prev) => {
            const existingIds = new Set(prev.map((bp) => bp.id));
            const additions = result.blueprints.filter((bp) => !existingIds.has(bp.id));
            return additions.length > 0 ? [...prev, ...additions] : prev;
          });
          const ids = result.blueprints.map((bp) => bp.id);
          return ids.length === 1 ? { id: ids[0] } : { ids };
        },
      },
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
    bikeBrands,
    blueprints,
    bikeBrandNameById,
    blueprintYears,
    currentBlueprintIds,
    blueprintQuickCreateFields,
    buildBikeBrandQuickCreate,
    canCreateBrands,
    canCreateBlueprints,
    canCreateProductCategories,
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
    <div className="w-full py-4 md:py-6">
      <EntityForm
        formKey={formKey}
        title={
          mode === "edit"
            ? `Edit ${initialData?.name ?? "Product"}`
            : "Create Product"
        }
        description={mode === "edit" ? "Update product profile, stock settings, pricing, and compatibility in one view." : "Create a product entry with inventory, pricing, and bike compatibility in one view."}
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
