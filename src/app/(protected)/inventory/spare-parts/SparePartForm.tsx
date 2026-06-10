"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import {
  type SparePartRecord,
  type CreateSparePartPayload,
  type UpdateSparePartPayload,
  type SparePartCategoryRecord,
  type BrandRecord,
  type BikeBlueprintRecord,
  listSparePartCategories,
  listBrands,
  listBikeBlueprints,
  createBrand,
  createBikeBlueprint,
  createSparePart,
  updateSparePart,
  assignSparePartToBikeBlueprint,
  removeSparePartFromBikeBlueprint,
  fetchAllPages,
} from "@/lib/crud-api";
import { getAuthToken } from "@/lib/auth-session";
import { CURRENCY_SELECT_OPTIONS, toPricingCurrency } from "@/lib/currencies";
import { EntityForm, type FieldConfig } from "@/components/entity-form";

interface SparePartFormProps {
  mode: "create" | "edit";
  initialData?: SparePartRecord;
}

export function SparePartForm({ mode, initialData }: SparePartFormProps) {
  const router = useRouter();
  const permissions = usePermissions();
  const canCreateBrands = permissions.canCreate("brands");
  const canCreateBlueprints = permissions.canCreate("bike-blueprints");
  const [currentBlueprintIds, setCurrentBlueprintIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categoryRows, setCategoryRows] = useState<SparePartCategoryRecord[]>([]);
  const [brandRows, setBrandRows] = useState<BrandRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDependencies = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        if (!token) return;

        const [categories, brands, blueprintRows] = await Promise.all([
          fetchAllPages((page) => listSparePartCategories(token, page)),
          fetchAllPages((page) => listBrands(token, page)),
          fetchAllPages((page) => listBikeBlueprints(token, page)),
        ]);

        if (!cancelled) {
          setCategoryRows(categories);
          setBrandRows(brands);
          setBlueprints(blueprintRows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load form data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDependencies();

    return () => {
      cancelled = true;
    };
  }, []);

  const sparePartBrands = useMemo(
    () => brandRows.filter((item) => item.type === "spare_parts"),
    [brandRows],
  );
  const bikeBrands = useMemo(
    () => brandRows.filter((item) => item.type === "bikes"),
    [brandRows],
  );

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setCurrentBlueprintIds(initialData.bike_blueprint_ids ?? []);
    }
  }, [mode, initialData]);

  const bikeBrandNameById = useMemo(
    () => new Map(bikeBrands.map((brand) => [brand.id, brand.name])),
    [bikeBrands],
  );

  const formKey =
    mode === "edit" && initialData ? `edit-${initialData.id}` : "create";

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
        type: "bikes",
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
      {
        name: "year",
        label: "Production Year",
        type: "number",
        required: true,
        section: "Identity",
        placeholder: "e.g., 2024",
        min: 1900,
        max: 2100,
      },
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

  const syncSparePartBlueprints = async (
    sparePart: SparePartRecord,
    currentIds: number[],
    selectedIds: number[],
  ) => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    const toAdd = selectedIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !selectedIds.includes(id));

    await Promise.all(
      toRemove.map((blueprintId) =>
        removeSparePartFromBikeBlueprint(token, blueprintId, sparePart.id),
      ),
    );

    await Promise.all(
      toAdd.map((blueprintId) =>
        assignSparePartToBikeBlueprint(token, blueprintId, {
          spare_part_id: sparePart.id,
        }),
      ),
    );
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setError(null);
      setIsSubmitting(true);

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
          "Please select at least one Compatible Bike Blueprint (or enable Universal Part).",
        );
      }

      const toNumber = (v: unknown): number | undefined => {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const basePayload: UpdateSparePartPayload = {
        name: String(formData.name),
        sku: String(formData.sku),
        image: formData.image ? String(formData.image) : undefined,
        image_public_id: formData.image_public_id
          ? String(formData.image_public_id)
          : undefined,
        part_number: formData.part_number ? String(formData.part_number) : undefined,
        stock_quantity: toNumber(formData.stock_quantity),
        low_stock_alarm: toNumber(formData.low_stock_alarm),
        spare_parts_category_id: Number(formData.spare_parts_category_id),
        brand_id: Number(formData.brand_id),
        currency_pricing: toPricingCurrency(String(formData.currency_pricing)),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        max_discount_type: String(formData.max_discount_type) as "fixed" | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        universal: Boolean(formData.universal),
        notes: formData.notes ? String(formData.notes) : undefined,
        tags: Array.isArray(formData.tags)
          ? (formData.tags as string[]).filter((tag) => String(tag).trim())
          : undefined,
      };

      let sparePart: SparePartRecord;
      const selectedBlueprints = isUniversal ? [] : selectedBlueprintsRaw;
      if (mode === "edit" && initialData) {
        sparePart = await updateSparePart(token, initialData.id, {
          ...basePayload,
          bike_blueprint_ids: selectedBlueprints,
        });
      } else {
        const createPayload = {
          ...basePayload,
          bike_blueprint_ids:
            selectedBlueprints.length > 0 ? selectedBlueprints : undefined,
        } as CreateSparePartPayload;
        sparePart = await createSparePart(token, createPayload);
      }

      if (mode !== "edit") {
        await syncSparePartBlueprints(sparePart, [], selectedBlueprints);
      }

      router.push("/inventory/spare-parts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save spare part");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: FieldConfig[] = useMemo(() => [
    {
      name: "name",
      label: "Part Name",
      type: "text",
      required: true,
      section: "Basic Info",
      sectionDescription: "Start with the part identity your team uses every day.",
      description: "Use the customer-facing or warehouse-recognized part name.",
      placeholder: "Enter part name",
      value: initialData?.name,
      helperTone: "featured",
    },
    {
      name: "sku",
      label: "SKU",
      type: "text",
      required: true,
      section: "Basic Info",
      description: "Keep the SKU unique and easy to scan in inventory.",
      placeholder: "e.g., SKU-001",
      value: initialData?.sku,
    },
    {
      name: "part_number",
      label: "Part Number",
      type: "text",
      section: "Basic Info",
      description: "Add the maker reference if your team uses manufacturer numbers.",
      placeholder: "e.g., MPN-12345",
      value: initialData?.part_number,
    },
    {
      name: "image",
      label: "Spare Part Photo",
      type: "image",
      section: "Basic Info",
      description: "Upload a file or paste an image URL so the team can identify the part quickly.",
      value: initialData?.image,
      imagePublicIdField: "image_public_id",
      uploadFolder: "rpg-system/spare-parts",
      span: 2,
    },
    {
      name: "spare_parts_category_id",
      label: "Category",
      type: "select",
      required: true,
      section: "Classification",
      sectionDescription: "Place the part under the right shelf and supplier grouping.",
      description: "Choose the main spare-parts category.",
      options: () => categoryRows.map((c) => ({ value: c.id, label: c.name })),
      value: initialData?.spare_parts_category_id,
    },
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      required: true,
      section: "Classification",
      description: "Pick the source brand used in purchasing and reporting.",
      options: () => sparePartBrands.map((b) => ({ value: b.id, label: b.name })),
      value: initialData?.brand_id,
      quickCreate: {
        title: "Add Brand",
        description: "Create a spare-parts brand without leaving this form.",
        submitLabel: "Create & Select",
        enabled: canCreateBrands,
        fields: [
          {
            name: "name",
            label: "Brand Name",
            type: "text",
            required: true,
            placeholder: "e.g., OEM Supplier",
          },
        ],
        onCreate: async (data) => {
          const token = getAuthToken();
          if (!token) throw new Error("Authentication required");
          const created = await createBrand(token, {
            name: String(data.name),
            type: "spare_parts",
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
      name: "stock_quantity",
      label: "Stock Quantity",
      type: "number",
      section: "Inventory",
      sectionDescription: "Set the operational numbers that drive stock visibility.",
      description: "Add the opening stock count for this part.",
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
      description: "Set when the team should treat this part as low stock.",
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
      sectionDescription: "Define the financial baseline before the part goes live.",
      description: "Enter your landed or purchase cost per unit.",
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
      description: "Set the selling price your staff should use.",
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
      description: "Choose the currency shown in inventory and sales.",
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
      section: "Pricing",
      sectionDescription: "Control discount policy and where this part can be used.",
      description: "Choose whether the discount cap is percentage-based or fixed.",
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
      section: "Pricing",
      description: "Set the highest discount your team can apply.",
      placeholder: "0",
      value: initialData?.max_discount_value ?? 0,
      min: 0,
      step: "0.01",
    },
    {
      name: "universal",
      label: "Universal Part",
      type: "toggle",
      section: "Compatibility",
      description:
        "When off, select at least one compatible bike blueprint below. When on, the part applies broadly without blueprint links.",
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
          const created = await createBikeBlueprint(token, {
            brand_id: Number(data.brand_id),
            model: String(data.model),
            year: Number(data.year),
          });
          setBlueprints((prev) => [...prev, created]);
          return { id: created.id };
        },
      },
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Notes",
      sectionDescription: "Add any extra context the team may need later.",
      description: "Capture fitment notes, supplier remarks, or quality details.",
      placeholder: "e.g., OEM quality, compatible with...",
      value: initialData?.notes,
      rows: 3,
    },
  ], [
    mode,
    initialData,
    categoryRows,
    sparePartBrands,
    bikeBrands,
    blueprints,
    bikeBrandNameById,
    blueprintYears,
    currentBlueprintIds,
    blueprintQuickCreateFields,
    buildBikeBrandQuickCreate,
    canCreateBrands,
    canCreateBlueprints,
  ]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="w-full py-4 md:py-6">
    <EntityForm
      formKey={formKey}
      variant="page"
      title={
        mode === "create"
          ? "Create Spare Part"
          : `Edit ${initialData?.name ?? "Spare Part"}`
      }
      description={
        mode === "create"
          ? "Build a spare part entry with inventory, pricing, and compatibility details in one view."
          : "Refine stock, pricing, and compatibility details for this spare part."
      }
      fields={fields}
      isLoading={isSubmitting}
      error={error || undefined}
      onCancel={() => router.push("/inventory/spare-parts")}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Create Spare Part" : "Save Changes"}
      heroLabel="Spare Parts"
    />
    </div>
  );
}
