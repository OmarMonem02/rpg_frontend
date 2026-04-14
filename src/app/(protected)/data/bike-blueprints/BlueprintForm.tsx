"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import {
  listBrands,
  createBikeBlueprint,
  updateBikeBlueprint,
  type BikeBlueprintRecord,
  type CreateBikeBlueprintPayload,
  type BrandRecord,
} from "@/lib/crud-api";
import { EntityForm, type FieldConfig } from "@/components/entity-form";

interface BlueprintFormProps {
  mode: "create" | "edit";
  initialData?: BikeBlueprintRecord;
}

export function BlueprintForm({ mode, initialData }: BlueprintFormProps) {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const result = await listBrands(token, 1, "bikes");
        setBrands(result.items);
      } catch (err) {
        console.error("Failed to load brands:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateBikeBlueprintPayload = {
        brand_id: Number(formData.brand_id),
        model: String(formData.model),
        year: Number(formData.year),
      };

      if (mode === "edit" && initialData) {
        await updateBikeBlueprint(token, initialData.id, payload);
      } else {
        await createBikeBlueprint(token, payload);
      }

      router.push("/data/bike-blueprints");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blueprint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: FieldConfig[] = [
    {
      name: "brand_id",
      label: "Manufacturer Brand",
      type: "select",
      required: true,
      section: "Identity",
      sectionDescription: "Define the core origin of the blueprint first.",
      description: "Select the motorcycle brand (e.g., Honda, Yamaha).",
      options: brands.map((b) => ({ value: b.id, label: b.name })),
      value: initialData?.brand_id,
      helperTone: "featured",
    },
    {
      name: "model",
      label: "Model Name",
      type: "text",
      required: true,
      section: "Identity",
      description: "Enter the specific model name (e.g., CB500X).",
      placeholder: "e.g., MT-07",
      value: initialData?.model,
    },
    {
      name: "year",
      label: "Production Year",
      type: "number",
      required: true,
      section: "Identity",
      description: "Set the manufacturing year for this model definition.",
      placeholder: "2024",
      value: initialData?.year,
      min: 1900,
      max: new Date().getFullYear() + 1,
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
      title={mode === "create" ? "Create Bike Blueprint" : "Edit Blueprint"}
      description={
        mode === "create"
          ? "Establish a new master model definition to link with inventory and parts later."
          : "Refine the manufacturer, model, and year for this motorcycle blueprint."
      }
      fields={fields}
      isLoading={isSubmitting}
      error={error || undefined}
      onCancel={() => router.push("/data/bike-blueprints")}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Create Blueprint" : "Save Changes"}
      heroLabel="Bike Blueprints"
    />
  );
}
