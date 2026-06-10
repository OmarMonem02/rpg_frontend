"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { getAuthToken } from "@/lib/auth-session";
import {
  listMaintenanceServiceSectors,
  createMaintenanceServiceSector,
  createMaintenanceService,
  updateMaintenanceService,
  type MaintenanceServiceRecord,
  type CreateMaintenanceServicePayload,
  type MaintenanceServiceSectorRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import { CURRENCY_SELECT_OPTIONS, toPricingCurrency } from "@/lib/currencies";
import { EntityForm, type FieldConfig } from "@/components/entity-form";
import { PageShell } from "@/components/ops-ui";

interface ServiceFormProps {
  initialData?: MaintenanceServiceRecord | null;
  mode: "create" | "edit";
}

export function ServiceForm({ initialData, mode }: ServiceFormProps) {
  const router = useRouter();
  const permissions = usePermissions();
  const [sectors, setSectors] = useState<MaintenanceServiceSectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreateServices = permissions.canCreate("maintenance-services");

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const result = await fetchAllPages((p) => listMaintenanceServiceSectors(token, p));
        setSectors(result);
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
        currency_pricing: toPricingCurrency(String(formData.currency_pricing)),
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

  const formKey =
    mode === "edit" && initialData ? `edit-${initialData.id}` : "create";

  const fields: FieldConfig[] = useMemo(
    () => [
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
      options: () =>
        sectors.map((sector) => ({ value: sector.id, label: sector.name })),
      value: initialData?.maintenance_service_sector_id,
      quickCreate: {
        title: "Add Sector",
        description: "Create a maintenance sector without leaving this form.",
        submitLabel: "Create & Select",
        enabled: canCreateServices,
        fields: [
          {
            name: "name",
            label: "Sector Name",
            type: "text",
            required: true,
            section: "Basic Information",
            description: "e.g., Engine Maintenance, Electrical, Suspension",
            placeholder: "Enter sector name",
            helperTone: "featured",
          },
        ],
        onCreate: async (data) => {
          const token = getAuthToken();
          if (!token) throw new Error("Authentication required");
          const created = await createMaintenanceServiceSector(token, {
            name: String(data.name),
          });
          setSectors((prev) => [...prev, created]);
          return { id: created.id };
        },
      },
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
  ],
    [mode, initialData, sectors, canCreateServices],
  );

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
            ? `Edit ${initialData?.name ?? "Maintenance Service"}`
            : "Create Maintenance Service"
        }
        description={
          mode === "edit"
            ? "Update the service name, sector assignment, and pricing rules in one view."
            : "Create a maintenance service with pricing and discount settings in one view."
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
