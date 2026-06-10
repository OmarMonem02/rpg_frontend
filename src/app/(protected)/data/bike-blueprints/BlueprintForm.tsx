"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import {
  listBrands,
  updateBikeBlueprint,
  type BikeBlueprintRecord,
  type CreateBikeBlueprintPayload,
  type BrandRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import {
  buildBlueprintYearRangeFields,
  createBlueprintsFromFormData,
  resolveBlueprintSubmitLabel,
} from "@/lib/blueprint-year-range-fields";
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
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const result = await fetchAllPages((p) => listBrands(token, p, { type: "bikes" }));
        setBrands(result);
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
      setSuccess(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      if (mode === "edit" && initialData) {
        const payload: CreateBikeBlueprintPayload = {
          brand_id: Number(formData.brand_id),
          model: String(formData.model),
          year: Number(formData.year),
        };
        await updateBikeBlueprint(token, initialData.id, payload);
        router.push("/data/bike-blueprints");
        router.refresh();
        return;
      }

      const result = await createBlueprintsFromFormData(token, formData);

      if (result.summary) {
        setSuccess(result.summary);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      router.push("/data/bike-blueprints");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blueprint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const yearRangeFields =
    mode === "create"
      ? buildBlueprintYearRangeFields()
      : [
          {
            name: "year",
            label: "Production Year",
            type: "number" as const,
            required: true,
            section: "Identity",
            description: "Set the manufacturing year for this model definition.",
            placeholder: "2024",
            value: initialData?.year,
            min: 1900,
            max: new Date().getFullYear() + 1,
          },
        ];

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
    ...yearRangeFields,
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface">
          {success}
        </div>
      )}
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
        submitLabel={
          mode === "create"
            ? (formData) => resolveBlueprintSubmitLabel(formData)
            : "Save Changes"
        }
        heroLabel="Bike Blueprints"
      />
    </div>
  );
}
