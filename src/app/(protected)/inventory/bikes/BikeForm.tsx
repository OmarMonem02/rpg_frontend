"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import {
  listBikeBlueprints,
  createBike,
  updateBike,
  type BikeRecord,
  type CreateBikePayload,
  type BikeBlueprintRecord,
} from "@/lib/crud-api";
import { EntityForm, type FieldConfig } from "@/components/entity-form";

interface BikeFormProps {
  mode: "create" | "edit";
  initialData?: BikeRecord;
}

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "reserved", label: "Reserved" },
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount" },
];

export function BikeForm({ mode, initialData }: BikeFormProps) {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const result = await listBikeBlueprints(token, 1);
        setBlueprints(result.items);
      } catch (err) {
        console.error("Failed to load blueprints:", err);
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

      const payload: CreateBikePayload = {
        bike_blueprint_id: Number(formData.bike_blueprint_id),
        currency_pricing: String(formData.currency_pricing || "EGP"),
        cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        status: String(formData.status),
        max_discount_type: String(formData.max_discount_type),
        max_discount_value: Number(formData.max_discount_value),
        vin: String(formData.vin),
        mileage: formData.mileage ? Number(formData.mileage) : 0,
        notes: formData.notes ? String(formData.notes) : undefined,
      };

      if (mode === "edit" && initialData) {
        await updateBike(token, initialData.id, payload);
      } else {
        await createBike(token, payload);
      }

      router.push("/inventory/bikes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bike");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: FieldConfig[] = [
    {
      name: "bike_blueprint_id",
      label: "Bike Blueprint",
      type: "select",
      required: true,
      section: "Bike Identity",
      sectionDescription:
        "Define the listing identity first so the rest of the form stays grounded.",
      description: "Choose the model and production year for this bike.",
      options: blueprints.map((bp) => ({
        value: bp.id,
        label: `${bp.model} ${bp.year}`,
      })),
      value: initialData?.bike_blueprint_id,
      helperTone: "featured",
    },
    {
      name: "vin",
      label: "VIN (Vehicle Identification Number)",
      type: "text",
      required: true,
      section: "Bike Identity",
      description:
        "Add the vehicle identification number used for traceability.",
      placeholder: "e.g., VIN123456789",
      value: initialData?.vin,
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      section: "Status",
      sectionDescription:
        "Set the live sale state and the opening condition of the bike.",
      description:
        "Choose where this bike currently sits in the sales lifecycle.",
      options: STATUSES,
      value: initialData?.status ?? "available",
      helperTone: "featured",
    },
    {
      name: "mileage",
      label: "Initial Mileage (km)",
      type: "number",
      section: "Status",
      description: "Record the mileage the moment this bike enters inventory.",
      placeholder: "0",
      min: 0,
      value: initialData?.mileage ?? 0,
    },
    {
      name: "cost_price",
      label: "Cost Price",
      type: "number",
      required: true,
      section: "Pricing",
      sectionDescription:
        "Set the core financial position before publishing the listing.",
      description: "Enter what this bike cost your business.",
      placeholder: "50000.00",
      min: 0,
      step: "0.01",
      value: initialData?.cost_price ?? 0,
    },
    {
      name: "sale_price",
      label: "Sale Price",
      type: "number",
      required: true,
      section: "Pricing",
      description: "Set the standard listed selling price.",
      placeholder: "75000.00",
      min: 0,
      step: "0.01",
      value: initialData?.sale_price ?? 0,
      helperTone: "featured",
    },
    {
      name: "currency_pricing",
      label: "Currency",
      type: "select",
      required: true,
      section: "Pricing",
      description: "Choose the pricing currency used in the listing.",
      options: [
        { value: "EGP", label: "EGP (Egyptian Pound)" },
        { value: "USD", label: "USD (US Dollar)" },
      ],
      value: initialData?.currency_pricing ?? "EGP",
    },
    {
      name: "max_discount_type",
      label: "Max Discount Type",
      type: "select",
      required: true,
      section: "Discount",
      sectionDescription:
        "Control the sales flexibility allowed on this listing.",
      description:
        "Choose whether the discount cap is fixed or percentage-based.",
      options: DISCOUNT_TYPES,
      value: initialData?.max_discount_type ?? "percentage",
    },
    {
      name: "max_discount_value",
      label: "Max Discount Value",
      type: "number",
      required: true,
      section: "Discount",
      description: "Set the highest discount the sales team can approve.",
      placeholder: "5",
      min: 0,
      step: "0.01",
      value: initialData?.max_discount_value ?? 0,
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Notes",
      sectionDescription:
        "Capture anything important for the sales floor or future follow-up.",
      description:
        "Add special features, condition notes, or internal remarks.",
      placeholder: "e.g., New bike, never used, special features...",
      rows: 3,
      value: initialData?.notes,
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
      title={mode === "create" ? "Create Bike Listing" : "Edit Bike Listing"}
      description={
        mode === "create"
          ? "Create a showroom-ready bike listing with blueprint, pricing, and status details grouped into an easier flow."
          : "Update the bike listing with pricing, mileage, and sale status in a cleaner layout."
      }
      fields={fields}
      isLoading={isSubmitting}
      error={error || undefined}
      onCancel={() => router.push("/inventory/bikes")}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Create Listing" : "Save Changes"}
      heroLabel="Bikes For Sale"
    />
  );
}
