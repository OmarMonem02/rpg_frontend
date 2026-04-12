"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SurfaceCard,
} from "@/components/ops-ui";

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

  const loadBlueprints = useCallback(async () => {
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
  }, [page, searchFilter]);

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
  }, [loadBlueprints]);

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
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Bike Blueprints"
        description="Define models and years, then jump directly into linked spare-parts management for each blueprint."
        actions={
          <ActionButton tone="primary" onClick={() => handleOpenModal()}>
            Add Blueprint
          </ActionButton>
        }
      />

      {error && <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <SurfaceCard>
        <FilterBar className="md:grid-cols-12">
          <InputGroup label="Search by model" className="md:col-span-12">
            <input
              type="text"
              placeholder="Search by model..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setPage(1);
              }}
              className="form-input-base"
            />
          </InputGroup>
        </FilterBar>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : blueprints.length === 0 ? (
        <EmptyState
          title="No blueprints found"
          description="Create the first bike blueprint so parts and bikes can be grouped around a proper model definition."
          action={
            <ActionButton tone="primary" onClick={() => handleOpenModal()}>
              Create Blueprint
            </ActionButton>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
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
                    <Link
                      href={`/data/bike-blueprints/${blueprint.id}/spare-parts`}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Manage Parts
                    </Link>
                    <span className="mx-2 text-on-surface-variant">•</span>
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
      </SurfaceCard>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

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
    </PageShell>
  );
}
