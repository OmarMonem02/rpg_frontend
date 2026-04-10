"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listBikeBlueprints,
  listBrands,
  createBikeBlueprint,
  updateBikeBlueprint,
  deleteBikeBlueprint,
  type BikeBlueprintRecord,
  type CreateBikeBlueprintPayload,
  type BrandRecord,
} from "@/lib/crud-api";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";

export default function BikeBlueprintsPage() {
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState<BikeBlueprintRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const loadBlueprints = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listBikeBlueprints(token, page, searchFilter ? { search: searchFilter } : undefined);
      setBlueprints(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blueprints");
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      setBrandsLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listBrands(token, 1, "bikes");
      setBrands(result.items);
    } catch (err) {
      console.error(err);
    } finally {
      setBrandsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    loadBlueprints();
  }, [page, searchFilter]);

  const handleOpenModal = (blueprint?: BikeBlueprintRecord) => {
    setEditingBlueprint(blueprint || null);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBlueprint(null);
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateBikeBlueprintPayload = {
        brand_id: Number(formData.brand_id),
        model: String(formData.model),
        year: Number(formData.year),
      };

      if (editingBlueprint) {
        await updateBikeBlueprint(token, editingBlueprint.id, payload);
      } else {
        await createBikeBlueprint(token, payload);
      }

      await loadBlueprints();
      handleCloseModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save blueprint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this blueprint?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteBikeBlueprint(token, id);
      await loadBlueprints();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete blueprint");
    }
  };

  const getBrandName = (brandId: number): string => {
    return brands.find((b) => b.id === brandId)?.name || "Unknown";
  };

  const modalFields: FieldConfig[] = [
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      required: true,
      section: "Basic Information",
      description: "Select the motorcycle manufacturer",
      options: brands.map((b) => ({ value: b.id, label: b.name })),
      value: editingBlueprint?.brand_id,
      disabled: brandsLoading,
    },
    {
      name: "model",
      label: "Model",
      type: "text",
      required: true,
      section: "Basic Information",
      description: "e.g., CB500X, YZF-R7, MT-09",
      placeholder: "Enter model name",
      value: editingBlueprint?.model,
    },
    {
      name: "year",
      label: "Year",
      type: "number",
      required: true,
      section: "Basic Information",
      description: "Manufacturing year",
      placeholder: "2024",
      value: editingBlueprint?.year,
      min: 1900,
      max: new Date().getFullYear() + 1,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-on-surface">Bike Blueprints</h1>
        <button
          onClick={() => handleOpenModal()}
          className="rounded bg-primary px-4 py-2 text-on-primary hover:opacity-90"
        >
          + Add Blueprint
        </button>
      </div>

      {error && <div className="mb-4 rounded bg-error/20 p-4 text-error">{error}</div>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by model..."
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-on-surface"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : blueprints.length === 0 ? (
        <div className="rounded border border-outline-variant/15 bg-surface-container p-8 text-center text-on-surface-variant">
          No blueprints found. Create your first blueprint!
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-ghost-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Brand</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Model</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Year</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blueprints.map((blueprint) => (
                <tr key={blueprint.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface">{getBrandName(blueprint.brand_id)}</td>
                  <td className="px-4 py-3 text-on-surface">{blueprint.model}</td>
                  <td className="px-4 py-3 text-on-surface">{blueprint.year}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {blueprint.created_at ? new Date(blueprint.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenModal(blueprint)}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDelete(blueprint.id)}
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
        title={editingBlueprint ? "Edit Blueprint" : "Create Blueprint"}
        description={editingBlueprint ? "Update motorcycle blueprint details" : "Create a new motorcycle blueprint"}
        fields={modalFields}
        isOpen={isModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
