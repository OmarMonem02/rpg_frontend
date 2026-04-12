"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listBikes,
  listBikeBlueprints,
  createBike,
  updateBike,
  deleteBike,
  type BikeRecord,
  type CreateBikePayload,
  type BikeBlueprintRecord,
} from "@/lib/crud-api";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";

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

export default function BikesPage() {
  const [bikes, setBikes] = useState<BikeRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [blueprintsLoading, setBlueprintsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<BikeRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadBikes = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listBikes(token, page, {
        search: searchFilter || undefined,
        status: statusFilter || undefined,
      });
      setBikes(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bikes");
    } finally {
      setLoading(false);
    }
  };

  const loadBlueprints = async () => {
    try {
      setBlueprintsLoading(true);
      const token = getAuthToken();
      if (!token) return;
      const result = await listBikeBlueprints(token, 1);
      setBlueprints(result.items);
    } catch (err) {
      console.error("Failed to load bike blueprints:", err);
    } finally {
      setBlueprintsLoading(false);
    }
  };

  useEffect(() => {
    loadBlueprints();
  }, []);

  useEffect(() => {
    loadBikes();
  }, [page, searchFilter, statusFilter]);

  const handleOpenModal = (bike?: BikeRecord) => {
    setEditingBike(bike || null);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBike(null);
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
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

      if (editingBike) {
        await updateBike(token, editingBike.id, payload);
      } else {
        await createBike(token, payload);
      }

      await loadBikes();
      handleCloseModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save bike");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bike?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteBike(token, id);
      await loadBikes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bike");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, "success" | "default" | "warning" | "primary"> = {
      available: "success",
      sold: "default",
      maintenance: "warning",
      reserved: "primary",
    };
    return (
      <StatusBadge tone={statusConfig[status] || "success"}>
        {STATUSES.find((s) => s.value === status)?.label || status}
      </StatusBadge>
    );
  };

  const getBlueprintLabel = (id: number) => {
    const blueprint = blueprints.find((b) => b.id === id);
    return blueprint ? `${blueprint.model} ${blueprint.year}` : `Blueprint #${id}`;
  };

  const modalFields: FieldConfig[] = [
    {
      name: "bike_blueprint_id",
      label: "Bike Blueprint",
      type: "select",
      required: true,
      section: "Bike Identity",
      sectionDescription: "Define the listing identity first so the rest of the form stays grounded.",
      description: "Choose the model and production year for this bike.",
      options: blueprints.map((bp) => ({
        value: bp.id,
        label: `${bp.model} ${bp.year}`,
      })),
      disabled: blueprintsLoading,
      value: editingBike?.bike_blueprint_id,
      helperTone: "featured",
    },
    {
      name: "vin",
      label: "VIN (Vehicle Identification Number)",
      type: "text",
      required: true,
      section: "Bike Identity",
      description: "Add the vehicle identification number used for traceability.",
      placeholder: "e.g., VIN123456789",
      value: editingBike?.vin,
      summaryValue: ({ value }) => (value ? `VIN ${String(value)}` : undefined),
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      section: "Status",
      sectionDescription: "Set the live sale state and the opening condition of the bike.",
      description: "Choose where this bike currently sits in the sales lifecycle.",
      options: STATUSES,
      value: editingBike?.status ?? "available",
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
      value: editingBike?.mileage ?? 0,
    },
    {
      name: "cost_price",
      label: "Cost Price",
      type: "number",
      required: true,
      section: "Pricing",
      sectionDescription: "Set the core financial position before publishing the listing.",
      description: "Enter what this bike cost your business.",
      placeholder: "50000.00",
      min: 0,
      step: "0.01",
      value: editingBike?.cost_price ?? 0,
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}` : undefined,
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
      value: editingBike?.sale_price ?? 0,
      helperTone: "featured",
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}` : undefined,
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
      value: editingBike?.currency_pricing ?? "EGP",
    },
    {
      name: "max_discount_type",
      label: "Max Discount Type",
      type: "select",
      required: true,
      section: "Discount",
      sectionDescription: "Control the sales flexibility allowed on this listing.",
      description: "Choose whether the discount cap is fixed or percentage-based.",
      options: DISCOUNT_TYPES,
      value: editingBike?.max_discount_type ?? "percentage",
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
      value: editingBike?.max_discount_value ?? 0,
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Notes",
      sectionDescription: "Capture anything important for the sales floor or future follow-up.",
      description: "Add special features, condition notes, or internal remarks.",
      placeholder: "e.g., New bike, never used, special features...",
      rows: 3,
      value: editingBike?.notes,
    },
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow="Showroom Inventory"
        title="Bikes For Sale"
        description="Manage the live showroom catalog with blueprint identity, mileage, pricing, and sale status in one operational view."
        actions={
          <ActionButton tone="primary" onClick={() => handleOpenModal()}>
            Add Bike
          </ActionButton>
        }
      />

      {error && <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <SurfaceCard>
        <FilterBar>
          <InputGroup label="Search" className="md:col-span-7">
            <input
              type="text"
              placeholder="Search by model or VIN..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setPage(1);
              }}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Status" className="md:col-span-5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="form-input-base"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </InputGroup>
        </FilterBar>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : bikes.length === 0 ? (
        <EmptyState
          title="No bikes found"
          description="Create your first showroom bike entry to start tracking listings, pricing, and status."
          action={
            <ActionButton tone="primary" onClick={() => handleOpenModal()}>
              Create Bike
            </ActionButton>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Blueprint</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">VIN</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Sale Price</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Cost Price</th>
                <th className="px-4 py-3 text-center font-semibold text-on-surface">Mileage (km)</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Discount</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bikes.map((bike) => (
                <tr key={bike.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface font-medium">{getBlueprintLabel(bike.bike_blueprint_id)}</td>
                  <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">{bike.vin}</td>
                  <td className="px-4 py-3 text-right text-on-surface font-semibold">
                    {bike.sale_price} {bike.currency_pricing}
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{bike.cost_price} {bike.currency_pricing}</td>
                  <td className="px-4 py-3 text-center text-on-surface">{bike.mileage.toLocaleString()}</td>
                  <td className="px-4 py-3">{getStatusBadge(bike.status)}</td>
                  <td className="px-4 py-3 text-on-surface text-xs">
                    {bike.max_discount_value}{bike.max_discount_type === "percentage" ? "%" : " " + bike.currency_pricing}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenModal(bike)}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDelete(bike.id)}
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
      </SurfaceCard>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      <EntityFormModal
        title={editingBike ? "Edit Bike For Sale" : "Create Bike For Sale"}
        description={
          editingBike
            ? "Update the bike listing with pricing, mileage, and sale status in a cleaner layout."
            : "Create a showroom-ready bike listing with blueprint, pricing, and status details grouped into an easier flow."
        }
        fields={modalFields}
        isOpen={isModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        submitLabel={editingBike ? "Save Bike" : "Create Bike"}
        heroLabel="Bikes For Sale"
      />
    </PageShell>
  );
}
