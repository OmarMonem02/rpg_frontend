"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import {
  listSparePartCategories,
  listBrands,
  listBikeBlueprints,
  createSparePart,
  updateSparePart,
  getSparePartBlueprints,
  assignBlueprintsToSparePart,
  removeBlueprintFromSparePart,
  assignSparePartToBikeBlueprint,
  type SparePartRecord,
  type CreateSparePartPayload,
  type UpdateSparePartPayload,
  type SparePartCategoryRecord,
  type BrandRecord,
  type BikeBlueprintRecord,
} from "@/lib/crud-api";
import { EntityForm, type FieldConfig } from "@/components/entity-form";

interface SparePartFormProps {
  mode: "create" | "edit";
  initialData?: SparePartRecord;
}

export function SparePartForm({ mode, initialData }: SparePartFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<SparePartCategoryRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentBlueprintIds, setCurrentBlueprintIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;

        const [catRes, brandRes, bpRes] = await Promise.all([
          listSparePartCategories(token, 1),
          listBrands(token, 1, "spare_parts"),
          listBikeBlueprints(token, 1),
        ]);

        setCategories(catRes.items);
        setBrands(brandRes.items);
        setBlueprints(bpRes.items);

        if (mode === "edit" && initialData) {
          const bpIds = await getSparePartBlueprints(token, initialData.id);
          setCurrentBlueprintIds(bpIds);
        }
      } catch (err) {
        console.error("Failed to load dependencies:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mode, initialData]);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const toNumber = (v: unknown): number | undefined => {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const basePayload: any = {
        name: String(formData.name),
        sku: String(formData.sku),
        part_number: formData.part_number ? String(formData.part_number) : undefined,
        stock_quantity: toNumber(formData.stock_quantity),
        low_stock_alarm: toNumber(formData.low_stock_alarm),
        spare_parts_category_id: Number(formData.spare_parts_category_id),
        brand_id: Number(formData.brand_id),
        currency_pricing: String(formData.currency_pricing) as "EGP" | "USD",
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        max_discount_type: String(formData.max_discount_type) as "fixed" | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        universal: Boolean(formData.universal),
        notes: formData.notes ? String(formData.notes) : undefined,
      };

      let sparePart: SparePartRecord;
      if (mode === "edit" && initialData) {
        sparePart = await updateSparePart(token, initialData.id, basePayload);
      } else {
        const createPayload = {
          ...basePayload,
          bike_blueprint_ids: (formData.blueprint_ids as number[]) || undefined,
        } as CreateSparePartPayload;
        sparePart = await createSparePart(token, createPayload);
      }

      // Handle blueprint assignments
      const selectedBlueprints = (formData.blueprint_ids as number[]) || [];

      if (mode === "edit" && initialData) {
        const toAdd = selectedBlueprints.filter(id => !currentBlueprintIds.includes(id));
        const toRemove = currentBlueprintIds.filter(id => !selectedBlueprints.includes(id));

        for (const blueprintId of toRemove) {
          await removeBlueprintFromSparePart(token, sparePart.id, blueprintId);
        }

        if (toAdd.length > 0) {
          await assignBlueprintsToSparePart(token, sparePart.id, toAdd);
        }
      } else {
         if (selectedBlueprints.length > 0) {
           await assignBlueprintsToSparePart(token, sparePart.id, selectedBlueprints);
         }
      }

      router.push("/inventory/spare-parts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save spare part");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: FieldConfig[] = [
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
      name: "spare_parts_category_id",
      label: "Category",
      type: "select",
      required: true,
      section: "Classification",
      sectionDescription: "Place the part under the right shelf and supplier grouping.",
      description: "Choose the main spare-parts category.",
      options: categories.map((c) => ({ value: c.id, label: c.name })),
      value: initialData?.spare_parts_category_id,
    },
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      required: true,
      section: "Classification",
      description: "Pick the source brand used in purchasing and reporting.",
      options: brands.map((b) => ({ value: b.id, label: b.name })),
      value: initialData?.brand_id,
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
      options: [
        { value: "EGP", label: "Egyptian Pound (EGP)" },
        { value: "USD", label: "US Dollar (USD)" },
      ],
      value: initialData?.currency_pricing ?? "EGP",
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
      value: initialData?.max_discount_type ?? "percentage",
    },
    {
      name: "max_discount_value",
      label: "Max Discount Value",
      type: "number",
      section: "Compatibility",
      description: "Set the highest discount your team can apply.",
      placeholder: "0",
      value: initialData?.max_discount_value ?? 0,
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
      value: mode === "edit" ? currentBlueprintIds : undefined,
    },
    {
      name: "universal",
      label: "Universal Part",
      type: "toggle",
      section: "Compatibility",
      description: "Enable this when the part fits all bikes and blueprint matching is not needed.",
      value: initialData?.universal ?? false,
      helperTone: "featured",
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
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
      </div>
    );
  }

  return (
    <EntityForm
      variant="page"
      title={mode === "create" ? "Create Spare Part" : "Edit Spare Part"}
      description={
        mode === "create"
          ? "Build a clean spare part entry with inventory, pricing, and compatibility details in one guided flow."
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
  );
}
