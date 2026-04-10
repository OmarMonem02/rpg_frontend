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
    const statusConfig: Record<string, { bg: string; text: string }> = {
      available: { bg: "bg-green-500/20", text: "text-green-700" },
      sold: { bg: "bg-gray-500/20", text: "text-gray-700" },
      maintenance: { bg: "bg-yellow-500/20", text: "text-yellow-700" },
      reserved: { bg: "bg-blue-500/20", text: "text-blue-700" },
    };
    const config = statusConfig[status] || statusConfig.available;
    return (
      <span className={`inline-block rounded ${config.bg} px-2 py-1 text-xs ${config.text}`}>
        {STATUSES.find((s) => s.value === status)?.label || status}
      </span>
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
      section: "Basic Information",
      description: "Select the motorcycle model and year",
      options: blueprints.map((bp) => ({
        value: bp.id,
        label: `${bp.model} ${bp.year}`,
      })),
      disabled: blueprintsLoading,
    },
    {
      name: "vin",
      label: "VIN (Vehicle Identification Number)",
      type: "text",
      required: true,
      section: "Basic Information",
      description: "Unique identifier for this motorcycle",
      placeholder: "e.g., VIN123456789",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      section: "Status",
      description: "Current status of this bike",
      options: STATUSES,
    },
    {
      name: "mileage",
      label: "Initial Mileage (km)",
      type: "number",
      section: "Status",
      description: "Odometer reading at entry",
      placeholder: "0",
      min: 0,
    },
    {
      name: "cost_price",
      label: "Cost Price",
      type: "number",
      required: true,
      section: "Pricing",
      description: "Acquisition cost for this bike",
      placeholder: "50000.00",
      min: 0,
      step: "0.01",
    },
    {
      name: "sale_price",
      label: "Sale Price",
      type: "number",
      required: true,
      section: "Pricing",
      description: "Selling price for this bike",
      placeholder: "75000.00",
      min: 0,
      step: "0.01",
    },
    {
      name: "currency_pricing",
      label: "Currency",
      type: "select",
      required: true,
      section: "Pricing",
      description: "Currency for pricing",
      options: [
        { value: "EGP", label: "EGP (Egyptian Pound)" },
        { value: "USD", label: "USD (US Dollar)" },
        { value: "EUR", label: "EUR (Euro)" },
      ],
    },
    {
      name: "max_discount_type",
      label: "Max Discount Type",
      type: "select",
      required: true,
      section: "Discount",
      description: "How discounts are applied",
      options: DISCOUNT_TYPES,
    },
    {
      name: "max_discount_value",
      label: "Max Discount Value",
      type: "number",
      required: true,
      section: "Discount",
      description: "Maximum discount allowed",
      placeholder: "5",
      min: 0,
      step: "0.01",
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Additional",
      description: "Additional information or special notes",
      placeholder: "e.g., New bike, never used, special features...",
      rows: 3,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-on-surface">Bikes For Sale</h1>
        <button
          onClick={() => handleOpenModal()}
          className="rounded bg-primary px-4 py-2 text-on-primary hover:opacity-90"
        >
          + Add Bike
        </button>
      </div>

      {error && <div className="mb-4 rounded bg-error/20 p-4 text-error">{error}</div>}

      <div className="mb-4 grid gap-2 grid-cols-1 md:grid-cols-2">
        <input
          type="text"
          placeholder="Search by model or VIN..."
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-on-surface"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-on-surface"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : bikes.length === 0 ? (
        <div className="rounded border border-outline-variant/15 bg-surface-container p-8 text-center text-on-surface-variant">
          No bikes found. Add your first bike!
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-ghost-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container">
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

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-on-surface-variant">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <EntityFormModal
        title={editingBike ? "Edit Bike For Sale" : "Create Bike For Sale"}
        description={editingBike ? "Update bike details, pricing, and status" : "Add a new motorcycle to your inventory"}
        fields={modalFields.map((field) => ({
          ...field,
          value: editingBike ? (editingBike as Record<string, unknown>)[field.name] : undefined,
        }))}
        isOpen={isModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
