"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import {
  listMaintenanceServiceSectors,
  createMaintenanceService,
  updateMaintenanceService,
  type MaintenanceServiceRecord,
  type CreateMaintenanceServicePayload,
  type MaintenanceServiceSectorRecord,
} from "@/lib/crud-api";
import { EntityForm, type FieldConfig } from "@/components/entity-form";
import { PageShell } from "@/components/ops-ui";

interface ServiceFormProps {
  initialData?: MaintenanceServiceRecord | null;
  mode: "create" | "edit";
}

export function ServiceForm({ initialData, mode }: ServiceFormProps) {
  const router = useRouter();
  const [sectors, setSectors] = useState<MaintenanceServiceSectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const result = await listMaintenanceServiceSectors(token, 1);
        setSectors(result.items);
      } catch (err) {
        console.error("Failed to load maintenance service sectors:", err);
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

      const payload: CreateMaintenanceServicePayload = {
        name: String(formData.name),
        currency_pricing: String(formData.currency_pricing) as "EGP" | "USD",
        service_price: Number(formData.service_price),
        max_discount_type: String(formData.max_discount_type) as "fixed" | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        maintenance_service_sector_id: Number(formData.maintenance_service_sector_id),
      };

      if (mode === "edit" && initialData) {
        await updateMaintenanceService(token, initialData.id, payload);
      } else {
        await createMaintenanceService(token, payload);
      }

      router.push("/inventory/maintenance-services");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save maintenance service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: FieldConfig[] = [
    {
      name: "name",
      label: "Service Name",
      type: "text",
      required: true,
      section: "Basic Info",
      sectionDescription: "Set up the maintenance service identity your team will manage and sell.",
      description: "Use the service name customers and staff will recognize immediately.",
      placeholder: "Enter service name",
      value: initialData?.name,
      helperTone: "featured",
    },
    {
      name: "maintenance_service_sector_id",
      label: "Sector",
      type: "select",
      required: true,
      section: "Basic Info",
      description: "Choose the sector tab this service should appear under.",
      options: sectors.map((sector) => ({ value: sector.id, label: sector.name })),
      value: initialData?.maintenance_service_sector_id,
    },
    {
      name: "service_price",
      label: "Service Price",
      type: "number",
      required: true,
      section: "Pricing",
      sectionDescription: "Control the default service value and discount rules used by the operations team.",
      description: "Set the standard service price before any discount is applied.",
      placeholder: "0.00",
      value: initialData?.service_price ?? 0,
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
      description: "Choose the currency shown anywhere this service price is displayed.",
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
      section: "Discount",
      sectionDescription: "Limit how much discount can be applied to this service during sale or approval.",
      description: "Choose whether the maximum discount is fixed or percentage-based.",
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
      required: true,
      section: "Discount",
      description: "Set the highest discount value allowed for this service.",
      placeholder: "0",
      value: initialData?.max_discount_value ?? 0,
      min: 0,
      step: "0.01",
    },
  ];

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
        title={mode === "edit" ? "Edit Maintenance Service" : "Create Maintenance Service"}
        description={
          mode === "edit"
            ? "Update the service name, sector assignment, and pricing rules from one guided flow."
            : "Create a maintenance service with clean pricing and discount settings that match the existing inventory experience."
        }
        fields={fields}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/inventory/maintenance-services")}
        isLoading={isSubmitting}
        error={error ?? undefined}
        submitLabel={mode === "edit" ? "Save Service" : "Create Service"}
        heroLabel="Service Operations"
        variant="page"
      />
    </div>
  );
}
